import {
    type MobileContentSource,
    type MobileMediaDetail,
    type MobilePlayableAudio,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import {
    prefetchArtworkSource,
    resolvePlaybackArtworkSourceForDisplay,
    resolveSamoItemArtworkSourceForDisplay,
} from './samo-artwork-url';

const MAX_PREFETCH_URLS = 18;

export type ArtworkPrefetchItem = {
    artworkImageId?: string;
    artworkUrl?: string;
    source?: Pick<MobileContentSource, 'id' | 'type' | 'url'>;
};

export const prefetchArtworkForItem = (
    item: ArtworkPrefetchItem,
    serverConnections: ServerAuthenticationResult[],
): void => {
    prefetchArtworkSource(
        resolveSamoItemArtworkSourceForDisplay(item, serverConnections),
    );
};

export const prefetchPlaybackArtwork = (
    item: Pick<
        MobilePlayableAudio,
        'artworkImageId' | 'artworkUrl' | 'contentSourceId' | 'id'
    > | null | undefined,
    serverConnections: ServerAuthenticationResult[],
): void => {
    prefetchArtworkSource(resolvePlaybackArtworkSourceForDisplay(item, serverConnections));
};

export const prefetchDetailArtworkUrls = (
    detail: MobileMediaDetail,
    serverConnections: ServerAuthenticationResult[],
    extraItems: ArtworkPrefetchItem[] = [],
): void => {
    prefetchArtworkForItem(
        {
            artworkImageId: detail.artworkImageId,
            artworkUrl: detail.artworkUrl,
            source: detail.source,
        },
        serverConnections,
    );

    const seen = new Set<string>();
    const queue = [
        ...extraItems,
        ...(detail.items?.slice(0, MAX_PREFETCH_URLS) ?? []),
        ...(detail.topTracks?.slice(0, 8) ?? []).map((track) => ({
            artworkImageId: track.artworkImageId,
            artworkUrl: track.artworkUrl,
            source: detail.source,
        })),
        ...(detail.appearsOnItems?.slice(0, 6) ?? []),
        ...(detail.relatedArtists?.slice(0, 6) ?? []),
    ];

    for (const item of queue) {
        const key = `${item.source?.id ?? ''}:${item.artworkImageId ?? item.artworkUrl ?? ''}`;
        if (!key || seen.has(key)) {
            continue;
        }
        seen.add(key);
        prefetchArtworkForItem(item, serverConnections);
    }
};

export const prefetchArtworkUrl = (
    item: ArtworkPrefetchItem,
    serverConnections: ServerAuthenticationResult[],
): void => {
    prefetchArtworkForItem(item, serverConnections);
};
