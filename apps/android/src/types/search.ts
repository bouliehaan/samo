import { type ServerAuthenticationResult } from '@samo/core/server';

import { type AndroidHomeContentState } from '../services/home-content';
import {
    type AndroidRecentContentItem,
    type AndroidRecentContentSourceItem,
} from '../services/recent-content';
import { type AndroidSearchState } from '../services/search-content';
import { type MobileSearchItem } from '@samo/core/mobile';

export type SearchScope =
    | 'albums'
    | 'all'
    | 'artists'
    | 'audiobooks'
    | 'music'
    | 'playlists'
    | 'podcasts'
    | 'radio';

export interface SearchScreenProps {
    hasServerConnections: boolean;
    onSearch: (query: string) => void;
    onSelectItem: (item: MobileSearchItem) => void;
    onSelectRecentItem: (item: AndroidRecentContentSourceItem) => void;
    searchState: AndroidSearchState;
    serverConnection: ServerAuthenticationResult | null;
}

export interface SearchOverlayProps {
    onClose: () => void;
    onSearch: (query: string) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    query: string;
    searchState: AndroidSearchState;
    serverConnection: ServerAuthenticationResult | null;
}
