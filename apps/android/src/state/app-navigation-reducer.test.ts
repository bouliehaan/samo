import { describe, expect, it, vi } from 'vitest';

// app-navigation.ts pulls in react-native for the hardware BackHandler wiring;
// the reducer under test never touches it. Stub the module so this pure-logic
// suite can import the reducer under the node test environment.
vi.mock('react-native', () => ({
    BackHandler: { addEventListener: () => ({ remove: () => {} }) },
}));

import {
    appNavigationReducer,
    initialAppNavigationState,
    type AppNavigationState,
} from './app-navigation';
import { type AndroidMediaDetailState } from '../services/media-detail';

const loaded = (id: string): AndroidMediaDetailState =>
    ({ detail: { id, title: id }, status: 'loaded' }) as never;
const loading = (title: string): AndroidMediaDetailState =>
    ({ itemTitle: title, status: 'loading' }) as never;

const open = (
    state: AppNavigationState,
    key: string,
    mediaDetailState: AndroidMediaDetailState,
) => appNavigationReducer(state, { type: 'open-media-detail', key, mediaDetailState });
const pop = (state: AppNavigationState) =>
    appNavigationReducer(state, { type: 'pop-media-detail' });

describe('media-detail back-stack reducer', () => {
    it('opens the first detail from idle without stacking', () => {
        const next = open(initialAppNavigationState, 'artist:1', loaded('artist:1'));
        expect(next.mediaDetailKey).toBe('artist:1');
        expect(next.mediaDetailStack).toEqual([]);
        expect(next.mediaDetailState.status).toBe('loaded');
    });

    it('pushes the parent when navigating artist -> album, and pops back to it', () => {
        const artist = open(initialAppNavigationState, 'artist:1', loaded('artist:1'));
        const album = open(artist, 'album:9', loaded('album:9'));
        expect(album.mediaDetailKey).toBe('album:9');
        expect(album.mediaDetailStack).toHaveLength(1);
        expect(album.mediaDetailStack[0]!.key).toBe('artist:1');

        // Back from album -> artist (the reported bug: this used to land on Home).
        const backToArtist = pop(album);
        expect(backToArtist.mediaDetailKey).toBe('artist:1');
        expect(backToArtist.mediaDetailStack).toEqual([]);
        expect((backToArtist.mediaDetailState as { detail: { id: string } }).detail.id).toBe(
            'artist:1',
        );

        // Back again from the root -> idle (Home).
        const backToIdle = pop(backToArtist);
        expect(backToIdle.mediaDetailState.status).toBe('idle');
        expect(backToIdle.mediaDetailKey).toBeNull();
    });

    it('does NOT stack a still-loading parent (avoids restoring a dead spinner)', () => {
        const artistLoading = open(initialAppNavigationState, 'artist:1', loading('Artist'));
        const album = open(artistLoading, 'album:9', loaded('album:9'));
        expect(album.mediaDetailStack).toEqual([]);
        // Back from album goes to idle, not a stuck artist spinner.
        expect(pop(album).mediaDetailState.status).toBe('idle');
    });

    it('treats a same-key open as a replace, not a duplicate push', () => {
        const album = open(initialAppNavigationState, 'album:9', loaded('album:9'));
        const reopened = open(album, 'album:9', loaded('album:9'));
        expect(reopened.mediaDetailStack).toEqual([]);
    });

    it('reset-media-detail clears the whole stack, key, and state', () => {
        const artist = open(initialAppNavigationState, 'artist:1', loaded('artist:1'));
        const album = open(artist, 'album:9', loaded('album:9'));
        const reset = appNavigationReducer(album, { type: 'reset-media-detail' });
        expect(reset.mediaDetailState.status).toBe('idle');
        expect(reset.mediaDetailKey).toBeNull();
        expect(reset.mediaDetailStack).toEqual([]);
    });

    it('set-media-detail updates the top in place without touching the stack/key', () => {
        const artist = open(initialAppNavigationState, 'artist:1', loaded('artist:1'));
        const album = open(artist, 'album:9', loading('Album'));
        // album finishes loading -> top update, stack/key untouched.
        const filled = appNavigationReducer(album, {
            type: 'set-media-detail',
            mediaDetailState: loaded('album:9'),
        });
        expect(filled.mediaDetailKey).toBe('album:9');
        expect(filled.mediaDetailStack).toHaveLength(1);
        expect(filled.mediaDetailState.status).toBe('loaded');
    });
});
