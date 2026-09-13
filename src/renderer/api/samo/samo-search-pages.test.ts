import { describe, expect, it } from 'vitest';

import { samoSearchPages } from '/@/renderer/api/samo/samo-search-pages';

describe('samoSearchPages', () => {
    // The command palette pages one entity at a time. The start index used to
    // be dropped on the floor (every "next page" was offset 0) and the limit
    // came from songLimit regardless of entity, so an album page sent limit=0
    // — the server's default page of 50.
    it('turns a single-entity page into one request carrying its own limit and start index', () => {
        expect(
            samoSearchPages({
                albumArtistLimit: 0,
                albumArtistStartIndex: 0,
                albumLimit: 4,
                albumStartIndex: 8,
                query: 'nils',
                songLimit: 0,
                songStartIndex: 0,
            }),
        ).toEqual([{ entities: ['albums'], limit: 4, offset: 8 }]);
    });

    it('sends the page of the entity being paged, not songLimit, for every entity', () => {
        expect(
            samoSearchPages({
                albumArtistLimit: 4,
                albumArtistStartIndex: 12,
                albumLimit: 0,
                query: 'nils',
                songLimit: 0,
            }),
        ).toEqual([{ entities: ['albumArtists'], limit: 4, offset: 12 }]);
        expect(
            samoSearchPages({
                albumArtistLimit: 0,
                albumLimit: 0,
                query: 'nils',
                songLimit: 4,
                songStartIndex: 4,
            }),
        ).toEqual([{ entities: ['songs'], limit: 4, offset: 4 }]);
    });

    // The unified search asks for the same page of all three; that is one
    // request, exactly as before.
    it('collapses entities that ask for the same page into one request', () => {
        expect(
            samoSearchPages({
                albumArtistLimit: 5,
                albumLimit: 5,
                query: 'nils',
                songLimit: 5,
            }),
        ).toEqual([{ entities: ['albumArtists', 'albums', 'songs'], limit: 5, offset: 0 }]);
    });

    it('leaves the server default in charge when no limit is given', () => {
        expect(samoSearchPages({ query: 'nils' })).toEqual([
            { entities: ['albumArtists', 'albums', 'songs'], limit: undefined, offset: 0 },
        ]);
    });

    it('asks for nothing when every entity is at limit 0', () => {
        expect(
            samoSearchPages({ albumArtistLimit: 0, albumLimit: 0, query: 'nils', songLimit: 0 }),
        ).toEqual([]);
    });

    // The server has no per-entity paging; different pages per entity cost a
    // request each rather than one page silently applied to all of them.
    it('issues one request per distinct page when entities disagree', () => {
        expect(
            samoSearchPages({
                albumArtistLimit: 5,
                albumArtistStartIndex: 0,
                albumLimit: 5,
                albumStartIndex: 10,
                query: 'nils',
                songLimit: 20,
                songStartIndex: 0,
            }),
        ).toEqual([
            { entities: ['albumArtists'], limit: 5, offset: 0 },
            { entities: ['albums'], limit: 5, offset: 10 },
            { entities: ['songs'], limit: 20, offset: 0 },
        ]);
    });
});
