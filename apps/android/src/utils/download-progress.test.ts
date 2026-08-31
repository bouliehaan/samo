import { describe, expect, it } from 'vitest';

import { type DownloadEntry, type DownloadStatus } from '../services/download-manager';

import {
    DOWNLOAD_PROGRESS_START,
    pickLatestEntryPerTrack,
    summarizeDownloadEntries,
} from './download-progress';

const entry = (
    over: Partial<DownloadEntry> & { id: string; status: DownloadStatus },
): DownloadEntry => ({
    collection: {
        id: 'album-1',
        sourceId: 'samo:https://host',
        title: 'Album',
        type: 'album',
    },
    enqueuedAt: 1,
    sourceUrl: 'https://host/stream',
    title: 'Track',
    trackId: over.id,
    ...over,
});

describe('summarizeDownloadEntries', () => {
    it('says nothing at all when there is nothing to say', () => {
        expect(summarizeDownloadEntries([])).toEqual({
            active: false,
            completed: false,
            progress: 0,
        });
    });

    it('opens at the starting sliver the moment a download is asked for', () => {
        expect(summarizeDownloadEntries([], { requested: true })).toEqual({
            active: true,
            completed: false,
            progress: DOWNLOAD_PROGRESS_START,
        });
    });

    it('averages the tracks it has', () => {
        const summary = summarizeDownloadEntries([
            entry({ id: 'a', status: 'completed' }),
            entry({ id: 'b', progress: 0.5, status: 'downloading' }),
            entry({ id: 'c', status: 'queued' }),
            entry({ id: 'd', status: 'queued' }),
        ]);

        expect(summary.completed).toBe(false);
        expect(summary.progress).toBeCloseTo((1 + 0.5 + 0.06 + 0.06) / 4);
    });

    it('divides by the known track count, not by the entries written so far', () => {
        // Re-downloading a ten-track album that is already half on disk. Entries
        // are written one at a time, so the registry momentarily holds one
        // finished track and one fresh queue — divided by what it holds that is
        // 53%, and the arc would then walk backwards as the rest arrive.
        const entries = [
            entry({ id: 'a', status: 'completed' }),
            entry({ id: 'b', status: 'queued' }),
        ];

        expect(summarizeDownloadEntries(entries).progress).toBeCloseTo(0.53);
        expect(summarizeDownloadEntries(entries, { expectedCount: 10 }).progress).toBeCloseTo(
            0.106,
        );
    });

    it('stays quiet on a part-downloaded collection that is not doing anything', () => {
        const summary = summarizeDownloadEntries([entry({ id: 'a', status: 'completed' })], {
            expectedCount: 10,
        });

        expect(summary).toEqual({ active: false, completed: false, progress: 0 });
    });

    it('never shrinks below the starting sliver while work is in flight', () => {
        // Three of twelve tracks enqueued, none transferred yet: the raw average
        // is 0.015, which is less than the arc already showed.
        const summary = summarizeDownloadEntries(
            [
                entry({ id: 'a', status: 'queued' }),
                entry({ id: 'b', status: 'queued' }),
                entry({ id: 'c', status: 'queued' }),
            ],
            { expectedCount: 12 },
        );

        expect(summary.progress).toBe(DOWNLOAD_PROGRESS_START);
    });

    it('is complete only when every expected track landed', () => {
        const entries = [
            entry({ id: 'a', status: 'completed' }),
            entry({ id: 'b', status: 'completed' }),
        ];

        expect(summarizeDownloadEntries(entries)).toEqual({
            active: true,
            completed: true,
            progress: 1,
        });
        expect(summarizeDownloadEntries(entries, { expectedCount: 3 }).completed).toBe(false);
    });

    it('goes quiet on a part-failed collection so no half arc is left behind', () => {
        const summary = summarizeDownloadEntries([
            entry({ id: 'a', status: 'completed' }),
            entry({ id: 'b', status: 'failed' }),
        ]);

        expect(summary).toEqual({ active: false, completed: false, progress: 0 });
    });

    it('ignores cancelled work when deciding whether anything is running', () => {
        const summary = summarizeDownloadEntries([entry({ id: 'a', status: 'canceled' })]);

        expect(summary.active).toBe(false);
    });
});

describe('pickLatestEntryPerTrack', () => {
    it('keeps the newest enqueue for a retried track', () => {
        const latest = pickLatestEntryPerTrack([
            entry({ enqueuedAt: 1, id: 'first', status: 'failed', trackId: 'track-1' }),
            entry({ enqueuedAt: 2, id: 'second', status: 'downloading', trackId: 'track-1' }),
        ]);

        expect(latest.get('track-1')?.id).toBe('second');
    });
});
