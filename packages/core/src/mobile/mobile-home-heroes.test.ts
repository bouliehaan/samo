import { describe, expect, it, vi } from 'vitest';

import { type SamoFetch } from '../server/server-http';
import { type SamoHomeHero } from '../server/server-samo-heroes';
import { testServerAuthentication } from '../test-fixtures';
import { loadMobileHomeHeroesForServers } from './mobile-home';
import { homeAnnouncementKey } from './mobile-home-announcements';

const auth = testServerAuthentication();
const candidate = (type: SamoHomeHero['target']['type'], id: string = type): SamoHomeHero => ({
    action: type === 'playlist' ? 'shuffle' : 'play',
    eyebrow: 'For this visit',
    id: `hero:${id}`,
    kind: type === 'audiobook' ? 'resume' : 'library',
    score: 0.8,
    sleeves: [{ url: '/api/v1/media/images/art/image' }],
    target: { id, type },
    title: 'Editorial title',
});
const createFetch = (heroes: SamoHomeHero[], targets: Record<string, unknown>) =>
    vi.fn<SamoFetch>(async (url) => {
        const path = new URL(url).pathname;
        if (path.endsWith('/home/heroes'))
            return { json: async () => ({ items: heroes }), ok: true, status: 200 };
        if (Object.hasOwn(targets, path))
            return { json: async () => targets[path], ok: true, status: 200 };
        return { json: async () => ({ error: 'missing' }), ok: false, status: 404 };
    });

describe('mobile hero resolution', () => {
    it('filters before resolving targets so recommendations and seen events cannot hide a new drop', async () => {
        const drop = {
            ...candidate('playlist', 'explo'),
            freshAt: new Date().toISOString(),
            kind: 'explore' as const,
        };
        const old = { ...drop, freshAt: new Date(Date.now() - 60_000).toISOString() };
        const fetch = createFetch([candidate('album'), old, drop], {
            '/api/v1/music/playlists/explo': { id: 'explo', name: 'Explo', trackCount: 3 },
        });
        const items = await loadMobileHomeHeroesForServers({
            announcements: { seen: [homeAnnouncementKey(old)] },
            authentication: auth,
            fetch,
        });
        expect(items[0]?.hero?.freshAt).toBe(drop.freshAt);
        expect(fetch.mock.calls.some(([url]) => url.includes('/music/albums/'))).toBe(false);
        expect(fetch.mock.calls.filter(([url]) => url.includes('/music/playlists/'))).toHaveLength(
            1,
        );
    });

    it.each([
        [{ favorite: true }, {}, true],
        [{ starred: true }, {}, true],
        [{ playCount: 3 }, {}, true],
        [{}, {}, false],
        [{ favorite: true }, { playCount: 1 }, false],
        [{ favorite: true }, { progressSeconds: 1 }, false],
        [{ favorite: true }, { completed: true }, false],
        [{ favorite: true }, { lastPlayedAt: '2026-01-01' }, false],
    ])(
        'only announces unheard episodes of favorite or regularly played shows (%j, %j)',
        async (showProgress, progress, eligible) => {
            const freshAt = new Date().toISOString();
            const hero = { ...candidate('episode'), freshAt, kind: 'episode' as const };
            const fetch = createFetch([hero], {
                '/api/v1/podcasts/episodes/episode': {
                    id: 'episode',
                    podcastId: 'show',
                    progress,
                    publishedAt: freshAt,
                    title: 'New',
                },
                '/api/v1/podcasts/shows/show': { id: 'show', progress: showProgress },
            });
            const items = await loadMobileHomeHeroesForServers({
                announcements: { seen: [] },
                authentication: auth,
                fetch,
            });
            expect(items).toHaveLength(eligible ? 1 : 0);
        },
    );

    it('does not mistake a newly indexed old episode for a new release', async () => {
        const hero = {
            ...candidate('episode'),
            freshAt: new Date().toISOString(),
            kind: 'episode' as const,
        };
        const fetch = createFetch([hero], {
            '/api/v1/podcasts/episodes/episode': {
                id: 'episode',
                podcastId: 'show',
                publishedAt: '2001-01-01',
                title: 'Old',
            },
            '/api/v1/podcasts/shows/show': { id: 'show', progress: { favorite: true } },
        });
        expect(
            await loadMobileHomeHeroesForServers({
                announcements: { seen: [] },
                authentication: auth,
                fetch,
            }),
        ).toEqual([]);
    });
    it.each([
        ['album', '/api/v1/music/albums/album', { id: 'album', title: 'Catalog title' }],
        [
            'playlist',
            '/api/v1/music/playlists/playlist',
            { id: 'playlist', name: 'Catalog title', trackCount: 3 },
        ],
        [
            'audiobook',
            '/api/v1/audiobooks/audiobook',
            { book: { title: 'Catalog title' }, durationSeconds: 600, id: 'audiobook' },
        ],
        [
            'episode',
            '/api/v1/podcasts/episodes/episode',
            { durationSeconds: 600, id: 'episode', podcastId: 'show', title: 'Catalog title' },
        ],
    ] as const)('resolves %s through its normal home-item path', async (type, path, target) => {
        const fetch = createFetch([candidate(type)], { [path]: target });
        const items = await loadMobileHomeHeroesForServers({
            authentication: auth,
            fetch,
            seen: ['playlist:last'],
            session: 'visit',
        });
        expect(items).toHaveLength(1);
        expect(items[0]!.hero).toMatchObject({
            target: { id: type, type },
            title: 'Editorial title',
        });
        const request = fetch.mock.calls.find(([url]) => url.includes('/home/heroes'))![0];
        expect(new URL(request).searchParams.get('session')).toBe('visit');
        expect(JSON.parse(new URL(request).searchParams.get('seen')!)).toEqual(['playlist:last']);
    });

    it('skips an unreadable lead and stops fetching after the first playable target', async () => {
        const fetch = createFetch(
            [candidate('album', 'gone'), candidate('album', 'good'), candidate('album', 'unused')],
            {
                '/api/v1/music/albums/good': { id: 'good', title: 'Good' },
            },
        );
        const items = await loadMobileHomeHeroesForServers({ authentication: auth, fetch });
        expect(items[0]!.id).toBe('good');
        expect(fetch.mock.calls.some(([url]) => url.includes('/unused'))).toBe(false);
    });

    it('distinguishes a successful empty ranking from an unavailable server', async () => {
        await expect(
            loadMobileHomeHeroesForServers({ authentication: auth, fetch: createFetch([], {}) }),
        ).resolves.toEqual([]);
        await expect(
            loadMobileHomeHeroesForServers({
                authentication: auth,
                fetch: async () => {
                    throw new Error('offline');
                },
            }),
        ).rejects.toThrow('offline');
    });
});
