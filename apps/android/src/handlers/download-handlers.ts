import {
    type MobileContentSource,
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobileMediaTrack,
} from '@samo/core/mobile';
import { Alert } from 'react-native';

import { loadCatalogMediaDetail } from '../services/catalog/catalog-reads';
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
import { setContextMenuTarget } from '../state/media-overlays';
import { rememberMediaDetail } from '../utils/media-detail-cache';
import { mediaDetailCache } from './handler-state';

// Only surface hard failures. The Spotify-style circular glyph and the
// Downloads tab show progress / completion visually.
const reportDownloadResult = (result: { enqueued: number; reason?: string; skipped: number }) => {
    if (result.reason) {
        Alert.alert('Download', result.reason);
    }
};

export const handleDownloadCollectionItem = async (
    item: AndroidRecentContentSourceItem,
): Promise<void> => {
    const serverConnection = getAuthSession().serverConnection;
    setContextMenuTarget(null);
    // Detail lookup: in-memory → mirror → network (fresh-install fallback).
    const cacheKey = getRecentContentItemKey(item);
    let detail: MobileMediaDetail | undefined = mediaDetailCache.get(cacheKey);
    if (!detail) {
        const fromMirror = await loadCatalogMediaDetail(item, serverConnection);
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
    const result = await enqueueCollectionDownload(detail, serverConnection);
    reportDownloadResult(result);
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
        const result = await enqueueCollectionDownload(detail, serverConnection);
        reportDownloadResult(result);
        return;
    }

    // Podcast episode long-press → download just that episode.
    if (detail?.type === MobileMediaDetailType.PODCAST) {
        const outcome = await enqueueSinglePodcastEpisodeDownload(
            detail,
            track,
            serverConnection,
        );
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
    const outcome = await enqueueSingleMusicTrackDownload(
        track,
        source,
        track.artworkUrl ?? detail?.artworkUrl,
        serverConnection,
    );
    if (outcome.reason) {
        Alert.alert('Download', outcome.reason);
    }
};
