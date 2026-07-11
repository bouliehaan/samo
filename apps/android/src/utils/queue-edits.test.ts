import { describe, expect, it } from 'vitest';

import { type AndroidPlaybackQueue } from '../state/playback-queue-store';
import { moveQueueUpNextItem, removeQueueItemAt } from './queue-edits';

type QueueItem = AndroidPlaybackQueue['items'][number];

const track = (id: string): QueueItem => ({ id, title: id } as unknown as QueueItem);

const makeQueue = (
    ids: string[],
    index: number,
    extra?: Partial<AndroidPlaybackQueue>,
): AndroidPlaybackQueue => ({
    index,
    items: ids.map(track),
    ...extra,
});

const ids = (queue: AndroidPlaybackQueue | null) => queue?.items.map((item) => item.id);

describe('removeQueueItemAt', () => {
    it('removes an up-next item without shifting the current index', () => {
        const next = removeQueueItemAt(makeQueue(['a', 'b', 'c', 'd'], 1), 2);
        expect(ids(next)).toEqual(['a', 'b', 'd']);
        expect(next?.index).toBe(1);
    });

    it('removes a history item and shifts the current index down', () => {
        const next = removeQueueItemAt(makeQueue(['a', 'b', 'c', 'd'], 2), 0);
        expect(ids(next)).toEqual(['b', 'c', 'd']);
        expect(next?.index).toBe(1);
    });

    it('refuses to remove the currently-playing item', () => {
        expect(removeQueueItemAt(makeQueue(['a', 'b', 'c'], 1), 1)).toBeNull();
    });

    it('refuses out-of-range and non-integer indexes', () => {
        const queue = makeQueue(['a', 'b'], 0);
        expect(removeQueueItemAt(queue, -1)).toBeNull();
        expect(removeQueueItemAt(queue, 2)).toBeNull();
        expect(removeQueueItemAt(queue, 0.5)).toBeNull();
        expect(removeQueueItemAt(null, 0)).toBeNull();
    });

    it('refuses to empty the queue', () => {
        expect(removeQueueItemAt(makeQueue(['only'], 0), 0)).toBeNull();
    });

    it('preserves queue metadata fields', () => {
        const next = removeQueueItemAt(
            makeQueue(['a', 'b', 'c'], 0, {
                omitTrackRecentlyPlayed: true,
                samoPlaylistId: 'pl-1',
            }),
            2,
        );
        expect(next?.omitTrackRecentlyPlayed).toBe(true);
        expect(next?.samoPlaylistId).toBe('pl-1');
    });
});

describe('moveQueueUpNextItem', () => {
    it('moves an up-next item later', () => {
        const next = moveQueueUpNextItem(makeQueue(['a', 'b', 'c', 'd', 'e'], 1), 2, 4);
        expect(ids(next)).toEqual(['a', 'b', 'd', 'e', 'c']);
        expect(next?.index).toBe(1);
    });

    it('moves an up-next item earlier (but never above the now-playing row)', () => {
        const next = moveQueueUpNextItem(makeQueue(['a', 'b', 'c', 'd', 'e'], 1), 4, 2);
        expect(ids(next)).toEqual(['a', 'b', 'e', 'c', 'd']);
        expect(next?.index).toBe(1);
    });

    it('clamps the target into the up-next range', () => {
        // Target 0 would cross above the playing row — clamps to firstUpNext.
        const next = moveQueueUpNextItem(makeQueue(['a', 'b', 'c', 'd'], 1), 3, 0);
        expect(ids(next)).toEqual(['a', 'b', 'd', 'c']);
        // Target past the end clamps to the last slot.
        const next2 = moveQueueUpNextItem(makeQueue(['a', 'b', 'c', 'd'], 1), 2, 99);
        expect(ids(next2)).toEqual(['a', 'b', 'd', 'c']);
    });

    it('refuses history and now-playing sources', () => {
        const queue = makeQueue(['a', 'b', 'c', 'd'], 2);
        expect(moveQueueUpNextItem(queue, 0, 3)).toBeNull();
        expect(moveQueueUpNextItem(queue, 2, 3)).toBeNull();
    });

    it('returns null for a no-op move', () => {
        expect(moveQueueUpNextItem(makeQueue(['a', 'b', 'c'], 0), 2, 2)).toBeNull();
    });

    it('preserves queue metadata fields', () => {
        const next = moveQueueUpNextItem(
            makeQueue(['a', 'b', 'c'], 0, { samoPlaylistId: 'pl-9' }),
            1,
            2,
        );
        expect(next?.samoPlaylistId).toBe('pl-9');
    });
});
