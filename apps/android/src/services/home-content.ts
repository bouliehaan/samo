import {
    getMobileHomeContentErrorMessage,
    loadMobileDiscoveryForServers,
    loadMobilePodcastFeedForServers,
    loadMobileHomeContentForServers,
    type MobileHomeContent,
    MobileHomeSectionId,
    type MobileHomeItem,
} from '@samo/core/mobile';
import {
    ensureSamoStreamToken,
    ServerType,
    type ServerAuthenticationResult,
} from '@samo/core/server';

import { getContentItemKey } from '../utils/content-item';

// Home is a launch surface, not the exhaustive library browser. View All does
// the full fetch when requested; keeping this slice lean avoids a wide album
// detail fan-out before the first scroll can feel responsive.
const ANDROID_HOME_CONTENT_LIMIT = 36;
const ANDROID_HOME_QUALITY_SCAN_LIMIT = ANDROID_HOME_CONTENT_LIMIT;

export type AndroidHomeContentState =
    | { content: MobileHomeContent; status: 'loaded' }
    | { message: string; status: 'error' }
    | { status: 'idle' }
    | { status: 'loading' };

const deepEqual = (a: unknown, b: unknown): boolean => {
    if (Object.is(a, b)) {
        return true;
    }
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
        return false;
    }
    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
            return false;
        }
        for (let index = 0; index < a.length; index += 1) {
            if (!deepEqual(a[index], b[index])) {
                return false;
            }
        }
        return true;
    }
    const aKeys = Object.keys(a as Record<string, unknown>);
    const bKeys = Object.keys(b as Record<string, unknown>);
    if (aKeys.length !== bKeys.length) {
        return false;
    }
    for (const key of aKeys) {
        if (!Object.prototype.hasOwnProperty.call(b, key)) {
            return false;
        }
        if (
            !deepEqual(
                (a as Record<string, unknown>)[key],
                (b as Record<string, unknown>)[key],
            )
        ) {
            return false;
        }
    }
    return true;
};

/**
 * Re-emit `next` home content but REUSE the previous object references for every
 * item, section, and (when nothing changed) the whole content payload that is
 * value-equal to its previous counterpart.
 *
 * Home refreshes constantly — a catalog seed is replaced by the network load,
 * and the live Discover/Podcast-feed refresh patches in fresh sections every
 * minute. Each of those produces brand-new item objects, which made every tile
 * re-render and its artwork repaint: a visible full-page flash. Preserving
 * identity for unchanged items lets `HomeMediaTile` (memoized by `item`) and the
 * `getHomeDisplaySections` memo short-circuit, so only genuinely-changed tiles
 * update and the rest of the page never flickers. (`loadedAt` is intentionally
 * ignored — a new timestamp alone must not count as a change.)
 */
export const reconcileHomeContent = (
    previous: MobileHomeContent | null | undefined,
    next: MobileHomeContent,
): MobileHomeContent => {
    if (!previous) {
        return next;
    }

    const previousItemsByKey = new Map<string, MobileHomeItem>();
    for (const section of previous.sections) {
        for (const item of section.items) {
            previousItemsByKey.set(getContentItemKey(item), item);
        }
    }
    const previousSectionsById = new Map(
        previous.sections.map((section) => [section.id, section]),
    );

    const sections = next.sections.map((section) => {
        const items = section.items.map((item) => {
            const previousItem = previousItemsByKey.get(getContentItemKey(item));
            return previousItem && deepEqual(previousItem, item) ? previousItem : item;
        });
        const previousSection = previousSectionsById.get(section.id);
        if (
            previousSection &&
            previousSection.title === section.title &&
            previousSection.items.length === items.length &&
            items.every((item, index) => item === previousSection.items[index])
        ) {
            return previousSection;
        }
        return { ...section, items };
    });

    const sectionsUnchanged =
        sections.length === previous.sections.length &&
        sections.every((section, index) => section === previous.sections[index]);
    if (
        sectionsUnchanged &&
        previous.serverTitle === next.serverTitle &&
        deepEqual(previous.errors, next.errors)
    ) {
        return previous;
    }

    return { ...next, sections };
};

export const patchHomeContentDiscovery = (
    content: MobileHomeContent,
    discoveryItems: MobileHomeItem[],
): MobileHomeContent => {
    const hasDiscoverSection = content.sections.some(
        (section) => section.id === MobileHomeSectionId.DISCOVER,
    );
    const sections = hasDiscoverSection
        ? content.sections.map((section) =>
              section.id === MobileHomeSectionId.DISCOVER
                  ? { ...section, items: discoveryItems }
                  : section,
          )
        : [
              ...content.sections,
              {
                  id: MobileHomeSectionId.DISCOVER,
                  items: discoveryItems,
                  title: 'Discover',
              },
          ];

    return {
        ...content,
        loadedAt: Date.now(),
        sections,
    };
};

export const patchHomeContentPodcastFeed = (
    content: MobileHomeContent,
    podcastFeedItems: MobileHomeItem[],
): MobileHomeContent => {
    const hasSection = content.sections.some(
        (section) => section.id === MobileHomeSectionId.PODCAST_FEED,
    );
    const sections = hasSection
        ? content.sections.map((section) =>
              section.id === MobileHomeSectionId.PODCAST_FEED
                  ? { ...section, items: podcastFeedItems }
                  : section,
          )
        : podcastFeedItems.length > 0
          ? [
                ...content.sections,
                {
                    id: MobileHomeSectionId.PODCAST_FEED,
                    items: podcastFeedItems,
                    title: 'Podcast Feed',
                },
            ]
          : content.sections;

    return {
        ...content,
        loadedAt: Date.now(),
        sections,
    };
};

export const refreshAndroidHomeLiveSections = async (
    authentications: ServerAuthenticationResult[],
    content: MobileHomeContent,
): Promise<MobileHomeContent> => {
    const [discoveryItems, podcastFeedItems] = await Promise.all([
        loadMobileDiscoveryForServers({ authentications }),
        loadMobilePodcastFeedForServers({ authentications }),
    ]);

    return patchHomeContentPodcastFeed(
        patchHomeContentDiscovery(content, discoveryItems),
        podcastFeedItems,
    );
};

/** @deprecated Use {@link refreshAndroidHomeLiveSections}. */
export const refreshAndroidHomeDiscovery = refreshAndroidHomeLiveSections;

export const loadAndroidHomeContent = async (
    authentications: ServerAuthenticationResult[],
): Promise<AndroidHomeContentState> => {
    if (authentications.length === 0) {
        return { status: 'idle' };
    }

    try {
        await Promise.all(
            authentications
                .filter((authentication) => authentication.type === ServerType.SAMO)
                .map((authentication) =>
                    ensureSamoStreamToken(authentication).catch(() => undefined),
                ),
        );

        return {
            content: await loadMobileHomeContentForServers({
                authentications,
                limit: ANDROID_HOME_CONTENT_LIMIT,
                qualityScanLimit: ANDROID_HOME_QUALITY_SCAN_LIMIT,
            }),
            status: 'loaded',
        };
    } catch (error) {
        return {
            message: getMobileHomeContentErrorMessage(error),
            status: 'error',
        };
    }
};
