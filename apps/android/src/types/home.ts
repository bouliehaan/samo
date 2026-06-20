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
    /**
     * A sized placeholder shelf reserved for a network-gated live section
     * (Podcast Feed / Rediscover) before its data lands, so the real content
     * fills its slot in place instead of inserting mid-page and shoving
     * everything down. Rendered as a skeleton carousel at the variant's exact
     * row height; carries no items.
     */
    pending?: boolean;
    /** How many skeleton tiles a `pending` shelf draws. */
    skeletonCount?: number;
    rowCount?: number;
    title: string;
    variant:
        | 'album'
        | 'artist'
        | 'book'
        | 'continue'
        | 'playlist'
        | 'podcast'
        | 'podcast-feed'
        | 'radio'
        | 'recents'
        | 'wide';
}

export interface HomeScreenProps {
    onManageServers: () => void;
    onPrefetchItem?: (item: AndroidRecentContentSourceItem) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    onViewAll: (section: HomeDisplaySection) => void;
    serverConnection: ServerAuthenticationResult | null;
}

export interface ContentBackedScreenProps {
    emptyTitle: string;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    sectionIds: MobileHomeSectionId[];
    serverConnection?: import('@samo/core/server').ServerAuthenticationResult | null;
}
