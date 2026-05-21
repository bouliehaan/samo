import { MobileHomeItemType, MobileHomeSectionId } from '@samo/core/mobile';

import { type AndroidHomeContentState } from '../services/home-content';

export const getPlaylistTargetsForRoot = (
    homeContentState: AndroidHomeContentState,
    sourceId: string | undefined,
) => {
    if (!sourceId || homeContentState.status !== 'loaded') {
        return [];
    }
    const playlistSection = homeContentState.content.sections.find(
        (section) => section.id === MobileHomeSectionId.PLAYLISTS,
    );
    return (
        playlistSection?.items.filter(
            (item) => item.type === MobileHomeItemType.PLAYLIST && item.source?.id === sourceId,
        ) ?? []
    );
};
