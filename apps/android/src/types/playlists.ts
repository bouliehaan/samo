import { type MobileHomeItem } from '@samo/core/mobile';

import { type AndroidHomeContentState } from '../services/home-content';
import { type AndroidRecentContentItem } from '../services/recent-content';

export interface PlaylistsScreenProps {
    onCreatePlaylist?: () => void;
    onSelectItem: (item: MobileHomeItem) => void;
    onShufflePlay: (items: MobileHomeItem[]) => void;
    showCreatePlaylist?: boolean;
}
