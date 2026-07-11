import {
    MobileHomeItemType,
    type MobileMediaDetail,
    type MobileMediaTrack,
    type MobilePlayableAudio,
} from '@samo/core/mobile';

import { syncAndroidNativePlaybackQueue } from '../services/audio-playback';
import { loadCatalogMediaDetail } from '../services/catalog/catalog-reads';
import { loadAndroidMediaDetail } from '../services/media-detail';
import {
    type AndroidRecentContentSourceItem,
    getRecentContentItemKey,
} from '../services/recent-content';
import { getAuthSession } from '../state/auth-session';
import { getDownloadsSnapshot } from '../state/downloads-state';
import { setContextMenuFeedback } from '../state/media-overlays';
import { getPlaybackQueue, setPlaybackQueue } from '../state/playback-queue-store';
import { getAndroidPlaybackState } from '../state/playback-store';
import { buildDownloadedMusicDetail } from '../utils/offline-music-detail';
import { rememberMediaDetail } from '../utils/media-detail-cache';
import { mediaDetailCache } from './handler-state';

/** True when the Up Next queue can take more items — something sequential is
 *  active (radio is a live stream with no queue). Pure so render code can
 *  derive it from its own playback-store subscription. */
export const canAppendToPlaybackQueue = (
    activeItem: MobilePlayableAudio | null,
): boolean => activeItem !== null && activeItem.source !== 'radio';

// Shared enqueue for the cross-media Up Next queue. `placement` chooses the
// end (Add to Queue) or right after the current item (Play Next). Radio is
// filtered out — it's a live stream with no place in a sequential queue.
// Anything else (music, podcast episodes, audiobooks) can be intermixed; the
// playback engine advances across types in JS so each gets its own resume +
// progress context.
const enqueuePlayableItems = (
    items: MobilePlayableAudio[],
    placement: 'end' | 'next',
    options?: { allowRadio?: boolean },
): number => {
    // Radio is filtered out by default (an album/playlist enqueue must never
    // smuggle a live stream into the middle of a queue). The explicit
    // "add this station" path opts in — see handleAddRadioToQueue.
    const queueableItems = options?.allowRadio
        ? items
        : items.filter((item) => item.source !== 'radio');
    const playbackState = getAndroidPlaybackState();

    if (queueableItems.length === 0) {
        setContextMenuFeedback('Nothing playable was found for the queue.');
        return 0;
    }

    if (playbackState.status === 'idle') {
        setContextMenuFeedback('Start playback before adding to the queue.');
        return 0;
    }

    if (playbackState.item.source === 'radio') {
        setContextMenuFeedback('Radio playback does not have an Up Next queue.');
        return 0;
    }

    const queue = getPlaybackQueue();
    if (queue) {
        const insertAt =
            placement === 'next'
                ? Math.min(queue.index + 1, queue.items.length)
                : queue.items.length;
        setPlaybackQueue({
            ...queue,
            items: [
                ...queue.items.slice(0, insertAt),
                ...queueableItems,
                ...queue.items.slice(insertAt),
            ],
        });
    } else {
        setPlaybackQueue({
            index: 0,
            items: [playbackState.item, ...queueableItems],
        });
    }
    syncAndroidNativePlaybackQueue(getPlaybackQueue(), getAuthSession().serverConnection);

    return queueableItems.length;
};

export const appendPlayableItemsToQueue = (items: MobilePlayableAudio[]): number =>
    enqueuePlayableItems(items, 'end');

export const insertPlayableItemsNext = (items: MobilePlayableAudio[]): number =>
    enqueuePlayableItems(items, 'next');

/** Detail lookup for a context-menu action: in-memory → mirror → offline
 *  synthesis → network. Never touches the visible detail surface. */
export const loadDetailForContextAction = async (
    item: AndroidRecentContentSourceItem,
): Promise<MobileMediaDetail | null> => {
    const serverConnection = getAuthSession().serverConnection;
    const cacheKey = getRecentContentItemKey(item);
    let detail = mediaDetailCache.get(cacheKey);

    if (!detail) {
        const fromMirror = await loadCatalogMediaDetail(item, serverConnection);
        if (fromMirror) {
            detail = fromMirror;
            rememberMediaDetail(mediaDetailCache, cacheKey, fromMirror);
        }
    }

    if (!detail && getDownloadsSnapshot().isOfflineMode) {
        const downloadedDetail = await buildDownloadedMusicDetail(item);
        if (downloadedDetail) {
            detail = downloadedDetail;
            rememberMediaDetail(mediaDetailCache, cacheKey, downloadedDetail);
        }
    }

    if (detail) {
        return detail;
    }

    const next = await loadAndroidMediaDetail(serverConnection, item);
    if (next.status === 'loaded') {
        rememberMediaDetail(mediaDetailCache, cacheKey, next.detail);
        return next.detail;
    }

    return null;
};

export const handleAddTrackToQueue = (track: MobileMediaTrack): void => {
    const playback = track.playback;
    if (!playback || playback.source === 'radio') {
        setContextMenuFeedback('This can’t be added to the queue.');
        return;
    }

    const added = appendPlayableItemsToQueue([playback]);
    if (added > 0) {
        setContextMenuFeedback('Added to queue');
    }
};

export const handleAddRadioToQueue = (item: AndroidRecentContentSourceItem): void => {
    const playback = item.playback;
    if (!playback || playback.source !== 'radio') {
        setContextMenuFeedback('This station can’t be added to the queue.');
        return;
    }
    // A live station has no end, so it belongs at the TAIL of the queue —
    // it takes over once everything queued ahead of it finishes (the
    // "fall asleep to a podcast, hand off to a radio station" case). Adding
    // radio flips the queue to JS-driven advance — the native gapless
    // mirror opts out of any queue containing a live stream — which is
    // exactly the path playQueuedItem already uses to start a station.
    const added = enqueuePlayableItems([playback], 'end', { allowRadio: true });
    if (added > 0) {
        setContextMenuFeedback('Plays when the queue ends');
    }
};

export const handlePlayTrackNext = (track: MobileMediaTrack): void => {
    const playback = track.playback;
    if (!playback || playback.source === 'radio') {
        setContextMenuFeedback('This can’t play next.');
        return;
    }

    const added = insertPlayableItemsNext([playback]);
    if (added > 0) {
        setContextMenuFeedback('Playing next');
    }
};

const enqueueCollection = async (
    item: AndroidRecentContentSourceItem,
    placement: 'end' | 'next',
): Promise<void> => {
    if (
        item.type !== MobileHomeItemType.ALBUM &&
        item.type !== MobileHomeItemType.PLAYLIST &&
        item.type !== MobileHomeItemType.AUDIOBOOK
    ) {
        setContextMenuFeedback('This can’t be added to the queue.');
        return;
    }

    setContextMenuFeedback(placement === 'next' ? 'Adding to Up Next…' : 'Adding to queue…');
    const detail = await loadDetailForContextAction(item);
    if (!detail) {
        setContextMenuFeedback('Could not load tracks for this item.');
        return;
    }

    // Take every sequential playable (music tracks, audiobook files), not
    // just music — an audiobook enqueues its files so the whole book plays
    // through the Up Next queue. Radio is never collection-backed, but the
    // guard keeps the engine's invariant (no live stream in the queue).
    const playables = detail.tracks.flatMap((track) =>
        track.playback && track.playback.source !== 'radio' ? [track.playback] : [],
    );
    const added =
        placement === 'next'
            ? insertPlayableItemsNext(playables)
            : appendPlayableItemsToQueue(playables);
    if (added > 0) {
        const isBook = item.type === MobileHomeItemType.AUDIOBOOK;
        if (placement === 'next') {
            setContextMenuFeedback(
                isBook || added === 1 ? 'Playing next' : `Playing ${added} tracks next`,
            );
        } else if (isBook) {
            setContextMenuFeedback('Added audiobook to queue');
        } else {
            setContextMenuFeedback(
                added === 1 ? 'Added 1 track to queue' : `Added ${added} tracks to queue`,
            );
        }
    }
};

export const handleAddCollectionToQueue = (item: AndroidRecentContentSourceItem): Promise<void> =>
    enqueueCollection(item, 'end');

export const handlePlayCollectionNext = (item: AndroidRecentContentSourceItem): Promise<void> =>
    enqueueCollection(item, 'next');
