import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    type AbsPlaybackProgressSlice,
    createAbsPlaybackSyncHandle,
} from '/@/renderer/store/abs-playback-sync';
import { LongFormLibraryItem } from '/@/shared/api/long-form-types';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

const enqueued = vi.hoisted(() => [] as Array<Record<string, any>>);

vi.mock('/@/renderer/store/progress-write-queue', () => ({
    enqueueProgressWrite: (entry: Record<string, any>) => enqueued.push(entry),
}));

vi.mock('/@/renderer/store/playback-owner.store', () => ({
    usePlaybackOwnerStore: { getState: () => ({ source: null }) },
}));

vi.mock('/@/renderer/store/player.store', () => ({
    subscribePlayerStatus: () => () => {},
    usePlayerStoreBase: { getState: () => ({ player: { status: 'paused' } }) },
}));

const book = { id: 'book-1' } as LongFormLibraryItem;
const server = { credential: 'cred', url: 'https://samo' } as ServerListItemWithCredential;

const slice = (over: Partial<AbsPlaybackProgressSlice> = {}): AbsPlaybackProgressSlice => ({
    duration: 144_000,
    episode: null,
    hasStream: true,
    item: book,
    position: 3600,
    requiresEpisode: false,
    server,
    sessionId: null,
    ...over,
});

describe('abs progress sync', () => {
    beforeEach(() => {
        enqueued.length = 0;
    });

    it('writes the book position while a stream is loaded', () => {
        const sync = createAbsPlaybackSyncHandle('test', () => slice());
        sync.syncProgress({ force: true, reason: 'seek' });

        expect(enqueued).toHaveLength(1);
        expect(enqueued[0].kind).toBe('audiobook');
        expect(enqueued[0].targetId).toBe('book-1');
        expect(enqueued[0].patch.progressSeconds).toBe(3600);
    });

    it('refuses to write a session that never opened a stream', () => {
        // Launch restores the last session's item + position from THIS machine's
        // memory with no contentUrl. Playing something else then fires a
        // close-flush, which used to PATCH that stale local position over the
        // newer one another device had already written.
        const sync = createAbsPlaybackSyncHandle('test', () => slice({ hasStream: false }));
        sync.syncProgress({ closeSession: true, force: true, reason: 'close' });

        expect(enqueued).toHaveLength(0);
    });

    it('does not flag a mid-book position as completed', () => {
        const sync = createAbsPlaybackSyncHandle('test', () => slice());
        sync.syncProgress({ force: true, reason: 'pause' });

        expect(enqueued[0].patch.completed).toBe(false);
    });
});
