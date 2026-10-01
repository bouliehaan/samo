import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeAnnouncementKey, type MobileHomeItem } from '@samo/core/mobile';
import { testServerAuthentication } from '../../../../packages/core/src/test-fixtures';

const mocks = vi.hoisted(() => ({ load: vi.fn(), read: vi.fn(), write: vi.fn() }));
vi.mock('@samo/core/mobile', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@samo/core/mobile')>()),
    loadMobileHomeHeroesForServers: mocks.load,
}));
vi.mock('./fs-storage', () => ({ fsGetItem: mocks.read, fsSetItem: mocks.write }));

import {
    beginHomeHeroVisit,
    loadHomeHeroRecommendation,
    recordHomeHeroShown,
} from './home-hero-visit';

const auth = testServerAuthentication({ serverId: 'server', userId: 'listener' });
const item = {
    id: 'mix',
    hero: {
        kind: 'explore',
        freshAt: '2026-09-25T00:00:00Z',
        target: { type: 'playlist', id: 'mix' },
    },
} as MobileHomeItem;

beforeEach(() => {
    vi.resetAllMocks();
    beginHomeHeroVisit();
    mocks.read.mockResolvedValue('["album:old"]');
    mocks.write.mockResolvedValue(undefined);
    mocks.load.mockResolvedValue([item]);
});

describe('hero visits', () => {
    it('keeps polling stable and records only a card actually shown', async () => {
        await loadHomeHeroRecommendation(auth);
        const first = mocks.load.mock.calls[0]![0];
        expect(mocks.write).not.toHaveBeenCalled();
        await recordHomeHeroShown(auth, item);
        await loadHomeHeroRecommendation(auth);
        expect(mocks.load.mock.calls[1]![0]).toEqual(first);
        expect(first.announcements.seen).toEqual(['album:old']);
        expect(JSON.parse(mocks.write.mock.calls[0]![1])).toEqual([
            homeAnnouncementKey(item.hero!),
            'album:old',
        ]);
    });

    it('reads previous picks on a new visit and changes the visit seed', async () => {
        await loadHomeHeroRecommendation(auth);
        const first = mocks.load.mock.calls[0]![0];
        await recordHomeHeroShown(auth, item);
        mocks.read.mockResolvedValue(mocks.write.mock.calls[0]![1]);
        beginHomeHeroVisit();
        await loadHomeHeroRecommendation(auth);
        const next = mocks.load.mock.calls[1]![0];
        expect(next.session).not.toBe(first.session);
        expect(next.announcements.seen[0]).toBe(homeAnnouncementKey(item.hero!));
    });

    it('scopes history by server and listener', async () => {
        await loadHomeHeroRecommendation(auth);
        await loadHomeHeroRecommendation({ ...auth, userId: 'another-listener' });
        expect(mocks.read.mock.calls[0]![0]).not.toBe(mocks.read.mock.calls[1]![0]);
    });

    it('rejects a response belonging to a previous visit', async () => {
        let resolve!: (value: MobileHomeItem[]) => void;
        mocks.load.mockImplementation(
            () =>
                new Promise<MobileHomeItem[]>((done) => {
                    resolve = done;
                }),
        );
        const pending = loadHomeHeroRecommendation(auth);
        await vi.waitFor(() => expect(mocks.load).toHaveBeenCalled());
        beginHomeHeroVisit();
        resolve([item]);
        await expect(pending).rejects.toThrow('Hero visit changed');
    });

    it('propagates failures instead of recording an empty successful visit', async () => {
        mocks.load.mockRejectedValue(new Error('offline'));
        await expect(loadHomeHeroRecommendation(auth)).rejects.toThrow('offline');
        expect(mocks.write).not.toHaveBeenCalled();
    });
});
