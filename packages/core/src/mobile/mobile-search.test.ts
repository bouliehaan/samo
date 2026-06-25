import { describe, expect, it } from 'vitest';

import {
    buildMobileSearchResultsFromItems,
    type MobileSearchItem,
    MobileSearchItemType,
    MobileSearchSectionId,
} from './mobile-search';

const artist = (id: string, name: string): MobileSearchItem => ({
    id,
    subtitle: '12 albums',
    title: name,
    type: MobileSearchItemType.ARTIST,
});

const album = (id: string, title: string, artistName: string): MobileSearchItem => ({
    album: title,
    artist: artistName,
    id,
    subtitle: artistName,
    title,
    type: MobileSearchItemType.ALBUM,
});

const song = (
    id: string,
    title: string,
    artistName: string,
    albumTitle: string,
    playCount = 0,
): MobileSearchItem => ({
    album: albumTitle,
    artist: artistName,
    id,
    playCount,
    subtitle: `${artistName} - ${albumTitle}`,
    title,
    type: MobileSearchItemType.SONG,
});

// A library where the query "The Beatles" matches one artist, two albums, and a
// pile of songs that merely credit the artist — the exact shape that used to
// bury the artist under 40 songs in the on-device search.
const beatlesLibrary = (): MobileSearchItem[] => [
    song('s1', 'Come Together', 'The Beatles', 'Abbey Road', 9000),
    song('s2', 'Here Comes the Sun', 'The Beatles', 'Abbey Road', 8000),
    song('s3', 'Something', 'The Beatles', 'Abbey Road', 7000),
    song('s4', 'Let It Be', 'The Beatles', 'Let It Be', 6000),
    song('s5', 'Yesterday', 'The Beatles', 'Help!', 5000),
    song('s6', 'Hey Jude', 'The Beatles', 'Hey Jude', 4000),
    album('al1', 'Abbey Road', 'The Beatles'),
    album('al2', 'Revolver', 'The Beatles'),
    artist('ar1', 'The Beatles'),
];

const sectionIds = (results: { sections: { id: MobileSearchSectionId }[] }) =>
    results.sections.map((section) => section.id);

describe('buildMobileSearchResultsFromItems', () => {
    it('surfaces the artist over songs when the query is the artist name', () => {
        const results = buildMobileSearchResultsFromItems('The Beatles', beatlesLibrary());
        const ids = sectionIds(results);

        // "Best matches" leads, and its top hit is the artist — not a song.
        expect(ids[0]).toBe(MobileSearchSectionId.TOP);
        const best = results.sections[0]!;
        expect(best.items[0]!.type).toBe(MobileSearchItemType.ARTIST);
        expect(best.items[0]!.title).toBe('The Beatles');

        // Among the per-type sections, Artists ranks ahead of Songs.
        const contentIds = ids.filter((id) => id !== MobileSearchSectionId.TOP);
        expect(contentIds.indexOf(MobileSearchSectionId.ARTISTS)).toBeLessThan(
            contentIds.indexOf(MobileSearchSectionId.SONGS),
        );
        expect(contentIds[0]).toBe(MobileSearchSectionId.ARTISTS);
    });

    it('puts the artist first in Best matches even with many competing songs', () => {
        const results = buildMobileSearchResultsFromItems('beatles', beatlesLibrary());
        const best = results.sections.find((s) => s.id === MobileSearchSectionId.TOP);

        expect(best).toBeDefined();
        // Word-prefix title hit (artist) beats word-prefix secondary hits (songs/albums).
        expect(best!.items[0]!.type).toBe(MobileSearchItemType.ARTIST);
    });

    it('omits Best matches when only one section matches (no redundant reel)', () => {
        const results = buildMobileSearchResultsFromItems('Come Together', beatlesLibrary());
        const ids = sectionIds(results);

        expect(ids).not.toContain(MobileSearchSectionId.TOP);
        expect(ids[0]).toBe(MobileSearchSectionId.SONGS);
        expect(results.sections[0]!.items[0]!.title).toBe('Come Together');
    });

    it('orders songs within a section by match strength then popularity', () => {
        const results = buildMobileSearchResultsFromItems('Abbey Road', beatlesLibrary());
        // The album titled "Abbey Road" (exact title) outranks the songs that
        // only mention it via their subtitle/album field.
        expect(results.sections[0]!.id).toBe(MobileSearchSectionId.TOP);
        expect(results.sections[0]!.items[0]!.type).toBe(MobileSearchItemType.ALBUM);
        expect(results.sections[0]!.items[0]!.title).toBe('Abbey Road');
    });

    it('deduplicates items that appear under multiple sources', () => {
        const library = beatlesLibrary();
        const results = buildMobileSearchResultsFromItems('The Beatles', [...library, ...library]);
        const artistSection = results.sections.find(
            (section) => section.id === MobileSearchSectionId.ARTISTS,
        );

        expect(artistSection!.items).toHaveLength(1);
    });
});
