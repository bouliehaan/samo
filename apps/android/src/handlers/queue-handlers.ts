import {
    buildSamoAudiobookQueueFromFiles,
    MobileHomeItemType,
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobileMediaTrack,
    type MobilePlayableAudio,
} from '@samo/core/mobile';
import { ensureSamoStreamToken, findServerAuthenticationForSource } from '@samo/core/server';

import { syncAndroidNativePlaybackQueue } from '../services/audio-playback';
import { getOfflineAudiobookFiles } from '../services/download-manager';
import { loadMirrorMediaDetailIfFresh } from '../services/media-detail-freshness';
import { getTrackTimelineSegments, loadAndroidMediaDetail } from '../services/media-detail';
import {
    type AndroidRecentContentSourceItem,
    getRecentContentItemKey,
} from '../services/recent-content';
import { getAuthSession } from '../state/auth-session';
import { isOfflineNow } from '../state/network-state';
import { setContextMenuFeedback } from '../state/media-overlays';
import { getPlaybackQueue, setPlaybackQueue } from '../state/playback-queue-store';
import { getAndroidPlaybackState } from '../state/playback-store';
import { buildDownloadedMusicDetail } from '../utils/offline-music-detail';
import {
    audiobookFilesTimelineDurationSeconds,
    buildAudiobookFilePlaybackQueue,
    buildOfflineAudiobookPlayable,
} from '../utils/offline-playback';
import { rememberMediaDetail } from '../utils/media-detail-cache';
import { withResumePosition } from '../utils/playback-resume';
import { insertQueueItems, type QueueInsertPlacement } from '../utils/queue-edits';
import { mediaDetailCache } from './handler-state';
import { resolveAudiobookResumeSeconds } from './playback-handlers';

/** True when the Up Next queue can take more items — something sequential is
 *  active (radio is a live stream with no queue). Pure so render code can
 *  derive it from its own playback-store subscription. */
export const canAppendToPlaybackQueue = (
    activeItem: MobilePlayableAudio | null,
): boolean => activeItem !== null && activeItem.source !== 'radio';

// Shared enqueue for the cross-media Up Next queue. `placement` chooses the
// end (Play Last) or right after the current item (Play Next) — the slot
// itself is decided by insertQueueItems, so a multi-file audiobook that is
// playing is never split. Radio is filtered out — it's a live stream with no
// place in a sequential queue. Anything else (music, podcast episodes,
// audiobooks) can be intermixed; the playback engine advances across types so
// each gets its own resume + progress context.
const enqueuePlayableItems = (
    items: MobilePlayableAudio[],
    placement: QueueInsertPlacement,
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

    // A playing item with no queue of its own (a recovered session) becomes a
    // one-item queue first, so both placements have somewhere to land.
    const queue = getPlaybackQueue() ?? { index: 0, items: [playbackState.item] };
    setPlaybackQueue(insertQueueItems(queue, queueableItems, placement));
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

    if (!detail && isOfflineNow()) {
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

const placementFeedback = (placement: QueueInsertPlacement, added: number, isBook: boolean) => {
    const what = isBook || added === 1 ? '' : `${added} tracks `;
    return placement === 'next' ? `Playing ${what}next` : `Playing ${what}last`;
};

/**
 * A samo audiobook as queue items: the file the listener is on (or the file
 * holding `bookStartSeconds`, for a chapter tap), positioned inside it, then
 * every file after it. The same per-file build the tap-to-play path uses.
 *
 * This is NOT `detail.tracks`: for a book those are CHAPTER rows, and every
 * row carries the same single whole-book playable. Queuing them enqueued one
 * copy of the entire book per chapter, each starting at 0:00 — a 30-chapter
 * book was 30 replays from the beginning.
 *
 * Files already heard are left out on purpose. The queue plays in order, so
 * starting the block at file 1 would replay the book from the top; the cost is
 * that a scrub back before the resume file's start lands at that file's start.
 */
const buildAudiobookQueueTail = async (
    detail: MobileMediaDetail,
    bookStartSeconds: number | undefined,
): Promise<MobilePlayableAudio[]> => {
    const auth = findServerAuthenticationForSource(getAuthSession().serverConnection, {
        id: detail.source.id,
    });
    const startSeconds =
        bookStartSeconds ?? (auth ? await resolveAudiobookResumeSeconds(auth, detail) : 0);
    const timelineSegments = detail.tracks[0]
        ? getTrackTimelineSegments(detail, detail.tracks[0])
        : undefined;

    // Downloaded files first when they are what can actually play: offline,
    // or no streamable manifest for this book.
    const streamable = auth != null && (detail.audiobookFiles?.length ?? 0) > 0;
    const offlineFiles =
        !streamable || isOfflineNow()
            ? await getOfflineAudiobookFiles(detail.id, detail.source.id)
            : [];
    if (offlineFiles.length > 0) {
        const timelineDurationSeconds = audiobookFilesTimelineDurationSeconds(offlineFiles);
        const { index, items } = buildAudiobookFilePlaybackQueue(
            detail,
            offlineFiles,
            startSeconds,
            (file, initialPositionSeconds) =>
                buildOfflineAudiobookPlayable(
                    detail,
                    file,
                    initialPositionSeconds,
                    auth,
                    timelineDurationSeconds,
                ),
        );
        return items.slice(index);
    }

    if (auth && detail.audiobookFiles?.length) {
        const streamToken = await ensureSamoStreamToken(auth).catch(() => undefined);
        const queue = buildSamoAudiobookQueueFromFiles(auth, {
            artworkUrl: detail.artworkUrl,
            audiobookId: detail.id,
            bookStartSeconds: startSeconds,
            files: detail.audiobookFiles,
            streamToken,
            subtitle: detail.authorsSummary ?? detail.subtitle,
            timelineDurationSeconds: detail.durationSeconds,
            timelineSegments,
            title: detail.title,
        });
        if (queue) {
            return queue.items.slice(queue.index);
        }
    }

    // No manifest and nothing downloaded: the one whole-book playable the
    // detail carries, resumed. Once, not once per chapter row.
    const playback = detail.tracks.find(
        (track) => track.playback && track.playback.source !== 'radio',
    )?.playback;
    return playback ? [withResumePosition(playback, startSeconds)] : [];
};

const enqueueAudiobook = async (
    detail: MobileMediaDetail,
    bookStartSeconds: number | undefined,
    placement: QueueInsertPlacement,
): Promise<void> => {
    setContextMenuFeedback('Loading audiobook…');
    const items = await buildAudiobookQueueTail(detail, bookStartSeconds);
    const added = enqueuePlayableItems(items, placement);
    if (added > 0) {
        setContextMenuFeedback(placementFeedback(placement, added, true));
    }
};

const enqueueTrack = async (
    track: MobileMediaTrack,
    placement: QueueInsertPlacement,
    detail: MobileMediaDetail | undefined,
): Promise<void> => {
    const playback = track.playback;
    if (!playback || playback.source === 'radio') {
        setContextMenuFeedback(
            placement === 'next' ? 'This can’t play next.' : 'This can’t be queued.',
        );
        return;
    }

    // A row on an audiobook's page is a chapter, and its `playback` is the
    // whole book: queue the book from that chapter, as files. A chapterless
    // book has one row with no start, and resumes like the book tile would.
    if (detail?.type === MobileMediaDetailType.AUDIOBOOK) {
        await enqueueAudiobook(detail, track.startSeconds, placement);
        return;
    }

    const added = enqueuePlayableItems([playback], placement);
    if (added > 0) {
        setContextMenuFeedback(placementFeedback(placement, added, false));
    }
};

export const handleAddTrackToQueue = (
    track: MobileMediaTrack,
    detail?: MobileMediaDetail,
): Promise<void> => enqueueTrack(track, 'end', detail);

export const handlePlayTrackNext = (
    track: MobileMediaTrack,
    detail?: MobileMediaDetail,
): Promise<void> => enqueueTrack(track, 'next', detail);

export const handleAddRadioToQueue = (item: AndroidRecentContentSourceItem): void => {
    const playback = item.playback;
    if (!playback || playback.source !== 'radio') {
        setContextMenuFeedback('This station can’t be queued.');
        return;
    }
    // A live station has no end, so it belongs at the TAIL of the queue —
    // it takes over once everything queued ahead of it finishes (the
    // "fall asleep to a podcast, hand off to a radio station" case). That is
    // why a station is offered Play Last and never Play Next. Adding radio
    // flips the queue to JS-driven advance — the native gapless mirror opts
    // out of any queue containing a live stream — which is exactly the path
    // playQueuedItem already uses to start a station.
    const added = enqueuePlayableItems([playback], 'end', { allowRadio: true });
    if (added > 0) {
        setContextMenuFeedback('Plays when the queue ends');
    }
};

const enqueueCollection = async (
    item: AndroidRecentContentSourceItem,
    placement: QueueInsertPlacement,
): Promise<void> => {
    if (
        item.type !== MobileHomeItemType.ALBUM &&
        item.type !== MobileHomeItemType.PLAYLIST &&
        item.type !== MobileHomeItemType.AUDIOBOOK
    ) {
        setContextMenuFeedback('This can’t be queued.');
        return;
    }

    setContextMenuFeedback(
        item.type === MobileHomeItemType.AUDIOBOOK ? 'Loading audiobook…' : 'Loading tracks…',
    );
    const detail = await loadDetailForContextAction(item);
    if (!detail) {
        setContextMenuFeedback('Could not load tracks for this item.');
        return;
    }

    if (detail.type === MobileMediaDetailType.AUDIOBOOK) {
        await enqueueAudiobook(detail, undefined, placement);
        return;
    }

    // Every sequential playable, in the collection's own order, as one block.
    // Radio is never collection-backed, but the guard keeps the engine's
    // invariant (no live stream in the queue).
    const playables = detail.tracks.flatMap((track) =>
        track.playback && track.playback.source !== 'radio' ? [track.playback] : [],
    );
    const added = enqueuePlayableItems(playables, placement);
    if (added > 0) {
        setContextMenuFeedback(placementFeedback(placement, added, false));
    }
};

export const handleAddCollectionToQueue = (item: AndroidRecentContentSourceItem): Promise<void> =>
    enqueueCollection(item, 'end');

export const handlePlayCollectionNext = (item: AndroidRecentContentSourceItem): Promise<void> =>
    enqueueCollection(item, 'next');
