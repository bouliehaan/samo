import { type AndroidPlaybackQueue } from '../state/playback-queue-store';
import { getAudiobookQueueItemBookId } from './samo-audiobook-playback';

/**
 * Pure queue-edit operations for the Up Next sheet.
 *
 * Contract with the native mirror (`reconcileExoPlaylistToQueue`): an EDITED
 * queue must keep `index` pointing at the currently-playing item — that is how
 * native tells "Up Next edit" (apply to the live ExoPlayer playlist without
 * interrupting playback) from "context switch" (leave the player alone, a
 * play() is in flight). Every function here preserves that invariant by
 * construction and returns null for edits that would break it.
 */

/**
 * Remove the item at `removeIndex`. Removing the currently-playing row is
 * refused (null) — native tolerates it, but the resulting "playing a track
 * that is no longer in the queue" state is ambiguous for every consumer.
 */
export const removeQueueItemAt = (
    queue: AndroidPlaybackQueue | null,
    removeIndex: number,
): AndroidPlaybackQueue | null => {
    if (!queue) {
        return null;
    }
    if (
        !Number.isInteger(removeIndex) ||
        removeIndex < 0 ||
        removeIndex >= queue.items.length
    ) {
        return null;
    }
    if (removeIndex === queue.index) {
        return null;
    }
    if (queue.items.length <= 1) {
        return null;
    }

    const items = queue.items.filter((_, index) => index !== removeIndex);
    return {
        ...queue,
        index: queue.index > removeIndex ? queue.index - 1 : queue.index,
        items,
    };
};

/**
 * Move an UP-NEXT item (index > queue.index) to another up-next position.
 * `toIndex` is the item's FINAL index in the resulting array. History and the
 * now-playing row never move — reordering the past is meaningless, and moving
 * across the now-playing boundary would re-anchor `index`.
 */
export const moveQueueUpNextItem = (
    queue: AndroidPlaybackQueue | null,
    fromIndex: number,
    toIndex: number,
): AndroidPlaybackQueue | null => {
    if (!queue) {
        return null;
    }
    const firstUpNext = queue.index + 1;
    const lastIndex = queue.items.length - 1;
    if (
        !Number.isInteger(fromIndex) ||
        !Number.isInteger(toIndex) ||
        fromIndex < firstUpNext ||
        fromIndex > lastIndex
    ) {
        return null;
    }
    const clampedTo = Math.min(Math.max(toIndex, firstUpNext), lastIndex);
    if (clampedTo === fromIndex) {
        return null;
    }

    const items = queue.items.slice();
    const [moved] = items.splice(fromIndex, 1);
    items.splice(clampedTo, 0, moved!);
    return {
        ...queue,
        items,
    };
};

export type QueueInsertPlacement = 'end' | 'next';

/**
 * Where "Play Next" lands: right after the now-playing item — unless that item
 * is one FILE of a multi-file audiobook, in which case after the book's last
 * file. A book is one continuous work; "play this next" while chapter 4 is on
 * means after the book, never between chapters 4 and 5. Only the contiguous
 * run of the same book counts, so a book the user already split by dragging
 * rows around is left as they arranged it.
 */
export const findPlayNextInsertIndex = (
    queue: Pick<AndroidPlaybackQueue, 'index' | 'items'>,
): number => {
    const { index, items } = queue;
    if (!Number.isInteger(index) || index < 0 || index >= items.length) {
        return items.length;
    }
    let insertAt = index + 1;
    const bookId = getAudiobookQueueItemBookId(items[index]!);
    if (bookId !== undefined) {
        while (insertAt < items.length && getAudiobookQueueItemBookId(items[insertAt]!) === bookId) {
            insertAt += 1;
        }
    }
    return insertAt;
};

/**
 * Insert `items` as one ordered block: at the Play Next slot, or at the end
 * (Play Last). `index` never moves — the now-playing item stays where it is —
 * which is the contract `reconcileExoPlaylistToQueue` reads as an Up Next edit
 * rather than a context switch. Queue metadata (playlist origin, Explore flag)
 * is preserved: the origin describes where the queue STARTED, and appended
 * strangers are excluded from it by `editablePlaylist.trackIds`, not by
 * dropping the origin.
 */
export const insertQueueItems = (
    queue: AndroidPlaybackQueue,
    items: readonly AndroidPlaybackQueue['items'][number][],
    placement: QueueInsertPlacement,
): AndroidPlaybackQueue => {
    if (items.length === 0) {
        return queue;
    }
    const insertAt = placement === 'next' ? findPlayNextInsertIndex(queue) : queue.items.length;
    return {
        ...queue,
        items: [...queue.items.slice(0, insertAt), ...items, ...queue.items.slice(insertAt)],
    };
};
