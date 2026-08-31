import { PlayerRepeat } from '@samo/core/playback';

import { shuffleInPlace } from '/@/renderer/utils/shuffle';
import { QueueSong } from '/@/shared/types/domain-types';

export function calculateNextIndex(
    currentIndex: number,
    queueLength: number,
    repeat: PlayerRepeat,
): { nextIndex: number; shouldPause: boolean } {
    const isLastTrack = currentIndex === queueLength - 1;

    if (repeat === PlayerRepeat.ONE) {
        return { nextIndex: currentIndex, shouldPause: false };
    }

    if (repeat === PlayerRepeat.ALL) {
        if (isLastTrack) {
            return { nextIndex: 0, shouldPause: false };
        }
        return { nextIndex: currentIndex + 1, shouldPause: false };
    }

    if (isLastTrack) {
        return { nextIndex: 0, shouldPause: true };
    }
    return { nextIndex: currentIndex + 1, shouldPause: false };
}

/** Calculates the next song based on repeat mode and current position. */
export function calculateNextSong(
    currentIndex: number,
    queueItems: QueueSong[],
    repeat: PlayerRepeat,
): QueueSong | undefined {
    if (queueItems.length === 0) {
        return undefined;
    }

    if (repeat === PlayerRepeat.ONE) {
        return queueItems[currentIndex];
    }

    if (repeat === PlayerRepeat.ALL) {
        const isLastTrack = currentIndex === queueItems.length - 1;
        return isLastTrack ? queueItems[0] : queueItems[currentIndex + 1];
    }

    return queueItems[currentIndex + 1];
}

/**
 * Puts the queue back into the order it held before shuffle was switched on.
 *
 * The snapshot is taken once, when shuffle goes on, and never maintained — so it
 * can be stale in both directions. Tracks removed since are dropped, and tracks
 * queued since (which the snapshot has never heard of) are put back beside the
 * track they currently follow, so a "play next" done while shuffled does not get
 * flung to the end of the queue when shuffle goes off.
 */
export function restoreQueueOrder(current: string[], snapshot: null | string[]): string[] {
    if (!snapshot) {
        return [...current];
    }

    const inCurrent = new Set(current);
    const restored = snapshot.filter((id) => inCurrent.has(id));
    const placed = new Set(restored);

    current.forEach((id, index) => {
        if (placed.has(id)) {
            return;
        }

        let insertAt = 0;
        for (let before = index - 1; before >= 0; before--) {
            const anchor = restored.indexOf(current[before]);
            if (anchor !== -1) {
                insertAt = anchor + 1;
                break;
            }
        }

        restored.splice(insertAt, 0, id);
        placed.add(id);
    });

    return restored;
}

/**
 * Shuffles the queue itself rather than shuffling how it is read back.
 *
 * The playing track moves to the head so it keeps playing uninterrupted and
 * everything else lands behind it — the list the user is looking at is the order
 * that will actually play. Callers set `player.index` to 0 alongside this.
 */
export function shuffleQueueAroundIndex(queue: string[], currentIndex: number): string[] {
    if (queue.length <= 1) {
        return [...queue];
    }

    if (currentIndex < 0 || currentIndex >= queue.length) {
        return shuffleInPlace([...queue]);
    }

    const current = queue[currentIndex];
    const rest = queue.filter((_, index) => index !== currentIndex);

    return [current, ...shuffleInPlace(rest)];
}
