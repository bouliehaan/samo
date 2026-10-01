import { describe, expect, it } from 'vitest';

import { getTvBackAction, resolveTvFocus, type TvPage } from './tv-navigation';

const at = (overrides: Partial<Parameters<typeof getTvBackAction>[0]> = {}) =>
    getTvBackAction({
        detailOpen: false,
        menuOpen: false,
        page: 'home',
        playerOpen: false,
        viewAllOpen: false,
        zone: 'content',
        ...overrides,
    });

describe('TV Back', () => {
    it('closes the menu, then the player, before anything underneath', () => {
        expect(at({ detailOpen: true, menuOpen: true, playerOpen: true })).toBe('close-menu');
        expect(at({ detailOpen: true, playerOpen: true })).toBe('close-player');
    });

    it('pops a detail before closing the View All it was opened from', () => {
        expect(at({ detailOpen: true, viewAllOpen: true })).toBe('pop-detail');
        expect(at({ viewAllOpen: true })).toBe('close-view-all');
    });

    it('moves from a bare page to the rail rather than leaving it', () => {
        const pages: TvPage[] = ['home', 'podcasts', 'radio', 'search', 'settings'];
        for (const page of pages) {
            expect(at({ page })).toBe('focus-rail');
        }
    });

    it('goes Home from the rail, and only leaves the app from Home', () => {
        expect(at({ page: 'radio', zone: 'rail' })).toBe('go-home');
        expect(at({ detailOpen: true, zone: 'rail' })).toBe('go-home');
        expect(at({ zone: 'rail' })).toBe('exit');
    });
});

describe('TV focus placement', () => {
    it('restores the selected tile after returning from a detail page', () => {
        expect(resolveTvFocus(['rail:home', 'album:a', 'album:b'], 'album:b', 'hero')).toBe(
            'album:b',
        );
    });

    it('falls back to the default when a sync removed the remembered control', () => {
        expect(resolveTvFocus(['hero', 'album:a'], 'album:b', 'hero')).toBe('hero');
    });

    it('handles controls appearing after boot and an empty scope', () => {
        expect(resolveTvFocus([], 'old', 'connect')).toBeUndefined();
        expect(resolveTvFocus(['server-url', 'username'], null, 'connect')).toBe('server-url');
        expect(resolveTvFocus(['connect'], 'server-url', 'connect')).toBe('connect');
    });
});
