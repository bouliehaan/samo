import { MobileHomeItemType } from '@samo/core/mobile';
import { Platform } from 'react-native';

import { type AndroidRecentContentSourceItem } from '../../services/recent-content';
import { type HomeDisplaySection } from '../../types/home';
import { getDisplaySubtitle } from '../../utils/playback-time';

export const FLASH_LIST_MAINTAIN_POSITION_DISABLED = { disabled: true };

/** Android caption fonts carry extra vertical padding; trim it so tile text
 *  rows sit tight against the artwork. */
export const androidTrimCaptionFont =
    Platform.OS === 'android' ? ({ includeFontPadding: false } as const) : {};

export const getHomeItemSubtitle = (
    item: AndroidRecentContentSourceItem,
    variant: HomeDisplaySection['variant'],
) => {
    if (variant === 'radio') {
        const nowPlayingText = 'nowPlayingText' in item ? item.nowPlayingText : undefined;
        return nowPlayingText ?? getDisplaySubtitle(item.subtitle);
    }

    if (variant === 'podcast-feed' && item.type === MobileHomeItemType.PODCAST_EPISODE) {
        const parts = getDisplaySubtitle(item.subtitle)?.split(' · ') ?? [];
        return parts.length > 0 ? parts[parts.length - 1] : undefined;
    }

    return getDisplaySubtitle(item.subtitle);
};
