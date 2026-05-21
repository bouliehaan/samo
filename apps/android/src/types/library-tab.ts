import { type AndroidFullCollectionState } from '../services/full-collection';
import { type AndroidHomeContentState } from '../services/home-content';
import {
    type AndroidRecentContentItem,
    type AndroidRecentContentSourceItem,
} from '../services/recent-content';
import { type LibraryMediaType } from './library-display';

export type LibraryFilter =
    | 'albums'
    | 'all'
    | 'artists'
    | 'audiobooks'
    | 'playlists'
    | 'podcasts'
    | 'radio'
    | 'songs';

export type LibrarySort = 'name' | 'recents';

export interface LibraryFullCollectionsState {
    albums: AndroidFullCollectionState;
    artists: AndroidFullCollectionState;
}

export interface LibraryScreenProps {
    fullCollections: LibraryFullCollectionsState;
    fullCollectionsEnabled: boolean;
    hasServerConnections: boolean;
    homeContentState: AndroidHomeContentState;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    recentItems: AndroidRecentContentItem[];
}

export const LIBRARY_ROW_DRAW_DISTANCE = 62 * 12;

export const EMPTY_LIBRARY_FULL_COLLECTIONS: LibraryFullCollectionsState = {
    albums: { status: 'idle' },
    artists: { status: 'idle' },
};

export const LIBRARY_FILTERS: Array<{
    id: LibraryFilter;
    label: string;
    mediaType?: LibraryMediaType;
}> = [
    { id: 'all', label: 'All' },
    { id: 'playlists', label: 'Playlists', mediaType: 'playlists' },
    { id: 'audiobooks', label: 'Audiobooks', mediaType: 'audiobooks' },
    { id: 'podcasts', label: 'Podcasts', mediaType: 'podcasts' },
    { id: 'albums', label: 'Albums', mediaType: 'albums' },
    { id: 'artists', label: 'Artists', mediaType: 'artists' },
    { id: 'songs', label: 'Songs', mediaType: 'songs' },
    { id: 'radio', label: 'Radio', mediaType: 'radio' },
];

export const LIBRARY_SORTS: Array<{ id: LibrarySort; label: string }> = [
    { id: 'recents', label: 'Recents' },
    { id: 'name', label: 'Name' },
];
