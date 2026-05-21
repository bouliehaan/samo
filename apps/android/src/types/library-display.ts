import { type AndroidRecentContentSourceItem } from '../services/recent-content';

export type LibraryMediaType =
    | 'albums'
    | 'artists'
    | 'audiobooks'
    | 'playlists'
    | 'podcasts'
    | 'radio'
    | 'songs';

export interface LibraryDisplayItem {
    item: AndroidRecentContentSourceItem;
    key: string;
    mediaType: LibraryMediaType;
    selectedAt: number;
}
