import {
    loadMobileDiscoveryForServers,
    loadMobileExploForServers,
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
import { saveHomeLayoutHint } from './home-layout-hint';
import { buildHomeLoadKey, dedupeInFlight } from './in-flight-requests';
import {
    loadPersistedRecentContentItems,
    savePersistedRecentContentItems,
} from './recent-content';
import { refreshSamoRadioDevices } from './samo-radio';
import { mergeServerRecentlyPlayedIntoRecents } from './recent-content-sync';

// Server-curated Home sections (Discover / Podcast Feed / Explo / Radio) are
// the ONLY network-fetched Home data; every library section derives from the
// on-device mirror. The last live fetch is kept so mirror re-derives (sync
// completion, app foreground) don't drop those sections.
let lastHomeLiveSections: HomeLiveSections | null = null;

// Increments per load so a stale response can't clobber a newer one.
let homeLoadRequestId = 0;

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
    const content = await traceAsync('home.deriveFromMirror', () =>
        buildCatalogHomeContent(serverConnection, lastHomeLiveSections),
    );
    if (!content) {
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

export const loadHomeForConnection = async (
    authentication: null | ServerAuthenticationResult,
): Promise<void> => {
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
            const [discover, podcastFeed, explo] = await Promise.all([
                loadMobileDiscoveryForServers({
                    authentication: authentication ?? null,
                }).catch(() => []),
                loadMobilePodcastFeedForServers({
                    authentication: authentication ?? null,
                }).catch(() => []),
                loadMobileExploForServers({
                    authentication: authentication ?? null,
                }).catch(() => []),
            ]);
            return {
                discover,
                explo,
                podcastFeed,
                radio: lastHomeLiveSections?.radio ?? [],
            };
        },
    );

    void dedupeInFlight(
        buildHomeLoadKey(authentication ? [authentication] : []) + '-radio',
        async () => {
            const radio = await loadMobileRadioForServers({
                authentication: authentication ?? null,
            }).catch(() => []);
            if (requestId !== homeLoadRequestId || radio.length === 0) {
                return;
            }
            lastHomeLiveSections = {
                ...(lastHomeLiveSections ?? {
                    discover: [],
                    explo: [],
                    podcastFeed: [],
                    radio: [],
                }),
                radio,
            };
            const assembled = await buildCatalogHomeContent(
                authentication,
                lastHomeLiveSections,
            );
            if (assembled) {
                setHomeContentState((current) => ({
                    content:
                        current.status === 'loaded'
                            ? reconcileHomeContent(current.content, assembled)
                            : assembled,
                    status: 'loaded',
                }));
            }
        },
    );
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
    if (
        live.discover.length > 0 ||
        live.podcastFeed.length > 0 ||
        live.explo.length > 0 ||
        live.radio.length > 0
    ) {
        lastHomeLiveSections = live;
    }
    const assembled = await buildCatalogHomeContent(authentication, lastHomeLiveSections);
    if (!assembled) {
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
