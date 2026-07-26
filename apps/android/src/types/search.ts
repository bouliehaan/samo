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

export interface SearchOverlayProps {
    /**
     * Whether search has actually been COMPLETED, as opposed to merely being
     * dragged in. While false the overlay is mounted and visible in proportion to
     * the pull, but inert: no focus, no keyboard, no touches. That is what lets a
     * half-finished pull be reversed — nothing has committed yet.
     */
    isCommitted: boolean;
    onSearch: (query: string) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    query: string;
    searchState: AndroidSearchState;
    serverConnection: ServerAuthenticationResult | null;
}
