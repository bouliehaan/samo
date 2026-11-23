import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    playHistoryKey,
    RecentItem,
    recordRecentItem,
    usePlayHistoryStore,
} from '/@/renderer/store/play-history.store';

// The real one reaches the server; Recents merging never needs it.
vi.mock('/@/renderer/services/samo-playlist-playback', () => ({
    touchSamoPlaylistLastPlayed: () => {},
}));

const entry = (
    itemId: string,
    selectedAt: number,
    overrides: Partial<RecentItem> = {},
): RecentItem => {
    const mediaType = overrides.mediaType ?? 'album';
    const serverId = overrides.serverId ?? 'hosted-user-1';
    return {
        artwork: { fallbackIconKey: 'album', kind: 'icon' },
        itemId,
        key: playHistoryKey({ itemId, serverId, type: mediaType }),
        mediaType,
        selectedAt,
        serverId,
        subtitle: 'Album',
        title: itemId,
        ...overrides,
    };
};

const items = () =>
    usePlayHistoryStore
        .getState()
        .items.map((item) => [item.mediaType, item.itemId, item.selectedAt, item.title]);

describe('play history: merging the server record', () => {
    beforeEach(() => {
        usePlayHistoryStore.setState({ clearedAt: 0, dismissed: {}, items: [] });
    });

    it('fills an empty list from the server, newest first', () => {
        usePlayHistoryStore.getState().actions.mergeFromServer([entry('a', 100), entry('b', 300)]);
        expect(items()).toEqual([
            ['album', 'b', 300, 'b'],
            ['album', 'a', 100, 'a'],
        ]);
    });

    it('keeps the local entry and only moves it up for a later play', () => {
        recordRecentItem({ ...entry('a', 200, { title: 'Local A' }) });
        recordRecentItem({ ...entry('b', 500, { title: 'Local B' }) });

        usePlayHistoryStore
            .getState()
            .actions.mergeFromServer([
                entry('a', 900, { title: 'Server A' }),
                entry('b', 100, { title: 'Server B' }),
            ]);

        expect(items()).toEqual([
            ['album', 'a', 900, 'Local A'],
            ['album', 'b', 500, 'Local B'],
        ]);
    });

    it('matches across a drifted server id', () => {
        recordRecentItem({ ...entry('a', 200, { serverId: 'old-id' }) });
        usePlayHistoryStore.getState().actions.mergeFromServer([entry('a', 400)]);
        expect(usePlayHistoryStore.getState().items).toHaveLength(1);
    });

    it('does not bring back what was removed, until it is played again', () => {
        vi.useFakeTimers();
        vi.setSystemTime(1_000);
        recordRecentItem({ ...entry('a', 500) });
        const { key } = usePlayHistoryStore.getState().items[0];
        usePlayHistoryStore.getState().actions.remove(key);

        usePlayHistoryStore.getState().actions.mergeFromServer([entry('a', 500)]);
        expect(items()).toEqual([]);

        usePlayHistoryStore.getState().actions.mergeFromServer([entry('a', 2_000)]);
        expect(items()).toEqual([['album', 'a', 2_000, 'a']]);
        vi.useRealTimers();
    });

    it('does not bring back anything played before a clear', () => {
        vi.useFakeTimers();
        vi.setSystemTime(1_000);
        recordRecentItem({ ...entry('a', 500) });
        usePlayHistoryStore.getState().actions.clear();

        usePlayHistoryStore
            .getState()
            .actions.mergeFromServer([entry('a', 500), entry('b', 1_500)]);
        expect(items()).toEqual([['album', 'b', 1_500, 'b']]);
        vi.useRealTimers();
    });

    it('leaves the state untouched when nothing changes', () => {
        recordRecentItem({ ...entry('a', 500) });
        const before = usePlayHistoryStore.getState().items;
        usePlayHistoryStore.getState().actions.mergeFromServer([entry('a', 500)]);
        expect(usePlayHistoryStore.getState().items).toBe(before);
    });
});
