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
    serverConnections: ServerAuthenticationResult[],
    recentItems: AndroidRecentContentItem[],
) => {
    const scopes = new Set<SearchScope>(['all']);
    const hasMusicServer = serverConnections.some(
        (connection) =>
            connection.type === ServerType.NAVIDROME || connection.type === ServerType.SUBSONIC,
    );
    const hasAudiobookshelf = serverConnections.some(
        (connection) => connection.type === ServerType.AUDIOBOOKSHELF,
    );
    const hasLoadedHome = homeContentState.status === 'loaded';

    if (hasMusicServer) {
        scopes.add('music');
        scopes.add('albums');
        scopes.add('artists');
        if (!hasLoadedHome) {
            scopes.add('playlists');
        }
    }

    if (hasAudiobookshelf && !hasLoadedHome) {
        scopes.add('audiobooks');
        scopes.add('podcasts');
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
