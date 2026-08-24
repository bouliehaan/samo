import { describe, expect, it } from 'vitest';

import { type SamoFetch } from '../server/server-http';
import { testServerAuthentication } from '../test-fixtures';
import { addMobileTracksToPlaylist } from './mobile-media-detail';
import { removeMobileTracksFromPlaylist } from './mobile-playlist-edit';

const auth = testServerAuthentication({ url: 'https://music.example' });

const jsonResponse = (payload: unknown) => ({
    json: () => Promise.resolve(payload),
    ok: true,
    status: 200,
});

interface Recorded {
    /** Every `trackIds` list PATCHed back to the server, in order. */
    patches: string[][];
    requestedOffsets: number[];
}

/**
 * A server holding `trackIds` in playlist order, paginated exactly like Samo's:
 * `GET /tracks` answers a `{ items, total }` window, `PATCH` replaces the list.
 */
const buildServer = (
    trackIds: string[],
    recorded: Recorded,
    options: { omitTotal?: boolean } = {},
): SamoFetch => {
    return (url, init) => {
        const parsed = new URL(url);

        if (init?.method === 'PATCH') {
            const body = JSON.parse(String(init.body ?? '{}')) as { trackIds?: string[] };
            recorded.patches.push(body.trackIds ?? []);
            return Promise.resolve(jsonResponse({ id: 'pl1', name: 'Road Trip' }));
        }

        if (parsed.pathname.endsWith('/tracks')) {
            const offset = Number(parsed.searchParams.get('offset') ?? '0');
            const limit = Number(parsed.searchParams.get('limit') ?? '500');
            recorded.requestedOffsets.push(offset);
            const items = trackIds.slice(offset, offset + limit).map((id) => ({ id, title: id }));
            return Promise.resolve(
                jsonResponse(options.omitTotal ? { items } : { items, total: trackIds.length }),
            );
        }

        return Promise.resolve(jsonResponse({}));
    };
};

const recorder = (): Recorded => ({ patches: [], requestedOffsets: [] });

const idsOfLength = (count: number) =>
    Array.from({ length: count }, (_, index) => `track_${index}`);

describe('removeMobileTracksFromPlaylist', () => {
    it('writes back everything except the removed track, in order', async () => {
        const recorded = recorder();

        await removeMobileTracksFromPlaylist({
            authentication: auth,
            fetch: buildServer(['a', 'b', 'c'], recorded),
            playlistId: 'pl1',
            songIds: ['b'],
        });

        expect(recorded.patches).toEqual([['a', 'c']]);
    });

    it('reads the CURRENT membership rather than trusting a caller snapshot', async () => {
        // The phone's mirror is only as fresh as the last sync. If removal
        // subtracted from a stale local list, a track added from the desktop in
        // the meantime would be silently deleted by the write-back. `d` here is
        // what the server knows and the caller does not.
        const recorded = recorder();

        await removeMobileTracksFromPlaylist({
            authentication: auth,
            fetch: buildServer(['a', 'b', 'c', 'd'], recorded),
            playlistId: 'pl1',
            songIds: ['b'],
        });

        expect(recorded.patches).toEqual([['a', 'c', 'd']]);
    });

    it('keeps every track past the first page of a >500-track playlist', async () => {
        // The write-back is the whole list, so a single limit=500 read is not a
        // truncated VIEW of a big playlist — it is a deletion of everything
        // after track 500.
        const recorded = recorder();
        const ids = idsOfLength(1234);

        await removeMobileTracksFromPlaylist({
            authentication: auth,
            fetch: buildServer(ids, recorded),
            playlistId: 'pl1',
            songIds: ['track_700'],
        });

        expect(recorded.requestedOffsets).toEqual([0, 500, 1000]);
        expect(recorded.patches[0]).toHaveLength(1233);
        expect(recorded.patches[0]).not.toContain('track_700');
        expect(recorded.patches[0]?.[1232]).toBe('track_1233');
    });

    it('paginates a server that answers without a total', async () => {
        const recorded = recorder();

        await removeMobileTracksFromPlaylist({
            authentication: auth,
            fetch: buildServer(idsOfLength(1234), recorded, { omitTotal: true }),
            playlistId: 'pl1',
            songIds: ['track_0'],
        });

        expect(recorded.patches[0]).toHaveLength(1233);
    });

    it('does not write at all when the track is already gone', async () => {
        // Removing something twice (a retry, or a track pulled from another
        // device) is the state the user asked for, not an error.
        const recorded = recorder();

        await removeMobileTracksFromPlaylist({
            authentication: auth,
            fetch: buildServer(['a', 'c'], recorded),
            playlistId: 'pl1',
            songIds: ['b'],
        });

        expect(recorded.patches).toEqual([]);
    });

    it('rejects an empty removal instead of PATCHing the list back unchanged', async () => {
        const recorded = recorder();

        await expect(
            removeMobileTracksFromPlaylist({
                authentication: auth,
                fetch: buildServer(['a'], recorded),
                playlistId: 'pl1',
                songIds: [],
            }),
        ).rejects.toThrow(/No tracks were selected/);
        expect(recorded.patches).toEqual([]);
    });
});

describe('addMobileTracksToPlaylist', () => {
    it('keeps the tail of a >500-track playlist it is appending to', async () => {
        // Same wholesale-replace hazard from the other direction: reading one
        // page and PATCHing `[...page, newTrack]` back deleted tracks 500+.
        const recorded = recorder();

        await addMobileTracksToPlaylist({
            authentication: auth,
            fetch: buildServer(idsOfLength(600), recorded),
            playlistId: 'pl1',
            songIds: ['newcomer'],
        });

        expect(recorded.patches[0]).toHaveLength(601);
        expect(recorded.patches[0]?.[600]).toBe('newcomer');
        expect(recorded.patches[0]).toContain('track_599');
    });

    it('does not re-append a track the playlist already holds', async () => {
        const recorded = recorder();

        await addMobileTracksToPlaylist({
            authentication: auth,
            fetch: buildServer(['a', 'b'], recorded),
            playlistId: 'pl1',
            songIds: ['b'],
        });

        expect(recorded.patches).toEqual([['a', 'b']]);
    });
});
