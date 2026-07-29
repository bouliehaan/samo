import {
    type MobileHomeItem,
    MobileHomeItemType,
    type MobileHomeSection,
    MobileHomeSectionId,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import { type DownloadedCollectionSummary } from './downloaded-collections';
import { getSourceFromSourceId } from './content-source';

const ITEM_TYPE_FOR_COLLECTION: Record<string, MobileHomeItemType> = {
    album: MobileHomeItemType.ALBUM,
    audiobook: MobileHomeItemType.AUDIOBOOK,
    playlist: MobileHomeItemType.PLAYLIST,
    podcast: MobileHomeItemType.PODCAST,
};

/**
 * The "Downloaded" shelf: one mixed row of everything on this device, newest
 * first.
 *
 * This used to be four type-split shelves that REPLACED Home entirely while
 * offline. One row is both truer to what it is — "what you can play right
 * now", regardless of what kind of thing it is — and cheaper: it sits on top
 * of the mirrored library rather than standing in for it, so the rest of Home
 * survives losing the network.
 *
 * Returns an empty array when there is nothing downloaded, so callers can
 * append it unconditionally.
 */
export const buildOfflineHomeSections = (
    downloadedCollections: DownloadedCollectionSummary[],
    serverConnection: ServerAuthenticationResult | null,
): MobileHomeSection[] => {
    const items: MobileHomeItem[] = [];
    const sorted = [...downloadedCollections].sort(
        (left, right) => right.latestCompletedAt - left.latestCompletedAt,
    );

    for (const { collection } of sorted) {
        const source = getSourceFromSourceId(collection.sourceId, serverConnection);
        const type = ITEM_TYPE_FOR_COLLECTION[collection.type];
        if (!source || !type) {
            continue;
        }
        items.push({
            artworkImageId: collection.artworkImageId,
            artworkUrl: collection.artworkUrl,
            id: collection.id,
            source,
            subtitle: collection.subtitle,
            title: collection.title,
            type,
        });
    }

    if (items.length === 0) {
        return [];
    }

    return [
        {
            id: MobileHomeSectionId.DOWNLOADED,
            items,
            title: 'Downloaded',
        },
    ];
};
