import {
    loadMobileDiscoveryForServers,
    loadMobilePodcastFeedForServers,
    loadMobileRadioForServers,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import { setHomeContentState } from '../state/app-navigation';
import { setRecentContentItems } from '../state/app-session';
import { getAuthSession } from '../state/auth-session';
import { isOfflineNow } from '../state/network-state';
import {
    collectFreshAlbumItems,
    reconcileRecentContentItemsIfChanged,
} from '../utils/recent-content-dedupe';
import { buildCatalogHomeContent, type HomeLiveSections } from './catalog/catalog-reads';
import { reconcileHomeContent } from './home-content';
import { traceAsync } from './jank-trace';
import { homeHeroAccountKey, loadHomeHeroRecommendation } from './home-hero-visit';
import { saveHomeLayoutHint } from './home-layout-hint';
import { buildHomeLoadKey, dedupeInFlight } from './in-flight-requests';
import { loadPersistedRecentContentItems, savePersistedRecentContentItems } from './recent-content';
import { describeReachFailure, refreshSamoRadioDevices } from './samo-radio';
import { samoRadioReachFor, setSamoRadioReach } from '../state/samo-radio';
import { mergeServerRecentlyPlayedIntoRecents } from './recent-content-sync';

// Server-curated Home sections (Discover / Podcast Feed / Explo / Radio) are
// the ONLY network-fetched Home data; every library section derives from the
// on-device mirror. The last live fetch is kept so mirror re-derives (sync
// completion, app foreground) don't drop those sections.
let lastHomeLiveSections: HomeLiveSections | null = null;

// Increments per load so a stale response can't clobber a newer one.
let homeLoadRequestId = 0;
let liveAccountKey: string | null = null;

// Both the first mirror paint and the later session validation load belong to
// the same account. Register it before either read so validation cannot blank
// an already usable Home and force all its covers to mount a second time.
const selectHomeAccount = (authentication: ServerAuthenticationResult | null): void => {
    const accountKey = authentication ? homeHeroAccountKey(authentication) : null;
    if (accountKey === liveAccountKey) return;
    homeLoadRequestId += 1;
    lastHomeLiveSections = null;
    liveAccountKey = accountKey;
    setHomeContentState({ status: authentication ? 'loading' : 'idle' });
};

/** Re-derive Home from the mirror + last-known live sections. The shelf reads
 *  run on the native reader's background thread (off the JS thread), so this
 *  is cheap to run on connect, after every sync, and whenever connections
 *  change. */
export const refreshHomeFromMirror = async (options?: {
    authoritative?: boolean;
}): Promise<void> => {
    const serverConnection = getAuthSession().serverConnection;
    if (!serverConnection) {
        return;
    }
    selectHomeAccount(serverConnection);
    const requestId = homeLoadRequestId;
    const content = await traceAsync('home.deriveFromMirror', () =>
        buildCatalogHomeContent(serverConnection, lastHomeLiveSections),
    );
    if (!content || requestId !== homeLoadRequestId) {
        return;
    }
    // Only the post-sync refresh is authoritative enough to PRUNE a deleted
    // shelf; every other derive stays additive so a transient thin mirror
    // read can't blank the page (the cold-boot deload→reload).
    setHomeContentState((current) => ({
        content:
            current.status === 'loaded'
                ? reconcileHomeContent(current.content, content, {
                      prune: options?.authoritative ?? false,
                  })
                : content,
        status: 'loaded',
    }));
};

/**
 * Load the Radio shelf and fold it into Home.
 *
 * Split out from the other live sections, and separately retryable, because
 * radio is the only Home section with no mirror behind it: when it fails there
 * is nothing to fall back on and the tab is simply empty. So the outcome is
 * recorded (`setSamoRadioReach`) for the Radio tab to explain itself with, and
 * the same call is exposed for a retry — the network underneath a phone
 * changes constantly (a VPN comes up, Wi-Fi drops to cellular), and asking
 * again should not require reconnecting the whole server.
 *
 * An EMPTY result is left to stand as the last-known list, exactly as before:
 * a server that momentarily lists no stations should not blank a shelf that
 * was populated a second ago.
 */
export const loadHomeRadioSection = async (
    authentication: ServerAuthenticationResult,
    requestId: number = homeLoadRequestId,
): Promise<void> => {
    await dedupeInFlight(buildHomeLoadKey([authentication]) + '-radio', async () => {
        const radio = await loadMobileRadioForServers({ authentication });
        if (requestId !== homeLoadRequestId) {
            return;
        }
        // Reachability is recorded even when the shelf keeps its old contents,
        // because it answers a question the contents cannot: whether what is
        // on screen is current or a leftover from the last time this phone
        // could see the server.
        setSamoRadioReach(
            radio.error
                ? samoRadioReachFor(false, describeReachFailure(radio.error))
                : samoRadioReachFor(true),
        );
        if (radio.items.length === 0) {
            return;
        }
        lastHomeLiveSections = {
            ...(lastHomeLiveSections ?? {
                discover: [],
                heroes: [],
                podcastFeed: [],
                radio: [],
            }),
            radio: radio.items,
        };
        const assembled = await buildCatalogHomeContent(authentication, lastHomeLiveSections);
        if (assembled && requestId === homeLoadRequestId) {
            setHomeContentState((current) => ({
                content:
                    current.status === 'loaded'
                        ? reconcileHomeContent(current.content, assembled)
                        : assembled,
                status: 'loaded',
            }));
        }
    });
};

/** Refresh recommendations without reloading the library or showing a spinner. */
export const refreshHomeHeroes = async (): Promise<void> => {
    const authentication = getAuthSession().serverConnection;
    if (!authentication || isOfflineNow()) return;
    const requestId = homeLoadRequestId;
    await dedupeInFlight(buildHomeLoadKey([authentication]) + '-heroes', async () => {
        try {
            const heroes = await loadHomeHeroRecommendation(authentication);
            if (
                requestId !== homeLoadRequestId ||
                getAuthSession().serverConnection !== authentication
            )
                return;
            lastHomeLiveSections = {
                discover: [],
                podcastFeed: [],
                radio: [],
                ...lastHomeLiveSections,
                heroes,
                heroesLoaded: true,
            };
            await refreshHomeFromMirror();
        } catch {
            // An announcement needs live evidence; stale cards should not linger offline.
            if (
                requestId === homeLoadRequestId &&
                getAuthSession().serverConnection === authentication
            ) {
                lastHomeLiveSections = {
                    discover: [],
                    podcastFeed: [],
                    radio: [],
                    ...lastHomeLiveSections,
                    heroes: [],
                    heroesLoaded: true,
                };
                await refreshHomeFromMirror();
            }
        }
    });
};

export const loadHomeForConnection = async (
    authentication: null | ServerAuthenticationResult,
): Promise<void> => {
    selectHomeAccount(authentication);
    const requestId = (homeLoadRequestId += 1);

    // Whether this server has a samo-radio, answered once per connection
    // change. It rides along here because this is the one call every
    // connect/restore/disconnect path already makes, and because the answer is
    // needed before anything asks for it: the long-press menu offers "Send to
    // samo-radio" from the store, and a menu that grew the row a beat after
    // opening — or only after the user had visited the Radio tab — would be
    // worse than either always or never having it. One tiny GET, and a
    // disconnect (null) clears it.
    void refreshSamoRadioDevices();

    if (!authentication) {
        setHomeContentState({ status: 'idle' });
        return;
    }

    // Mirror paint FIRST — instant and authoritative for the library
    // sections. A cold mirror (fresh install mid-first-sync) shows the
    // loading state until the sync-completed event re-derives.
    const mirrorContent = await buildCatalogHomeContent(authentication, lastHomeLiveSections);
    if (requestId !== homeLoadRequestId) return;
    setHomeContentState((current) => {
        if (mirrorContent) {
            return {
                content:
                    current.status === 'loaded'
                        ? reconcileHomeContent(current.content, mirrorContent)
                        : mirrorContent,
                status: 'loaded',
            };
        }
        return current.status === 'loaded' ? current : { status: 'loading' };
    });

    // Offline stops here, with Home fully painted from the mirror above. The
    // live shelves are the ONLY network-fed part of this page, and attempting
    // them offline bought nothing but four requests timing out — which is
    // exactly the "the app hangs when I lose signal" symptom, since the radio
    // shelf's dedupe key kept the failure in flight behind every retry.
    if (isOfflineNow()) {
        return;
    }

    // Live sections — the one network trip on the Home path. Failures
    // degrade to the last-known live sections (or none) instead of
    // touching the library sections at all.
    const live = await dedupeInFlight(
        buildHomeLoadKey(authentication ? [authentication] : []),
        async (): Promise<HomeLiveSections> => {
            const [discover, podcastFeed, heroes] = await Promise.all([
                loadMobileDiscoveryForServers({
                    authentication: authentication ?? null,
                }).catch(() => []),
                loadMobilePodcastFeedForServers({
                    authentication: authentication ?? null,
                }).catch(() => []),
                loadHomeHeroRecommendation(authentication).catch(() => []),
            ]);
            return {
                discover,
                heroes,
                heroesLoaded: true,
                podcastFeed,
                radio: lastHomeLiveSections?.radio ?? [],
            };
        },
    );

    void loadHomeRadioSection(authentication, requestId);
    if (requestId !== homeLoadRequestId) {
        return;
    }
    // Record which live shelves had content so the NEXT cold boot can
    // reserve their slots before the fetch returns (a genuinely-empty
    // shelf writes 0, which clears any stale reservation). One
    // fire-and-forget call — no new state, no effect.
    saveHomeLayoutHint({
        podcastFeed: live.podcastFeed.length,
        rediscover: live.discover.length,
    });
    lastHomeLiveSections = live;
    const assembled = await buildCatalogHomeContent(authentication, lastHomeLiveSections);
    if (!assembled || requestId !== homeLoadRequestId) {
        return;
    }
    setHomeContentState((current) => ({
        content:
            current.status === 'loaded'
                ? reconcileHomeContent(current.content, assembled)
                : assembled,
        status: 'loaded',
    }));

    const mergedRecents = await mergeServerRecentlyPlayedIntoRecents(
        await loadPersistedRecentContentItems(),
        authentication,
        assembled,
    );
    if (requestId !== homeLoadRequestId) {
        return;
    }
    setRecentContentItems((current) => {
        const next = reconcileRecentContentItemsIfChanged(
            mergedRecents,
            collectFreshAlbumItems(assembled.sections),
        );
        if (next !== current) {
            void savePersistedRecentContentItems(next);
        }
        return next;
    });
};
