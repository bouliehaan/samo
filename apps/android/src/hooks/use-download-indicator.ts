import { MobileHomeItemType } from '@samo/core/mobile';

import {
    useDownloadedCollectionKeys,
    useDownloadedTrackKeys,
} from '../contexts/downloaded-keys';
import { type AndroidRecentContentSourceItem } from '../services/recent-content';
import {
    type DownloadProgressScope,
    useDownloadProgress,
} from '../state/download-progress';
import { type LibraryMediaType } from '../types/library-display';
import {
    getDownloadedCollectionKey,
    getDownloadedTrackKey,
} from '../utils/download-keys';
import { DOWNLOAD_PROGRESS_START } from '../utils/download-progress';
import { getLibraryMediaType } from '../utils/library-display';

/**
 * Everything a surface needs to draw the download badge for one item: the arc
 * while it transfers, the tick once it's saved, nothing otherwise.
 *
 * It lives here rather than in each tile because five surfaces show this badge —
 * home shelves, the podcast/audiobook grids, library and playlist rows, View
 * All, and detail track rows — and the scope rules underneath it are not
 * obvious enough to retype: which key a kind of item is filed under, and when
 * the opening sliver is allowed to displace an existing tick.
 */
export type DownloadIndicatorState = {
    isDownloaded: boolean;
    isDownloading: boolean;
    /** False when there is nothing to draw, so a caller can drop the whole row. */
    isVisible: boolean;
    progress: number;
};

const isDownloadableCollectionMediaType = (mediaType: LibraryMediaType | undefined): boolean =>
    mediaType === 'albums' ||
    mediaType === 'audiobooks' ||
    mediaType === 'playlists' ||
    mediaType === 'podcasts';

const useDownloadIndicatorForKey = (
    scope: DownloadProgressScope,
    key: string | null,
): DownloadIndicatorState => {
    const downloadedCollectionKeys = useDownloadedCollectionKeys();
    const downloadedTrackKeys = useDownloadedTrackKeys();
    const progress = useDownloadProgress(scope, key);
    const isDownloaded =
        key !== null &&
        (scope === 'track'
            ? downloadedTrackKeys.has(key)
            : downloadedCollectionKeys.has(key));
    // The opening sliver is a stand-in for entries the registry hasn't written
    // yet, so it must not displace a tick that is already earned — re-downloading
    // something already saved would otherwise blink the tick out and back.
    const isDownloading = progress > (isDownloaded ? DOWNLOAD_PROGRESS_START : 0);
    return {
        isDownloaded,
        isDownloading,
        isVisible: isDownloaded || isDownloading,
        progress,
    };
};

/** For anything that renders a home/search item: a tile, a grid cell, a row. */
export const useDownloadIndicator = (
    item: AndroidRecentContentSourceItem,
): DownloadIndicatorState => {
    const mediaType = getLibraryMediaType(item);
    // A podcast episode downloads as one track filed under its show, so it is
    // tracked by track key like a song is — its own id will never appear as a
    // collection, which is why an episode saved offline used to show nothing.
    const scope: DownloadProgressScope =
        mediaType === 'songs' || item.type === MobileHomeItemType.PODCAST_EPISODE
            ? 'track'
            : 'collection';
    const key =
        scope === 'track'
            ? getDownloadedTrackKey(item.source?.id, item.id)
            : isDownloadableCollectionMediaType(mediaType)
              ? getDownloadedCollectionKey(item.source?.id, item.id)
              : null;
    return useDownloadIndicatorForKey(scope, key);
};

/** For a detail page's own track/episode rows, which carry no home item. */
export const useTrackDownloadIndicator = (
    sourceId: string | undefined,
    trackId: string,
): DownloadIndicatorState =>
    useDownloadIndicatorForKey('track', getDownloadedTrackKey(sourceId, trackId));
