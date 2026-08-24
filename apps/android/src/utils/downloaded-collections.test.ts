import { describe, expect, it } from 'vitest';

import { type DownloadEntry, type DownloadStatus } from '../services/download-manager';

import { pickDownloadedPlaylistCollections } from './downloaded-collections';

const entry = (
    over: Omit<Partial<DownloadEntry>, 'collection'> &
        Pick<DownloadEntry, 'id'> & { collection?: Partial<DownloadEntry['collection']> },
): DownloadEntry => ({
    ...over,
    collection: {
        id: 'playlist-1',
        sourceId: 'samo:https://host',
        title: 'Playlist',
        type: 'playlist',
        ...over.collection,
    },
    enqueuedAt: 1,
    sourceUrl: 'https://host/stream',
    status: (over.status ?? 'completed') as DownloadStatus,
    title: over.title ?? 'Track',
    trackId: over.trackId ?? over.id,
});

describe('pickDownloadedPlaylistCollections', () => {
    it('returns one entry per playlist, deduped across its tracks', () => {
        const picked = pickDownloadedPlaylistCollections([
            entry({ id: 'a' }),
            entry({ id: 'b' }),
            entry({ collection: { id: 'playlist-2' }, id: 'c' }),
        ]);

        expect(picked.map((collection) => collection.id)).toEqual(['playlist-1', 'playlist-2']);
    });

    it('ignores collections that are not playlists', () => {
        const picked = pickDownloadedPlaylistCollections([
            entry({ collection: { id: 'album-1', type: 'album' }, id: 'a' }),
            entry({ collection: { id: 'book-1', type: 'audiobook' }, id: 'b' }),
        ]);

        expect(picked).toEqual([]);
    });

    it('counts a playlist as downloaded on a single completed track, so a partly failed download is still topped up', () => {
        const picked = pickDownloadedPlaylistCollections([
            entry({ id: 'a' }),
            entry({ id: 'b', status: 'failed' }),
        ]);

        expect(picked).toHaveLength(1);
    });

    it('holds back a playlist with nothing completed — it was never downloaded', () => {
        const picked = pickDownloadedPlaylistCollections([
            entry({ id: 'a', status: 'queued' }),
            entry({ id: 'b', status: 'canceled' }),
        ]);

        expect(picked).toEqual([]);
    });

    it('separates playlists that share an id across two servers', () => {
        const picked = pickDownloadedPlaylistCollections([
            entry({ id: 'a' }),
            entry({ collection: { sourceId: 'samo:https://other' }, id: 'b' }),
        ]);

        expect(picked.map((collection) => collection.sourceId)).toEqual([
            'samo:https://host',
            'samo:https://other',
        ]);
    });

    it('scopes to one playlist when the caller knows which one changed', () => {
        const picked = pickDownloadedPlaylistCollections(
            [entry({ id: 'a' }), entry({ collection: { id: 'playlist-2' }, id: 'b' })],
            { playlistId: 'playlist-2' },
        );

        expect(picked.map((collection) => collection.id)).toEqual(['playlist-2']);
    });

    it('scopes by source so a same-id playlist on another server is left alone', () => {
        const picked = pickDownloadedPlaylistCollections(
            [
                entry({ id: 'a' }),
                entry({ collection: { sourceId: 'samo:https://other' }, id: 'b' }),
            ],
            { playlistId: 'playlist-1', sourceId: 'samo:https://other' },
        );

        expect(picked.map((collection) => collection.sourceId)).toEqual([
            'samo:https://other',
        ]);
    });
});
