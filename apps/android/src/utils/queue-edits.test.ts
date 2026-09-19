import { describe, expect, it } from 'vitest';

import { type AndroidPlaybackQueue } from '../state/playback-queue-store';
import {
    findPlayNextInsertIndex,
    insertQueueItems,
    moveQueueUpNextItem,
    removeQueueItemAt,
} from './queue-edits';

type QueueItem = AndroidPlaybackQueue['items'][number];

const track = (id: string): QueueItem =>
    ({ id, source: 'music', title: id }) as unknown as QueueItem;

/** One file of a multi-file samo audiobook, streamed (`:file:`) or downloaded (`:offline:`). */
const bookFile = (bookId: string, file: string, form: 'file' | 'offline' = 'file'): QueueItem =>
    ({
        id: `samo:https://s.example:audiobook:${bookId}:${form}:${file}`,
        source: 'audiobook',
        title: `${bookId}/${file}`,
    }) as unknown as QueueItem;

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

describe('findPlayNextInsertIndex', () => {
    it('is the slot right after the now-playing item', () => {
        expect(findPlayNextInsertIndex(makeQueue(['a', 'b', 'c'], 1))).toBe(2);
        expect(findPlayNextInsertIndex(makeQueue(['a', 'b', 'c'], 0))).toBe(1);
    });

    it('is the end when the now-playing item is last', () => {
        expect(findPlayNextInsertIndex(makeQueue(['a', 'b', 'c'], 2))).toBe(3);
    });

    it('skips past the rest of the multi-file audiobook that is playing', () => {
        // Playing file 2 of a 4-file book, a song before and after the book.
        const queue: AndroidPlaybackQueue = {
            index: 2,
            items: [
                track('a'),
                bookFile('book', 'f1'),
                bookFile('book', 'f2'),
                bookFile('book', 'f3'),
                bookFile('book', 'f4'),
                track('z'),
            ],
        };
        expect(findPlayNextInsertIndex(queue)).toBe(5);
    });

    it('treats downloaded and streamed files of one book as the same book', () => {
        const queue: AndroidPlaybackQueue = {
            index: 0,
            items: [bookFile('book', 'f1', 'offline'), bookFile('book', 'f2', 'offline'), track('z')],
        };
        expect(findPlayNextInsertIndex(queue)).toBe(2);
    });

    it('stops at a different book', () => {
        const queue: AndroidPlaybackQueue = {
            index: 0,
            items: [bookFile('one', 'f1'), bookFile('one', 'f2'), bookFile('two', 'f1')],
        };
        expect(findPlayNextInsertIndex(queue)).toBe(2);
    });

    it('only follows the contiguous run of the playing book', () => {
        // The user dragged a song into the middle of the book: the run ends there.
        const queue: AndroidPlaybackQueue = {
            index: 0,
            items: [bookFile('one', 'f1'), track('a'), bookFile('one', 'f2')],
        };
        expect(findPlayNextInsertIndex(queue)).toBe(1);
    });

    it('falls back to the end for an out-of-range index', () => {
        expect(findPlayNextInsertIndex(makeQueue(['a', 'b'], -1))).toBe(2);
        expect(findPlayNextInsertIndex(makeQueue(['a', 'b'], 7))).toBe(2);
    });
});

describe('insertQueueItems', () => {
    it('inserts a block right after the now-playing item for next', () => {
        const next = insertQueueItems(makeQueue(['a', 'b', 'c'], 1), [track('x'), track('y')], 'next');
        expect(ids(next)).toEqual(['a', 'b', 'x', 'y', 'c']);
        expect(next.index).toBe(1);
    });

    it('appends a block for end', () => {
        const next = insertQueueItems(makeQueue(['a', 'b', 'c'], 1), [track('x'), track('y')], 'end');
        expect(ids(next)).toEqual(['a', 'b', 'c', 'x', 'y']);
        expect(next.index).toBe(1);
    });

    it('keeps a repeated Play Next in tap order (newest lands right after the current item)', () => {
        let queue = makeQueue(['a', 'b', 'c'], 0);
        queue = insertQueueItems(queue, [track('x')], 'next');
        queue = insertQueueItems(queue, [track('y')], 'next');
        expect(ids(queue)).toEqual(['a', 'y', 'x', 'b', 'c']);
    });

    it('lets the now-playing track be queued again right after itself', () => {
        const next = insertQueueItems(makeQueue(['a', 'b', 'c'], 1), [track('b')], 'next');
        expect(ids(next)).toEqual(['a', 'b', 'b', 'c']);
        expect(next.index).toBe(1);
    });

    it('never splits the multi-file audiobook that is playing', () => {
        const queue: AndroidPlaybackQueue = {
            index: 1,
            items: [bookFile('book', 'f1'), bookFile('book', 'f2'), bookFile('book', 'f3'), track('z')],
        };
        const next = insertQueueItems(queue, [track('x')], 'next');
        expect(next.items.map((item) => item.title)).toEqual([
            'book/f1',
            'book/f2',
            'book/f3',
            'x',
            'z',
        ]);
        expect(next.index).toBe(1);
    });

    it('returns the same queue for an empty block', () => {
        const queue = makeQueue(['a', 'b'], 0);
        expect(insertQueueItems(queue, [], 'next')).toBe(queue);
    });

    it('preserves queue metadata fields', () => {
        const next = insertQueueItems(
            makeQueue(['a', 'b'], 0, {
                editablePlaylist: { id: 'pl-1', sourceId: 's', title: 'Mine', trackIds: ['a', 'b'] },
                isExploPlaylist: false,
                omitTrackRecentlyPlayed: true,
                samoPlaylistId: 'pl-1',
            }),
            [track('x')],
            'next',
        );
        expect(next.samoPlaylistId).toBe('pl-1');
        expect(next.omitTrackRecentlyPlayed).toBe(true);
        expect(next.editablePlaylist?.trackIds).toEqual(['a', 'b']);
    });
});
