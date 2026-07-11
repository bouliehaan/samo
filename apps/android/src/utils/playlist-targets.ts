import { MobileHomeItemType, MobileHomeSectionId } from '@samo/core/mobile';

import { type AndroidHomeContentState } from '../services/home-content';

export const getPlaylistTargetsForRoot = (
    homeContentState: AndroidHomeContentState,
    sourceId: string | undefined,
) => {
    if (!sourceId || homeContentState.status !== 'loaded') {
        return [];
    }
    const sections = homeContentState.content.sections;
    const playlistSection = sections.find(
        (section) => section.id === MobileHomeSectionId.PLAYLISTS,
    );
    // The server-managed Explore queue is not an add-to target: the server
    // re-derives its membership every reconcile pass (and refuses client
    // edits with a 403). The mirror-backed playlist rows don't carry the
    // `system` flag, but the live-fetched EXPLO section's item id IS the
    // system playlist's id — use it as the exclusion list.
    const systemPlaylistIds = new Set(
        sections
            .find((section) => section.id === MobileHomeSectionId.EXPLO)
            ?.items.map((item) => item.id) ?? [],
    );
    return (
        playlistSection?.items.filter(
            (item) =>
                item.type === MobileHomeItemType.PLAYLIST &&
                item.source?.id === sourceId &&
                !systemPlaylistIds.has(item.id),
        ) ?? []
    );
};
