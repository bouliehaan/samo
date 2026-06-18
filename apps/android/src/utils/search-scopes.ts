import {
    type MobileSearchSection,
    MobileHomeSectionId,
    MobileSearchSectionId,
} from '@samo/core/mobile';
import { ServerType, type ServerAuthenticationResult } from '@samo/core/server';

import { type AndroidHomeContentState } from '../services/home-content';
import {
    type AndroidRecentContentItem,
    type AndroidRecentContentSourceItem,
} from '../services/recent-content';
import { type SearchScope } from '../types/search';
import { getLibraryMediaType } from './library-display';

export const SEARCH_SCOPE_DEFINITIONS: Array<{ id: SearchScope; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'music', label: 'Music' },
    { id: 'albums', label: 'Albums' },
    { id: 'artists', label: 'Artists' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'radio', label: 'Radio' },
    { id: 'podcasts', label: 'Podcasts' },
    { id: 'audiobooks', label: 'Audiobooks' },
];

const SEARCH_SCOPE_SECTION_IDS: Record<SearchScope, MobileSearchSectionId[]> = {
    albums: [MobileSearchSectionId.ALBUMS],
    all: [],
    artists: [MobileSearchSectionId.ARTISTS],
    audiobooks: [MobileSearchSectionId.AUDIOBOOKS],
    music: [
        MobileSearchSectionId.SONGS,
        MobileSearchSectionId.ALBUMS,
        MobileSearchSectionId.ARTISTS,
    ],
    playlists: [MobileSearchSectionId.PLAYLISTS],
    podcasts: [MobileSearchSectionId.PODCASTS],
    radio: [MobileSearchSectionId.RADIO],
};

export const getAvailableSearchScopes = (
    homeContentState: AndroidHomeContentState,
    serverConnection: ServerAuthenticationResult | null,
    recentItems: AndroidRecentContentItem[],
) => {
    const scopes = new Set<SearchScope>(['all']);
    const hasLoadedHome = homeContentState.status === 'loaded';
    const hasSamoServer = serverConnection?.type === ServerType.SAMO;

    // Samo is the all-in-one backend (it replaced the per-type music/audiobook
    // servers), and its search endpoints always cover songs, albums, artists,
    // audiobooks, podcasts, and playlists regardless of what Home happens to
    // surface. So offer those scopes whenever a Samo server is connected —
    // NOT only before Home loads. Gating them on `!hasLoadedHome` was a
    // regression: once Home loaded, the post-load pass below (which only adds
    // audiobooks/playlists/podcasts/radio) silently dropped the Artists and
    // Music/Albums scopes, so you could no longer scope a search to artists.
    // Artists are also deliberately excluded from recents, so the recents pass
    // could never re-add them either. The radio scope stays conditional below
    // because radio is the one category that genuinely may not exist.
    if (hasSamoServer) {
        scopes.add('music');
        scopes.add('albums');
        scopes.add('artists');
        scopes.add('audiobooks');
        scopes.add('podcasts');
        scopes.add('playlists');
    }

    if (hasLoadedHome) {
        homeContentState.content.sections.forEach((section) => {
            if (section.id === MobileHomeSectionId.AUDIOBOOKS) scopes.add('audiobooks');
            if (section.id === MobileHomeSectionId.PLAYLISTS) scopes.add('playlists');
            if (section.id === MobileHomeSectionId.PODCASTS) scopes.add('podcasts');
            if (section.id === MobileHomeSectionId.RADIO) scopes.add('radio');
            if (section.id === MobileHomeSectionId.RECENTLY_ADDED) {
                scopes.add('music');
                scopes.add('albums');
            }
        });
    }

    recentItems.forEach((recentItem) => {
        const mediaType = getLibraryMediaType(recentItem.item);

        if (mediaType === 'albums') scopes.add('albums');
        if (mediaType === 'artists') scopes.add('artists');
        if (mediaType === 'audiobooks') scopes.add('audiobooks');
        if (mediaType === 'playlists') scopes.add('playlists');
        if (mediaType === 'podcasts') scopes.add('podcasts');
        if (mediaType === 'radio') scopes.add('radio');
        if (mediaType === 'songs') scopes.add('music');
    });

    return SEARCH_SCOPE_DEFINITIONS.filter((scope) => scopes.has(scope.id));
};

export const isItemInSearchScope = (
    item: AndroidRecentContentSourceItem,
    activeScope: SearchScope,
) => {
    const mediaType = getLibraryMediaType(item);

    if (activeScope === 'all') return true;
    if (activeScope === 'music') {
        return mediaType === 'albums' || mediaType === 'artists' || mediaType === 'songs';
    }

    return mediaType === activeScope;
};

export const getSearchSectionsForScope = (
    sections: MobileSearchSection[],
    activeScope: SearchScope,
) => {
    if (activeScope === 'all') {
        return sections;
    }

    const sectionIds = new Set(SEARCH_SCOPE_SECTION_IDS[activeScope]);

    return sections.filter((section) => sectionIds.has(section.id));
};
