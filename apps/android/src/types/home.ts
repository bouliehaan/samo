import { type ServerAuthenticationResult } from '@samo/core/server';

import { type AndroidHomeContentState } from '../services/home-content';
import { type AndroidRecentContentSourceItem } from '../services/recent-content';

export type HomeFilter = 'all' | 'audiobooks' | 'music' | 'podcasts' | 'radio';

export interface HomeDisplaySection {
    key: string;
    items: AndroidRecentContentSourceItem[];
    /**
     * This shelf is a curated section, not a tray of individually hideable
     * tiles, so "remove from home" on a tile elsewhere must not empty it.
     *
     * Hidden keys are `source:type:id` per ITEM, and a section with no items
     * left is dropped — so the one playlist behind a featured section shares
     * its key with the ordinary tile for the same playlist further down the
     * page. Hiding that duplicate tile (a reasonable thing to want) used to
     * delete the featured section too, permanently, with nothing on screen to
     * explain it. Set this where a section IS one curated thing rather than a
     * selection of items.
     */
    ignoresHiddenItems?: boolean;
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
        | 'explo'
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
