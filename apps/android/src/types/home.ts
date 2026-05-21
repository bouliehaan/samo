import { type ServerAuthenticationResult } from '@samo/core/server';

import { type AndroidHomeContentState } from '../services/home-content';
import {
    type AndroidRecentContentItem,
    type AndroidRecentContentSourceItem,
} from '../services/recent-content';
import { type MobileHomeSectionId } from '@samo/core/mobile';

export type HomeFilter = 'all' | 'audiobooks' | 'music' | 'podcasts' | 'radio';

export interface HomeDisplaySection {
    key: string;
    items: AndroidRecentContentSourceItem[];
    rowCount?: number;
    title: string;
    variant:
        | 'album'
        | 'artist'
        | 'book'
        | 'continue'
        | 'playlist'
        | 'podcast'
        | 'radio'
        | 'recents'
        | 'wide';
}

export interface HomeScreenProps {
    homeContentState: AndroidHomeContentState;
    onManageServers: () => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onViewAll: (section: HomeDisplaySection) => void;
    recentItems: AndroidRecentContentItem[];
    serverConnections: ServerAuthenticationResult[];
}

export interface ContentBackedScreenProps {
    emptyTitle: string;
    homeContentState: AndroidHomeContentState;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    sectionIds: MobileHomeSectionId[];
}
