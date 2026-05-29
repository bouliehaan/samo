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
