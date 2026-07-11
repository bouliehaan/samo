import { type AndroidPlaybackQueue } from '../state/playback-queue-store';

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
