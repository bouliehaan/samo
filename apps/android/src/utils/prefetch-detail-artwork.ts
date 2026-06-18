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
    serverConnection: ServerAuthenticationResult | null,
): void => {
    prefetchArtworkSource(
        resolveSamoItemArtworkSourceForDisplay(item, serverConnection),
    );
};

export const prefetchPlaybackArtwork = (
    item: Pick<
        MobilePlayableAudio,
        'artworkImageId' | 'artworkUrl' | 'contentSourceId' | 'id'
    > | null | undefined,
    serverConnection: ServerAuthenticationResult | null,
): void => {
    prefetchArtworkSource(resolvePlaybackArtworkSourceForDisplay(item, serverConnection));
};

export const prefetchDetailArtworkUrls = (
    detail: MobileMediaDetail,
    serverConnection: ServerAuthenticationResult | null,
    extraItems: ArtworkPrefetchItem[] = [],
): void => {
    prefetchArtworkForItem(
        {
            artworkImageId: detail.artworkImageId,
            artworkUrl: detail.artworkUrl,
            source: detail.source,
        },
        serverConnection,
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
        prefetchArtworkForItem(item, serverConnection);
    }
};

export const prefetchArtworkUrl = (
    item: ArtworkPrefetchItem,
    serverConnection: ServerAuthenticationResult | null,
): void => {
    prefetchArtworkForItem(item, serverConnection);
};
