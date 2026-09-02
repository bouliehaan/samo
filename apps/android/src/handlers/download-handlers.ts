import {
    type MobileContentSource,
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobileMediaTrack,
} from '@samo/core/mobile';
import { Alert } from 'react-native';

import { loadMirrorMediaDetailIfFresh } from '../services/media-detail-freshness';
import {
    enqueueCollectionDownload,
    enqueueSingleMusicTrackDownload,
    enqueueSinglePodcastEpisodeDownload,
} from '../services/download-manager';
import { loadAndroidMediaDetail } from '../services/media-detail';
import {
    type AndroidRecentContentSourceItem,
    getRecentContentItemKey,
} from '../services/recent-content';
import { getAuthSession } from '../state/auth-session';
import {
    clearDownloadRequested,
    markDownloadRequested,
} from '../state/download-progress';
import { setContextMenuTarget } from '../state/media-overlays';
import {
    getDownloadedCollectionKey,
    getDownloadedTrackKey,
} from '../utils/download-keys';
import { rememberMediaDetail } from '../utils/media-detail-cache';
import { mediaDetailCache } from './handler-state';

// Only surface hard failures. The Spotify-style circular glyph and the
// Downloads tab show progress / completion visually.
const reportDownloadResult = (result: { enqueued: number; reason?: string; skipped: number }) => {
    if (result.reason) {
        Alert.alert('Download', result.reason);
    }
};

/**
 * How many registry entries this collection is about to produce, so the arc
 * divides by the real track count instead of by however many entries have been
 * written so far. An audiobook's files are the server's to decide, so it gets no
 * count and falls back to its entries.
 */
const countDownloadableTracks = (detail: MobileMediaDetail): number => {
    if (detail.type === MobileMediaDetailType.AUDIOBOOK) {
        return 0;
    }
    if (detail.type === MobileMediaDetailType.PODCAST) {
        return detail.tracks.filter((track) => track.episodeId ?? track.id).length;
    }
    return detail.tracks.filter((track) => track.playback?.url).length;
};

export const handleDownloadCollectionItem = async (
    item: AndroidRecentContentSourceItem,
): Promise<void> => {
    const serverConnection = getAuthSession().serverConnection;
    setContextMenuTarget(null);
    // Claim the arc before the detail lookup below, which on a fresh install is
    // a network round trip. Without it a download started from a tile looks like
    // nothing happened until the first entry lands.
    const progressKey = getDownloadedCollectionKey(item.source?.id, item.id);
    markDownloadRequested('collection', progressKey);
    let started = false;
    try {
        // Detail lookup: in-memory → mirror → network (fresh-install fallback).
        const cacheKey = getRecentContentItemKey(item);
        let detail: MobileMediaDetail | undefined = mediaDetailCache.get(cacheKey);
        if (!detail) {
            const fromMirror = await loadMirrorMediaDetailIfFresh(
                item,
                serverConnection,
                cacheKey,
            );
            if (fromMirror) {
                detail = fromMirror;
                rememberMediaDetail(mediaDetailCache, cacheKey, fromMirror);
            }
        }
        if (!detail) {
            const next = await loadAndroidMediaDetail(serverConnection, item);
            if (next.status === 'loaded') {
                rememberMediaDetail(mediaDetailCache, cacheKey, next.detail);
                detail = next.detail;
            } else {
                Alert.alert('Download', 'Could not load detail to start the download.');
                return;
            }
        }
        markDownloadRequested('collection', progressKey, countDownloadableTracks(detail));
        const result = await enqueueCollectionDownload(detail, serverConnection);
        started = result.enqueued > 0;
        reportDownloadResult(result);
    } finally {
        // Nothing was enqueued — it failed, it had nothing to download, or it
        // was already on disk. Either way the arc has no work to describe.
        if (!started) {
            clearDownloadRequested('collection', progressKey);
        }
    }
};

export const handleDownloadSongTrack = async (
    track: MobileMediaTrack,
    detail: MobileMediaDetail | undefined,
    source: MobileContentSource | undefined,
): Promise<void> => {
    const serverConnection = getAuthSession().serverConnection;
    setContextMenuTarget(null);

    // Audiobook chapter long-press → download the whole book. Individual
    // chapter files don't exist as separate downloads.
    if (detail?.type === MobileMediaDetailType.AUDIOBOOK) {
        const bookKey = getDownloadedCollectionKey(detail.source.id, detail.id);
        markDownloadRequested('collection', bookKey);
        const result = await enqueueCollectionDownload(detail, serverConnection);
        if (result.enqueued === 0) {
            clearDownloadRequested('collection', bookKey);
        }
        reportDownloadResult(result);
        return;
    }

    // Podcast episode long-press → download just that episode. The stream token
    // it needs is a network mint, so claim the arc before asking for one.
    if (detail?.type === MobileMediaDetailType.PODCAST) {
        const episodeKey = getDownloadedTrackKey(
            detail.source.id,
            track.episodeId ?? track.id,
        );
        markDownloadRequested('track', episodeKey);
        const outcome = await enqueueSinglePodcastEpisodeDownload(
            detail,
            track,
            serverConnection,
        );
        if (!outcome.enqueued) {
            clearDownloadRequested('track', episodeKey);
        }
        if (outcome.reason) {
            Alert.alert('Download', outcome.reason);
        }
        return;
    }

    // Music track. Use the source we have.
    if (!source) {
        Alert.alert('Download', 'Could not figure out which server this track belongs to.');
        return;
    }
    const trackKey = getDownloadedTrackKey(source.id, track.id);
    markDownloadRequested('track', trackKey);
    const outcome = await enqueueSingleMusicTrackDownload(
        track,
        source,
        track.artworkUrl ?? detail?.artworkUrl,
        serverConnection,
    );
    if (!outcome.enqueued) {
        clearDownloadRequested('track', trackKey);
    }
    if (outcome.reason) {
        Alert.alert('Download', outcome.reason);
    }
};
