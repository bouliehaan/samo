import {
    type MobileContentSource,
    type MobileHomeItem,
    MobileHomeItemType,
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobileMediaTrack,
    type MobileSearchItem,
    MobileSearchItemType,
} from '@samo/core/mobile';
import { startTransition } from 'react';

import { triggerImpact } from '../services/haptics';
import { buildMediaDetailLoadKey, dedupeInFlight } from '../services/in-flight-requests';
import {
    clearMediaDetailStaleness,
    isMediaDetailStale,
    loadMirrorMediaDetailIfFresh,
    markMediaDetailStale,
} from '../services/media-detail-freshness';
import {
    loadAndroidFullCollectionLocal,
    loadAndroidFullCollectionLocalFirstPage,
} from '../services/full-collection';
import {
    loadAndroidMediaDetail,
    toDetailType,
} from '../services/media-detail';
import {
    type AndroidRecentContentSourceItem,
    getRecentContentItemKey,
} from '../services/recent-content';
import {
    closeMediaDetail,
    getAppNavigation,
    openMediaDetail,
    setActiveUtilityScreen,
    setIsFullPlayerOpen,
    setIsSearchOverlayOpen,
    setMediaDetailState,
    setSearchOverlayQuery,
    setViewAllFullState,
    setViewAllRoute,
} from '../state/app-navigation';
import { getAuthSession } from '../state/auth-session';
import { isOfflineNow } from '../state/network-state';
import { setContextMenuTarget } from '../state/media-overlays';
import { getPlaybackBridge } from '../state/playback-bridge';
import { getAndroidPlaybackState } from '../state/playback-store';
import { type HomeDisplaySection } from '../types/home';
import { getViewAllVariant } from '../utils/home-display';
import { rememberMediaDetail } from '../utils/media-detail-cache';
import { buildDownloadedMusicDetail } from '../utils/offline-music-detail';
import {
    prefetchArtworkUrl,
    prefetchDetailArtworkUrls,
} from '../utils/prefetch-detail-artwork';
import {
    audiobookStartRequestId,
    mediaDetailCache,
    mediaDetailRequestId,
    viewAllFetchToken,
} from './handler-state';
import { handleStartAudiobook } from './playback-handlers';
import { enrichRecentAlbumFromDetail, recordRecentContentItem } from './recents';
import { handleSearch } from './search-handlers';

export const prefetchMediaDetailCache = (item: AndroidRecentContentSourceItem): void => {
    const serverConnection = getAuthSession().serverConnection;
    prefetchArtworkUrl(
        {
            artworkImageId: item.artworkImageId,
            artworkUrl: item.artworkUrl,
            source: item.source,
        },
        serverConnection,
    );
    if (item.playback || item.type === MobileHomeItemType.AUDIOBOOK) {
        // Playable items (radio / podcast episode / audiobook) open the
        // player, not a detail page — there's no detail to pre-cache. The
        // artwork warm above still runs so the optimistic mini-player never
        // flashes blank during the start-up buffer.
        return;
    }
    const cacheKey = getRecentContentItemKey(item);
    const memoryCached = mediaDetailCache.get(cacheKey);
    if (memoryCached) {
        prefetchDetailArtworkUrls(memoryCached, serverConnection, [
            {
                artworkImageId: item.artworkImageId,
                artworkUrl: item.artworkUrl,
                source: item.source,
            },
        ]);
        return;
    }
    void loadMirrorMediaDetailIfFresh(item, serverConnection, cacheKey).then((fromMirror) => {
        if (!fromMirror) {
            return;
        }
        rememberMediaDetail(mediaDetailCache, cacheKey, fromMirror);
        prefetchDetailArtworkUrls(fromMirror, serverConnection, [
            {
                artworkImageId: item.artworkImageId,
                artworkUrl: item.artworkUrl,
                source: item.source,
            },
        ]);
    });
};

const beginOpenMediaDetail = (item: AndroidRecentContentSourceItem): void => {
    const serverConnection = getAuthSession().serverConnection;
    const cacheKey = getRecentContentItemKey(item);
    prefetchArtworkUrl(
        {
            artworkImageId: item.artworkImageId,
            artworkUrl: item.artworkUrl,
            source: item.source,
        },
        serverConnection,
    );
    // First-frame detail from the in-memory cache — instant, and the only
    // synchronous source now that mirror reads run off the JS thread. A cached
    // detail (any recently-viewed item) opens fully loaded with no flash; a
    // miss opens the loading surface and loadDetailWithCache fills it a bridge
    // hop later from the mirror (Layer 1.5 there). The old synchronous mirror
    // read for album/artist that lived here WAS the tap-frame block this whole
    // change removes — a cold album now opens on a loading surface for one
    // frame instead of freezing the tap.
    const cachedDetail = mediaDetailCache.get(cacheKey);
    if (cachedDetail) {
        prefetchDetailArtworkUrls(cachedDetail, serverConnection, [
            {
                artworkImageId: item.artworkImageId,
                artworkUrl: item.artworkUrl,
                source: item.source,
            },
        ]);
        openMediaDetail(cacheKey, { detail: cachedDetail, status: 'loaded' });
    } else {
        openMediaDetail(cacheKey, {
            itemArtworkImageId: item.artworkImageId,
            itemArtworkUrl: item.artworkUrl,
            itemSource: item.source,
            itemTitle: item.title,
            itemType: item.type,
            status: 'loading',
        });
    }
};

/**
 * Re-read a detail from the server and replace the provisional local copy.
 *
 * Runs behind a paint, not in front of one: the caller has already rendered
 * whatever it had, so this is the confirmation, not the load. A failure is
 * therefore silent and leaves the staleness flag set — the copy on screen is
 * the user's own optimistic edit, which is a better thing to be looking at
 * than an error page, and the next open tries again.
 *
 * The cache write is unconditional while the on-screen write is guarded: the
 * user may have navigated on, but the answer is still the truth and the next
 * open should get it for free.
 */
const revalidateStaleMediaDetail = async (
    item: AndroidRecentContentSourceItem,
    cacheKey: string,
    isCurrentRequest: () => boolean,
): Promise<void> => {
    if (isOfflineNow()) {
        return;
    }
    const serverConnection = getAuthSession().serverConnection;
    const next = await dedupeInFlight(buildMediaDetailLoadKey(cacheKey), () =>
        loadAndroidMediaDetail(serverConnection, item),
    );
    if (next.status !== 'loaded') {
        return;
    }
    clearMediaDetailStaleness(cacheKey);
    rememberMediaDetail(mediaDetailCache, cacheKey, next.detail);
    if (!isCurrentRequest()) {
        return;
    }
    const mediaDetailState = getAppNavigation().mediaDetailState;
    if (
        mediaDetailState.status === 'loaded' &&
        mediaDetailState.detail.id === next.detail.id
    ) {
        startTransition(() => {
            setMediaDetailState(next);
        });
    }
};

export const loadDetailWithCache = async (
    item: AndroidRecentContentSourceItem,
): Promise<{ cached: boolean }> => {
    audiobookStartRequestId.current += 1;
    const requestId = (mediaDetailRequestId.current += 1);
    const isCurrentRequest = () => mediaDetailRequestId.current === requestId;
    const serverConnection = getAuthSession().serverConnection;
    const cacheKey = getRecentContentItemKey(item);
    const stale = isMediaDetailStale(cacheKey);

    // Layer 1: in-memory cache — instant.
    let cached = mediaDetailCache.get(cacheKey);

    // Layer 1.5: local SQLite catalog — instant, authoritative for samo, and
    // works offline. The entire library is mirrored on-device, so this makes
    // *every* samo detail open instant, not just recently-viewed ones.
    //
    // Refused while this item is stale: the mirror is only as current as the
    // last sync, so for an item edited since then it holds exactly the
    // pre-edit list. Falling through to the network is the point.
    if (!cached) {
        const fromCatalog = await loadMirrorMediaDetailIfFresh(
            item,
            serverConnection,
            cacheKey,
        );
        if (!isCurrentRequest()) {
            return { cached: false };
        }
        if (fromCatalog) {
            cached = fromCatalog;
            rememberMediaDetail(mediaDetailCache, cacheKey, fromCatalog);
        }
    }

    // Layer 2: synthesise a detail from what is downloaded. Only worth trying
    // when there is no network to ask instead, and it is the last thing between
    // the user and an error page for a mirror that hasn't reached this item.
    if (!cached && isOfflineNow()) {
        const downloadedDetail = await buildDownloadedMusicDetail(item);
        if (!isCurrentRequest()) {
            return { cached: false };
        }
        if (downloadedDetail) {
            cached = downloadedDetail;
            rememberMediaDetail(mediaDetailCache, cacheKey, downloadedDetail);
        }
    }

    if (cached) {
        const loadedDetail = cached;
        prefetchDetailArtworkUrls(loadedDetail, serverConnection, [
            {
                artworkImageId: item.artworkImageId,
                artworkUrl: item.artworkUrl,
                source: item.source,
            },
        ]);
        startTransition(() => {
            enrichRecentAlbumFromDetail(item, loadedDetail);
            const mediaDetailState = getAppNavigation().mediaDetailState;
            const alreadyShowingLoaded =
                mediaDetailState.status === 'loaded' &&
                mediaDetailState.detail.id === loadedDetail.id;
            if (!alreadyShowingLoaded) {
                setMediaDetailState({ detail: loadedDetail, status: 'loaded' });
            }
        });
        // Mirror (or memory) hit — DONE. The mirror is the source of truth
        // for samo details; freshness is the sync engine's job, not a
        // per-open network refresh. The old steady-state refetch here cost
        // a server round-trip on EVERY detail open just to re-confirm what
        // the mirror already knew.
        //
        // The ONE exception is an item with an unconfirmed edit outstanding.
        // What just rendered is the optimistic copy, so the page is already
        // right and this costs nothing visible — it exists so the copy stops
        // being a guess, and so the next open is served a confirmed one.
        if (stale) {
            void revalidateStaleMediaDetail(item, cacheKey, isCurrentRequest);
        }
        return { cached: true };
    }

    // Nothing local (fresh install mid-first-sync, or a non-mirrored
    // source): the network is the only option — and offline, there isn't one.
    // Say so immediately instead of opening a page that spins for 30 seconds
    // and then fails.
    if (isOfflineNow()) {
        setMediaDetailState({
            itemTitle: item.title,
            message: 'Not available offline.',
            status: 'error',
        });
        return { cached: false };
    }

    void (async () => {
        const next = await dedupeInFlight(buildMediaDetailLoadKey(cacheKey), () =>
            loadAndroidMediaDetail(serverConnection, item),
        );
        if (!isCurrentRequest()) {
            return;
        }
        if (next.status === 'loaded') {
            // Straight from the server, so whatever edit marked this item
            // stale is now accounted for.
            clearMediaDetailStaleness(cacheKey);
            rememberMediaDetail(mediaDetailCache, cacheKey, next.detail);
            prefetchDetailArtworkUrls(next.detail, serverConnection, [
                {
                    artworkImageId: item.artworkImageId,
                    artworkUrl: item.artworkUrl,
                    source: item.source,
                },
            ]);
            startTransition(() => {
                enrichRecentAlbumFromDetail(item, next.detail);
            });
        }
        setMediaDetailState(next);
    })();

    return { cached: false };
};

export const handleOpenViewAll = (section: HomeDisplaySection): void => {
    const serverConnection = getAuthSession().serverConnection;
    const variant = getViewAllVariant(section.variant);
    if (!variant) return;
    // The shelf's own items ride along so the grid NEVER opens empty — the
    // user is literally looking at these covers when they tap View All.
    setViewAllRoute({
        items: section.items as MobileHomeItem[],
        title: section.title,
        variant,
    });
    setActiveUtilityScreen('view-all');
    closeMediaDetail();

    // Kick off the exhaustive fetch. The token guards against a stale
    // response landing after the user has opened a different View All
    // (or closed the screen entirely).
    viewAllFetchToken.current += 1;
    const myToken = viewAllFetchToken.current;
    const isFeed = variant === 'podcast-feed';
    // The shelf's own items are the instant seed so the grid never opens on a
    // skeleton — the user is looking at these covers as they tap. `hasSeed`
    // gates the loading state: with a seed we go straight to 'loaded'.
    const seed = section.items as MobileHomeItem[];
    const hasSeed = seed.length > 0;
    setViewAllFullState(hasSeed ? { items: seed, status: 'loaded' } : { status: 'loading' });
    void (async () => {
        // Two-stage fill off the JS thread: a fast capped first page widens the
        // seed almost immediately, then the exhaustive paged read swaps in the
        // complete list. Both read via the native reader thread, so neither
        // blocks the View-All open animation (the old synchronous whole-library
        // read on the nav frame was the "View All is insanely slow" complaint).
        if (!isFeed) {
            const firstPage = await loadAndroidFullCollectionLocalFirstPage(
                serverConnection,
                variant,
            );
            if (viewAllFetchToken.current !== myToken) return;
            if (firstPage.length > seed.length) {
                setViewAllFullState({ items: firstPage, status: 'loaded' });
            }
        }
        const local = isFeed
            ? seed
            : await loadAndroidFullCollectionLocal(serverConnection, variant);
        if (viewAllFetchToken.current !== myToken) return;
        if (local && local.length > 0) {
            setViewAllFullState({ items: local, status: 'loaded' });
        } else if (!hasSeed) {
            // Also ends the loading state for genuinely empty libraries.
            setViewAllFullState({ items: [], status: 'loaded' });
        }
    })();
};

export const handleSelectMediaItem = async (
    item: MobileHomeItem | MobileSearchItem,
): Promise<void> => {
    if ('external' in item && item.external) {
        // A similar-artist tile for an artist not in this library — there's
        // no detail to open, so raise the search overlay prefilled with
        // their name (the dedicated Search tab is gone).
        setSearchOverlayQuery(item.title);
        setIsSearchOverlayOpen(true);
        await handleSearch(item.title);
        return;
    }
    if (item.playback) {
        // Re-selecting the radio station that is ALREADY playing is a no-op:
        // a live stream has no position to restart to, so tearing the session
        // down just re-buffers the same audio and churns every playback
        // subscriber (recents rewrite + session swap + Home re-derive at
        // once). A stray tap on the playing station must cost nothing.
        if (item.playback.source === 'radio') {
            const currentPlayback = getAndroidPlaybackState();
            if (
                (currentPlayback.status === 'playing' ||
                    currentPlayback.status === 'buffering' ||
                    currentPlayback.status === 'loading') &&
                currentPlayback.item.id === item.playback.id
            ) {
                triggerImpact('light');
                return;
            }
        }
        mediaDetailRequestId.current += 1;
        audiobookStartRequestId.current += 1;
        // A play-tap answers with a physical tick the instant it lands —
        // the stream takes real time to resolve, so the hand gets its
        // confirmation before the eye needs one.
        triggerImpact('light');
        // The recents write re-derives the whole Home surface. Deferred a
        // frame (same decoupling the detail-open path below uses) so the
        // FIRST paint out of this tap is the player's own loading state,
        // not a Home re-render riding in front of it.
        const shouldRecordRecent =
            item.type === MobileHomeItemType.RADIO ||
            item.type === MobileSearchItemType.RADIO ||
            item.type === MobileSearchItemType.SONG ||
            item.type === MobileHomeItemType.PODCAST_EPISODE;
        if (shouldRecordRecent) {
            const recordOptions =
                item.type === MobileSearchItemType.SONG ? { directSong: true } : undefined;
            requestAnimationFrame(() => {
                startTransition(() => {
                    recordRecentContentItem(item, recordOptions);
                });
            });
        }
        const playback = item.playback;
        await getPlaybackBridge().handlePlayItem(playback, [playback], 0, { shuffled: false });
        return;
    }

    if (item.type === MobileHomeItemType.AUDIOBOOK) {
        await handleStartAudiobook(item);
        return;
    }

    beginOpenMediaDetail(item);
    requestAnimationFrame(() => {
        startTransition(() => {
            recordRecentContentItem(item);
        });
    });
    void loadDetailWithCache(item);
};

export const handleViewDetailForItem = async (
    item: AndroidRecentContentSourceItem,
): Promise<void> => {
    setContextMenuTarget(null);
    beginOpenMediaDetail(item);
    requestAnimationFrame(() => {
        startTransition(() => {
            recordRecentContentItem(item);
        });
    });
    void loadDetailWithCache(item);
};

export const handleGoToArtistForTrack = async (
    track: MobileMediaTrack,
    source?: MobileContentSource,
): Promise<void> => {
    if (!track.artistId || !source) {
        return;
    }

    const synthetic: MobileHomeItem = {
        id: track.artistId,
        source,
        title: track.artist ?? 'Artist',
        type: MobileHomeItemType.ARTIST,
    };

    setContextMenuTarget(null);
    // The action is reachable from the fullscreen player overflow; without
    // dismissing it first the new detail page would load behind the modal.
    setIsFullPlayerOpen(false);
    await handleSelectMediaItem(synthetic);
};

export const handleGoToAlbumForTrack = async (
    track: MobileMediaTrack,
    source?: MobileContentSource,
): Promise<void> => {
    if (!track.albumId || !source) {
        return;
    }

    const synthetic: MobileHomeItem = {
        id: track.albumId,
        source,
        title: track.album ?? 'Album',
        type: MobileHomeItemType.ALBUM,
    };

    setContextMenuTarget(null);
    setIsFullPlayerOpen(false);
    await handleSelectMediaItem(synthetic);
};

/**
 * The Home-item type a detail was opened as. This is the inverse of
 * `toDetailType`, and it exists because the caches are keyed by ITEM identity
 * (`source:type:id`) while an edit or a reload only has the detail in hand.
 */
const detailItemType = (type: MobileMediaDetail['type']): MobileHomeItem['type'] | null => {
    switch (type) {
        case MobileMediaDetailType.ALBUM:
            return MobileHomeItemType.ALBUM;
        case MobileMediaDetailType.ARTIST:
            return MobileHomeItemType.ARTIST;
        case MobileMediaDetailType.AUDIOBOOK:
            return MobileHomeItemType.AUDIOBOOK;
        case MobileMediaDetailType.PLAYLIST:
            return MobileHomeItemType.PLAYLIST;
        case MobileMediaDetailType.PODCAST:
            return MobileHomeItemType.PODCAST;
        default:
            return null;
    }
};

/**
 * Apply an edit to the media detail currently on screen, in every place a copy
 * of it lives.
 *
 * A loaded detail is held twice — once as the live navigation state and once in
 * the in-memory LRU that makes reopening it instant — and both are the SAME
 * object reference. Writing only the navigation state would leave the cache
 * holding the pre-edit copy, and since `loadDetailWithCache` prefers that cache
 * over everything else, the edit would visibly undo itself the moment the user
 * navigated away and came back.
 *
 * `detailId` is checked rather than assumed: the caller works from a detail it
 * captured earlier (a context menu outlives the frame that opened it), and an
 * edit must never land on whatever page happens to be open now.
 *
 * Returns the detail that was displaced, so a caller writing optimistically has
 * something to put back, or null when nothing was applied.
 */
export const updateLoadedMediaDetail = (
    detailId: string,
    update: (detail: MobileMediaDetail) => MobileMediaDetail,
): MobileMediaDetail | null => {
    const mediaDetailState = getAppNavigation().mediaDetailState;
    if (mediaDetailState.status !== 'loaded' || mediaDetailState.detail.id !== detailId) {
        return null;
    }

    const previous = mediaDetailState.detail;
    const next = update(previous);
    if (next === previous) {
        return null;
    }

    setMediaDetailState({ detail: next, status: 'loaded' });

    // The cache is keyed by the ITEM identity the detail was opened under
    // (`source:type:id`), which is why the key is rebuilt here from the detail
    // rather than carried in — see reloadCurrentMediaDetail, which derives the
    // same key the same way.
    const itemType = detailItemType(previous.type);
    if (!itemType) {
        return previous;
    }
    const cacheKey = getRecentContentItemKey({
        id: previous.id,
        source: previous.source,
        type: itemType,
    });
    if (mediaDetailCache.has(cacheKey)) {
        rememberMediaDetail(mediaDetailCache, cacheKey, next);
    }

    return previous;
};

/**
 * The item identity key a detail is cached under, or null for a detail type
 * that has no Home-item counterpart (and so was never cached under one).
 */
const mediaDetailCacheKey = (target: {
    id: string;
    source?: { id: string };
    type: MobileMediaDetail['type'];
}): null | string => {
    const itemType = detailItemType(target.type);
    if (!itemType) {
        return null;
    }
    return getRecentContentItemKey({ id: target.id, source: target.source, type: itemType });
};

/**
 * Declare that a media detail has been changed on the server, so no local copy
 * of it may be trusted again until one has been re-read.
 *
 * This is the other half of the three-layer read in `loadDetailWithCache`, and
 * its absence was the whole of the "add a song to a playlist and the playlist
 * never changes" bug: the LRU entry outlived the edit, `loadDetailWithCache`
 * preferred it over everything else, and nothing but killing the process ever
 * removed it. Removing a track LOOKED better only because that path happened
 * to write its own result into the same LRU entry.
 *
 * Deliberately does not evict the LRU. A write that can predict its outcome
 * (see `applyMediaDetailEdit`) has already spliced the change in, which makes
 * that entry the most current copy on the device — evicting it would trade an
 * instant correct page for a spinner. It is marked provisional instead, and
 * confirmed by a network read the next time it is opened.
 *
 * When the edited detail is the page on screen, that read happens now rather
 * than at the next open — there is nothing else for the user to be waiting on.
 */
export const invalidateMediaDetail = (target: {
    id: string;
    source?: { id: string };
    type: MobileMediaDetail['type'];
}): void => {
    const cacheKey = mediaDetailCacheKey(target);
    if (!cacheKey) {
        return;
    }
    markMediaDetailStale(cacheKey);

    const mediaDetailState = getAppNavigation().mediaDetailState;
    if (mediaDetailState.status === 'loaded' && mediaDetailState.detail.id === target.id) {
        void reloadCurrentMediaDetail();
    }
};

/**
 * Apply a predicted edit to a media detail wherever a copy of it is held —
 * whether or not that detail is the page on screen.
 *
 * `updateLoadedMediaDetail` only reaches the OPEN detail, which is right for
 * an edit made from the page itself but useless for the common case: adding a
 * song to a playlist you are not currently looking at. That case still has a
 * cached copy of the target, and leaving it untouched is what made "add" feel
 * broken while "remove" felt fine.
 *
 * Returns true when a copy was found and updated, so the caller knows whether
 * the change is already on screen or whether it has to be waited for.
 */
export const applyMediaDetailEdit = (
    target: { id: string; source?: { id: string }; type: MobileMediaDetail['type'] },
    update: (detail: MobileMediaDetail) => MobileMediaDetail,
): boolean => {
    const applied = updateLoadedMediaDetail(target.id, update) !== null;
    if (applied) {
        return true;
    }

    const cacheKey = mediaDetailCacheKey(target);
    if (!cacheKey) {
        return false;
    }
    const cached = mediaDetailCache.get(cacheKey);
    if (!cached) {
        return false;
    }
    const next = update(cached);
    if (next === cached) {
        return false;
    }
    rememberMediaDetail(mediaDetailCache, cacheKey, next);
    return true;
};

/**
 * Re-read the detail on screen from the mirror, after a sync has rewritten it.
 *
 * The post-sync hook refreshes Home and Library, and now drops the detail
 * cache — but neither reaches the page the user is actually looking at, which
 * keeps rendering the state it was opened with. So a playlist edited on
 * another device updated everywhere EXCEPT the playlist you had open, which is
 * the one place it would be noticed.
 *
 * Reads the mirror rather than the network: a sync has just finished writing
 * it, which makes it both the freshest copy on the device and the one that
 * still works with the Wi-Fi off. An item with an unconfirmed local edit
 * outstanding is skipped — its own revalidation owns that, and the mirror
 * cannot be assumed to have caught up with a write this device made moments
 * ago.
 */
export const refreshOpenMediaDetailAfterSync = async (): Promise<void> => {
    const mediaDetailState = getAppNavigation().mediaDetailState;
    if (mediaDetailState.status !== 'loaded') {
        return;
    }
    const detail = mediaDetailState.detail;
    const itemType = detailItemType(detail.type);
    if (!itemType) {
        return;
    }

    const item: AndroidRecentContentSourceItem = {
        artworkImageId: detail.artworkImageId,
        artworkUrl: detail.artworkUrl,
        id: detail.id,
        source: detail.source,
        title: detail.title,
        type: itemType,
    };
    const cacheKey = getRecentContentItemKey(item);
    const serverConnection = getAuthSession().serverConnection;
    const fresh = await loadMirrorMediaDetailIfFresh(item, serverConnection, cacheKey);
    if (!fresh) {
        return;
    }

    rememberMediaDetail(mediaDetailCache, cacheKey, fresh);

    // The user may have navigated in the time the read took.
    const current = getAppNavigation().mediaDetailState;
    if (current.status !== 'loaded' || current.detail.id !== fresh.id) {
        return;
    }
    startTransition(() => {
        setMediaDetailState({ detail: fresh, status: 'loaded' });
    });
};

export const reloadCurrentMediaDetail = async (): Promise<void> => {
    const mediaDetailState = getAppNavigation().mediaDetailState;
    if (mediaDetailState.status !== 'loaded') {
        return;
    }
    const serverConnection = getAuthSession().serverConnection;

    const detail = mediaDetailState.detail;
    const itemType = detailItemType(detail.type);

    if (!itemType) {
        return;
    }

    const item: AndroidRecentContentSourceItem = {
        artworkImageId: detail.artworkImageId,
        artworkUrl: detail.artworkUrl,
        id: detail.id,
        source: detail.source,
        title: detail.title,
        type: itemType,
    };
    const cacheKey = getRecentContentItemKey(item);
    // The cached copy is left in place rather than dropped up front. This
    // reads past both local layers anyway, so the delete bought nothing — and
    // when the network is what fails, it cost the optimistic copy the user is
    // looking at, replacing a correct-looking page with the pre-edit one.
    // A failure leaves the staleness flag set, so the next open retries.
    const next = await loadAndroidMediaDetail(serverConnection, item);
    if (next.status === 'loaded') {
        clearMediaDetailStaleness(cacheKey);
        rememberMediaDetail(mediaDetailCache, cacheKey, next.detail);
        setMediaDetailState(next);
    }
};
