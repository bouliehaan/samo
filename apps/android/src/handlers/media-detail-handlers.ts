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

import { loadCatalogMediaDetail } from '../services/catalog/catalog-reads';
import { triggerImpact } from '../services/haptics';
import { buildMediaDetailLoadKey, dedupeInFlight } from '../services/in-flight-requests';
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
    void loadCatalogMediaDetail(item, serverConnection).then((fromMirror) => {
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

export const loadDetailWithCache = async (
    item: AndroidRecentContentSourceItem,
): Promise<{ cached: boolean }> => {
    audiobookStartRequestId.current += 1;
    const requestId = (mediaDetailRequestId.current += 1);
    const isCurrentRequest = () => mediaDetailRequestId.current === requestId;
    const serverConnection = getAuthSession().serverConnection;
    const cacheKey = getRecentContentItemKey(item);

    // Layer 1: in-memory cache — instant.
    let cached = mediaDetailCache.get(cacheKey);

    // Layer 1.5: local SQLite catalog — instant, authoritative for Samo, and
    // works offline. The entire library is mirrored on-device, so this makes
    // *every* Samo detail open instant, not just recently-viewed ones.
    if (!cached) {
        const fromCatalog = await loadCatalogMediaDetail(item, serverConnection);
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
        // for Samo details; freshness is the sync engine's job, not a
        // per-open network refresh. The old steady-state refetch here cost
        // a server round-trip on EVERY detail open just to re-confirm what
        // the mirror already knew.
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

export const reloadCurrentMediaDetail = async (): Promise<void> => {
    const mediaDetailState = getAppNavigation().mediaDetailState;
    if (mediaDetailState.status !== 'loaded') {
        return;
    }
    const serverConnection = getAuthSession().serverConnection;

    const detail = mediaDetailState.detail;
    const itemType =
        detail.type === MobileMediaDetailType.ALBUM
            ? MobileHomeItemType.ALBUM
            : detail.type === MobileMediaDetailType.PLAYLIST
              ? MobileHomeItemType.PLAYLIST
              : detail.type === MobileMediaDetailType.ARTIST
                ? MobileHomeItemType.ARTIST
                : detail.type === MobileMediaDetailType.PODCAST
                  ? MobileHomeItemType.PODCAST
                  : detail.type === MobileMediaDetailType.AUDIOBOOK
                    ? MobileHomeItemType.AUDIOBOOK
                    : null;

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
    mediaDetailCache.delete(cacheKey);
    const next = await loadAndroidMediaDetail(serverConnection, item);
    if (next.status === 'loaded') {
        rememberMediaDetail(mediaDetailCache, cacheKey, next.detail);
        setMediaDetailState(next);
    }
};
