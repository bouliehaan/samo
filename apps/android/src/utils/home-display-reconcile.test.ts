import { describe, expect, it, vi } from 'vitest';

// recent-content (pulled in for getRecentContentItemKey) transitively imports
// the native expo file system; stub it so this pure-logic test runs under node.
vi.mock('expo-file-system/legacy', () => ({
    documentDirectory: '',
}));

import {
    reconcileHomeDisplaySections,
    valueEqualIgnoringArtworkToken,
} from './home-display-reconcile';
import { type HomeDisplaySection } from '../types/home';

const ART = 'https://samo.example/api/v1/media/images/abc/image';

const makeItem = (id: string, artworkUrl: string, title = `Title ${id}`) =>
    ({
        artworkUrl,
        id,
        source: { id: 'srv' },
        title,
        type: 'album',
    }) as unknown as HomeDisplaySection['items'][number];

const makeSection = (
    items: HomeDisplaySection['items'],
    overrides: Partial<HomeDisplaySection> = {},
): HomeDisplaySection => ({
    items,
    key: 'albums',
    title: 'Albums',
    variant: 'album',
    ...overrides,
});

describe('valueEqualIgnoringArtworkToken', () => {
    it('treats a rotated stream_token in artworkUrl as equal', () => {
        const a = makeItem('1', `${ART}?stream_token=TOKEN_A`);
        const b = makeItem('1', `${ART}?stream_token=TOKEN_B`);
        expect(valueEqualIgnoringArtworkToken(a, b)).toBe(true);
    });

    it('detects a genuinely different image', () => {
        const a = makeItem('1', `${ART}?stream_token=TOKEN_A`);
        const b = makeItem('1', `https://samo.example/api/v1/media/images/XYZ/image`);
        expect(valueEqualIgnoringArtworkToken(a, b)).toBe(false);
    });

    it('detects a changed non-artwork field', () => {
        const a = makeItem('1', ART, 'Old Title');
        const b = makeItem('1', ART, 'New Title');
        expect(valueEqualIgnoringArtworkToken(a, b)).toBe(false);
    });
});

describe('reconcileHomeDisplaySections', () => {
    it('REUSES item + section references when only the artwork token rotated (the cold-boot remount fix)', () => {
        const previous = [
            makeSection([
                makeItem('1', `${ART}?stream_token=TOKEN_A`),
                makeItem('2', `${ART}?stream_token=TOKEN_A`),
            ]),
        ];
        // Same items, brand-new objects, only the token differs — exactly what a
        // serverConnection re-auth produces.
        const next = [
            makeSection([
                makeItem('1', `${ART}?stream_token=TOKEN_B`),
                makeItem('2', `${ART}?stream_token=TOKEN_B`),
            ]),
        ];

        const result = reconcileHomeDisplaySections(previous, next);

        // Section AND every item keep their previous reference → memoized tiles
        // never remount → no deload/reload flash.
        expect(result[0]).toBe(previous[0]);
        expect(result[0].items[0]).toBe(previous[0].items[0]);
        expect(result[0].items[1]).toBe(previous[0].items[1]);
    });

    it('keeps the NEW reference for an item whose real content changed', () => {
        const previous = [makeSection([makeItem('1', ART, 'Old')])];
        const next = [makeSection([makeItem('1', ART, 'New')])];

        const result = reconcileHomeDisplaySections(previous, next);

        expect(result[0].items[0]).toBe(next[0].items[0]);
        expect(result[0].items[0]).not.toBe(previous[0].items[0]);
    });

    it('reuses an item by key even if its section moved', () => {
        const item = makeItem('1', `${ART}?stream_token=TOKEN_A`);
        const previous = [makeSection([item], { key: 'recents', variant: 'recents' })];
        const next = [
            makeSection([makeItem('1', `${ART}?stream_token=TOKEN_B`)], {
                key: 'albums',
                variant: 'album',
            }),
        ];

        const result = reconcileHomeDisplaySections(previous, next);

        expect(result[0].items[0]).toBe(item);
    });

    it('does not reuse a pending section whose skeletonCount changed', () => {
        const previous = [
            makeSection([], { key: 'podcast-feed', pending: true, skeletonCount: 5, variant: 'podcast-feed' }),
        ];
        const next = [
            makeSection([], { key: 'podcast-feed', pending: true, skeletonCount: 3, variant: 'podcast-feed' }),
        ];

        const result = reconcileHomeDisplaySections(previous, next);

        expect(result[0]).not.toBe(previous[0]);
        expect(result[0].skeletonCount).toBe(3);
    });

    it('returns next verbatim when there is no previous', () => {
        const next = [makeSection([makeItem('1', ART)])];
        expect(reconcileHomeDisplaySections(undefined, next)).toBe(next);
    });
});
