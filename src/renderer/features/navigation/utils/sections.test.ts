import { describe, expect, it } from 'vitest';

import {
    activeNavSectionId,
    availableNavSections,
    NAV_SECTIONS,
} from '/@/renderer/features/navigation/utils/sections';

const everySection = availableNavSections({ hasLongFormServer: true, hasMusicServer: true });

const activeOn = (pathname: string) => activeNavSectionId(pathname, everySection);

describe('availableNavSections', () => {
    it('offers every section when Samo is connected', () => {
        expect(everySection.map((section) => section.id)).toEqual([
            'music',
            'podcasts',
            'audiobooks',
            'radio',
        ]);
    });

    it('has no Home pill — the header already has a home button', () => {
        expect(everySection.some((section) => section.id === ('home' as never))).toBe(false);
    });

    it('drops podcasts and audiobooks on a backend without them', () => {
        const sections = availableNavSections({
            hasLongFormServer: false,
            hasMusicServer: true,
        });

        expect(sections.map((section) => section.id)).toEqual(['music', 'radio']);
    });

    it('offers nothing when no server is connected', () => {
        const sections = availableNavSections({
            hasLongFormServer: false,
            hasMusicServer: false,
        });

        expect(sections).toEqual([]);
    });
});

describe('activeNavSectionId', () => {
    it('lights nothing on Home, which is not one of the sections', () => {
        expect(activeOn('/')).toBeUndefined();
        expect(activeOn('')).toBeUndefined();
    });

    it('lights each section on its own root', () => {
        expect(activeOn('/podcasts')).toBe('podcasts');
        expect(activeOn('/radio')).toBe('radio');
        expect(activeOn('/music')).toBe('music');
        expect(activeOn('/audiobooks')).toBe('audiobooks');
    });

    it.each([
        ['/library/albums', 'music'],
        ['/library/albums/album_1', 'music'],
        ['/library/album-artists/artist_1/discography', 'music'],
        ['/library/genres', 'music'],
        ['/library/songs', 'music'],
        ['/playlists', 'music'],
        ['/playlists/playlist_1/songs', 'music'],
        ['/favorites', 'music'],
        ['/podcasts/show_1', 'podcasts'],
        ['/audiobooks/book_1', 'audiobooks'],
    ])('keeps %s inside %s', (pathname, expected) => {
        expect(activeOn(pathname)).toBe(expected);
    });

    it('lights nothing on routes that belong to no section', () => {
        expect(activeOn('/settings')).toBeUndefined();
        expect(activeOn('/search/album')).toBeUndefined();
        expect(activeOn('/now-playing')).toBeUndefined();
    });

    it('does not let a section swallow a longer path that merely shares a prefix', () => {
        // '/radio' must not claim a hypothetical '/radios' route.
        expect(activeOn('/radiostations')).toBeUndefined();
    });

    it('gives every section a path to navigate to', () => {
        for (const section of NAV_SECTIONS) {
            expect(section.paths[0]).toBeTruthy();
        }
    });
});
