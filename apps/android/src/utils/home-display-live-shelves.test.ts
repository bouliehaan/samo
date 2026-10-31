import { MobileHomeItemType, MobileHomeSectionId, type MobileHomeSection } from '@samo/core/mobile';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
    hint: null as null | { podcastFeed: number; rediscover: number },
    offline: false,
}));

// Stubs for everything the derive reaches that needs a device, so this
// pure-logic test runs under node.
vi.mock('expo-file-system/legacy', () => ({ documentDirectory: '' }));
vi.mock('../services/home-layout-hint', () => ({ getHomeLayoutHint: () => state.hint }));
vi.mock('../state/network-state', () => ({ isOfflineNow: () => state.offline }));
vi.mock('./library-display', () => ({ getLibraryMediaType: () => 'music' }));
vi.mock('../services/artwork-cache', () => ({
    getArtworkLocalUri: () => undefined,
    peekArtworkLocalUri: () => null,
}));
vi.mock('../services/persisted-server', () => ({ getPersistedServerAuthKey: () => undefined }));

import {
    getHomeDisplaySections,
    getHomeLayoutHintFromDisplay,
    hasHomeLiveAnswered,
} from './home-display';

const album = (id: string) => ({
    id,
    source: { id: 'srv', title: 'srv', type: 'samo' },
    title: `Album ${id}`,
    type: MobileHomeItemType.ALBUM,
});

const recentlyAdded: MobileHomeSection = {
    id: MobileHomeSectionId.RECENTLY_ADDED,
    items: [album('a'), album('b')] as MobileHomeSection['items'],
    title: 'Recently Added',
};

const heroes: MobileHomeSection = { id: MobileHomeSectionId.HEROES, items: [], title: '' };

const keysOf = (sections: MobileHomeSection[]) =>
    getHomeDisplaySections(sections, [], null).map((section) =>
        section.pending ? `${section.key} (reserved)` : section.key,
    );

describe('live shelf reservations', () => {
    beforeEach(() => {
        state.hint = { podcastFeed: 0, rediscover: 60 };
        state.offline = false;
    });

    it('reserves a hinted shelf while the live fetch is out', () => {
        expect(keysOf([recentlyAdded])).toContain('rediscover (reserved)');
    });

    it('drops the reservation once the live fetch answers without the shelf', () => {
        // The server sent Rediscover tracks, but every one was from an album
        // already on Home: nothing to show, and nothing still coming.
        expect(keysOf([recentlyAdded, heroes])).not.toContain('rediscover (reserved)');
    });

    it('never reserves offline, where no live fetch is coming', () => {
        state.offline = true;
        expect(keysOf([recentlyAdded])).not.toContain('rediscover (reserved)');
    });

    it('knows the live fetch answered from the hero section, even an empty one', () => {
        expect(hasHomeLiveAnswered([recentlyAdded])).toBe(false);
        expect(hasHomeLiveAnswered([recentlyAdded, heroes])).toBe(true);
    });

    it('hints what Home showed, not what the server sent', () => {
        const shown = getHomeDisplaySections([recentlyAdded, heroes], [], null);
        expect(getHomeLayoutHintFromDisplay(shown)).toEqual({ podcastFeed: 0, rediscover: 0 });
    });
});
