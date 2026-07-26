import { type AndroidFullCollectionState } from '../services/full-collection';
import { type AndroidHomeContentState } from '../services/home-content';
import { type AndroidLibraryRelevantState } from '../services/library-content';
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

export type LibraryScope = 'all' | 'relevant';

export interface LibraryFullCollectionsState {
    albums: AndroidFullCollectionState;
    artists: AndroidFullCollectionState;
}

/** The media types that own a whole navbar tab, and therefore a browse grid
 *  that must list the COMPLETE collection — not the Home shelf slice. */
export type MediaTypeCollectionKey = Extract<LibraryMediaType, 'audiobooks' | 'podcasts'>;

export const MEDIA_TYPE_COLLECTION_KEYS: MediaTypeCollectionKey[] = ['audiobooks', 'podcasts'];

/** Full mirror collections behind the Audiobooks / Podcasts tab grids. */
export type MediaTypeCollectionsState = Record<MediaTypeCollectionKey, AndroidFullCollectionState>;

export const LIBRARY_ROW_DRAW_DISTANCE = 62 * 12;

export const EMPTY_LIBRARY_FULL_COLLECTIONS: LibraryFullCollectionsState = {
    albums: { status: 'idle' },
    artists: { status: 'idle' },
};

export const EMPTY_MEDIA_TYPE_COLLECTIONS: MediaTypeCollectionsState = {
    audiobooks: { status: 'idle' },
    podcasts: { status: 'idle' },
};

export const EMPTY_LIBRARY_RELEVANT_STATE: AndroidLibraryRelevantState = {
    status: 'idle',
};

export const LIBRARY_SCOPES: Array<{ id: LibraryScope; label: string }> = [
    { id: 'relevant', label: 'Relevant' },
    { id: 'all', label: 'All' },
];

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
