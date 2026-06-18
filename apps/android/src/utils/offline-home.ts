import {
    type MobileHomeItem,
    MobileHomeItemType,
    type MobileHomeSection,
    MobileHomeSectionId,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import { type AndroidHomeContentState } from '../services/home-content';
import { type DownloadedCollectionSummary } from './downloaded-collections';
import { getSourceFromSourceId } from './content-source';

export const buildOfflineHomeContentState = (
    downloadedCollections: DownloadedCollectionSummary[],
    serverConnection: ServerAuthenticationResult | null,
): AndroidHomeContentState => {
    const sectionItems = new Map<MobileHomeSectionId, MobileHomeItem[]>();
    const sortedCollections = [...downloadedCollections].sort(
        (left, right) => right.latestCompletedAt - left.latestCompletedAt,
    );

    for (const { collection } of sortedCollections) {
        const source = getSourceFromSourceId(collection.sourceId, serverConnection);
        if (!source) {
            continue;
        }

        const itemType =
            collection.type === 'album'
                ? MobileHomeItemType.ALBUM
                : collection.type === 'playlist'
                  ? MobileHomeItemType.PLAYLIST
                  : collection.type === 'audiobook'
                    ? MobileHomeItemType.AUDIOBOOK
                    : MobileHomeItemType.PODCAST;
        const sectionId =
            collection.type === 'album'
                ? MobileHomeSectionId.RECENTLY_ADDED
                : collection.type === 'playlist'
                  ? MobileHomeSectionId.PLAYLISTS
                  : collection.type === 'audiobook'
                    ? MobileHomeSectionId.AUDIOBOOKS
                    : MobileHomeSectionId.PODCASTS;
        const items = sectionItems.get(sectionId) ?? [];
        items.push({
            artworkUrl: collection.artworkUrl,
            id: collection.id,
            source,
            subtitle: collection.subtitle,
            title: collection.title,
            type: itemType,
        });
        sectionItems.set(sectionId, items);
    }

    const sections: MobileHomeSection[] = [
        {
            id: MobileHomeSectionId.RECENTLY_ADDED,
            items: sectionItems.get(MobileHomeSectionId.RECENTLY_ADDED) ?? [],
            title: 'Downloaded Albums',
        },
        {
            id: MobileHomeSectionId.PLAYLISTS,
            items: sectionItems.get(MobileHomeSectionId.PLAYLISTS) ?? [],
            title: 'Downloaded Playlists',
        },
        {
            id: MobileHomeSectionId.AUDIOBOOKS,
            items: sectionItems.get(MobileHomeSectionId.AUDIOBOOKS) ?? [],
            title: 'Downloaded Audiobooks',
        },
        {
            id: MobileHomeSectionId.PODCASTS,
            items: sectionItems.get(MobileHomeSectionId.PODCASTS) ?? [],
            title: 'Downloaded Podcasts',
        },
    ].filter((section) => section.items.length > 0);

    return {
        content: {
            errors: [],
            loadedAt: Date.now(),
            sections,
            serverTitle: 'Offline Downloads',
        },
        status: 'loaded',
    };
};
