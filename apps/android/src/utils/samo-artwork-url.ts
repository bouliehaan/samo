import { Image as ExpoImage } from 'expo-image';

import { type MobileContentSource, type MobilePlayableAudio } from '@samo/core/mobile';
import {
    finalizeSamoMediaUrl,
    findServerAuthenticationForSource,
    getCachedSamoStreamToken,
    getSamoBearerToken,
    getSamoMetadataImageUrl,
    ensureSamoStreamToken,
    ServerType,
    type ServerAuthenticationResult,
} from '@samo/core/server';

import { getHighResolutionArtworkUrl } from './artwork-url';
import { getContentSourceFromPlaybackItem } from './content-source';

export type SamoArtworkImageSource =
    | string
    | {
          headers: Record<string, string>;
          uri: string;
      };

const isSamoApiMediaUrl = (url: string): boolean => {
    try {
        return new URL(url).pathname.includes('/api/v1/');
    } catch {
        return false;
    }
};

export const artworkSourceUri = (
    source: SamoArtworkImageSource | undefined,
): string | undefined => {
    if (!source) {
        return undefined;
    }
    if (typeof source === 'string') {
        return source;
    }
    return source.uri;
};

export const prefetchArtworkSource = (source: SamoArtworkImageSource | undefined): void => {
    if (!source) {
        return;
    }
    if (typeof source === 'string') {
        void ExpoImage.prefetch(source, 'memory-disk');
        return;
    }
    if (source.uri) {
        void ExpoImage.prefetch(source.uri, 'memory-disk');
    }
};

export const resolveSamoArtworkUrlForDisplay = (
    artworkUrl: string | undefined,
    source: { id?: string; type?: ServerAuthenticationResult['type']; url?: string } | undefined,
    serverConnections: ServerAuthenticationResult[],
): string | undefined => {
    if (!artworkUrl || !source) {
        return artworkUrl;
    }

    const auth = findServerAuthenticationForSource(serverConnections, source);
    if (!auth || auth.type !== ServerType.SAMO) {
        return artworkUrl;
    }

    return finalizeSamoMediaUrl(
        auth,
        artworkUrl,
        getCachedSamoStreamToken(auth),
    );
};

export const resolveSamoArtworkFromImageId = (
    artworkImageId: string | undefined,
    source: Pick<MobileContentSource, 'id' | 'type' | 'url'> | undefined,
    serverConnections: ServerAuthenticationResult[],
): SamoArtworkImageSource | undefined => {
    if (!artworkImageId || !source) {
        return undefined;
    }

    const auth = findServerAuthenticationForSource(serverConnections, source);
    if (!auth || auth.type !== ServerType.SAMO) {
        return undefined;
    }

    const streamToken = getCachedSamoStreamToken(auth);
    const url = finalizeSamoMediaUrl(
        auth,
        getSamoMetadataImageUrl(auth, artworkImageId, streamToken),
        streamToken,
    );

    if (!url) {
        return undefined;
    }

    return resolveSamoArtworkImageSourceForDisplay(url, source, serverConnections);
};

export const resolveSamoArtworkImageSourceForDisplay = (
    artworkUrl: string | undefined,
    source: Pick<MobileContentSource, 'id' | 'type' | 'url'> | undefined,
    serverConnections: ServerAuthenticationResult[],
): SamoArtworkImageSource | undefined => {
    const resolvedUrl = resolveSamoArtworkUrlForDisplay(artworkUrl, source, serverConnections);
    if (!resolvedUrl) {
        return undefined;
    }

    const auth = findServerAuthenticationForSource(serverConnections, source);
    if (!auth || auth.type !== ServerType.SAMO || !isSamoApiMediaUrl(resolvedUrl)) {
        return resolvedUrl;
    }

    const bearer = getSamoBearerToken(auth);
    if (!bearer) {
        return resolvedUrl;
    }

    return {
        headers: {
            Authorization: `Bearer ${bearer}`,
        },
        uri: resolvedUrl,
    };
};

export const resolveSamoItemArtworkSourceForDisplay = (
    item: {
        artworkImageId?: string;
        artworkUrl?: string;
        source?: Pick<MobileContentSource, 'id' | 'type' | 'url'>;
    },
    serverConnections: ServerAuthenticationResult[],
): SamoArtworkImageSource | undefined => {
    return (
        resolveSamoArtworkFromImageId(item.artworkImageId, item.source, serverConnections) ??
        resolveSamoArtworkImageSourceForDisplay(item.artworkUrl, item.source, serverConnections)
    );
};

export const resolvePlaybackArtworkSourceForDisplay = (
    item: Pick<
        MobilePlayableAudio,
        'artworkImageId' | 'artworkUrl' | 'contentSourceId' | 'id'
    > | null | undefined,
    serverConnections: ServerAuthenticationResult[],
): SamoArtworkImageSource | undefined => {
    if (!item) {
        return undefined;
    }

    const contentSource = getContentSourceFromPlaybackItem(item, serverConnections);
    return resolveSamoItemArtworkSourceForDisplay(
        {
            artworkImageId: item.artworkImageId,
            artworkUrl: getHighResolutionArtworkUrl(item.artworkUrl),
            source: contentSource,
        },
        serverConnections,
    );
};

/**
 * Native MediaSession / lock-screen artwork can't send Bearer headers — embed
 * a fresh stream token (or absolute URL) before handing art to ExoPlayer.
 *
 * Queue items keep the stream URL they were built with. Samo stream tokens
 * expire after ~30 minutes, so each track start must rewrite `url` (and
 * `castUrl` when present) with a current token or auto-advance dies mid-queue.
 */
export const preparePlaybackItemForNative = async (
    item: MobilePlayableAudio,
    serverConnections: ServerAuthenticationResult[],
): Promise<MobilePlayableAudio> => {
    const contentSource = getContentSourceFromPlaybackItem(item, serverConnections);
    const auth = contentSource
        ? findServerAuthenticationForSource(serverConnections, contentSource)
        : undefined;

    let streamToken: string | undefined;
    if (auth?.type === ServerType.SAMO) {
        streamToken = await ensureSamoStreamToken(auth).catch(() => undefined);
    }

    const resolvedArtworkUrl =
        artworkSourceUri(resolvePlaybackArtworkSourceForDisplay(item, serverConnections)) ??
        item.artworkUrl;

    let nextUrl = item.url;
    let nextCastUrl = item.castUrl;
    if (auth?.type === ServerType.SAMO && streamToken) {
        nextUrl = finalizeSamoMediaUrl(auth, item.url, streamToken) ?? item.url;
        if (item.castUrl) {
            nextCastUrl = finalizeSamoMediaUrl(auth, item.castUrl, streamToken) ?? item.castUrl;
        }
    }

    if (
        resolvedArtworkUrl === item.artworkUrl &&
        nextUrl === item.url &&
        nextCastUrl === item.castUrl
    ) {
        return item;
    }

    return {
        ...item,
        artworkUrl: resolvedArtworkUrl,
        ...(nextUrl !== item.url ? { url: nextUrl } : {}),
        ...(nextCastUrl !== item.castUrl ? { castUrl: nextCastUrl } : {}),
    };
};

export const backfillItemArtworkFields = <
    T extends {
        artworkImageId?: string;
        artworkUrl?: string;
        source?: Pick<MobileContentSource, 'id' | 'type' | 'url'>;
    },
>(
    item: T,
    serverConnections: ServerAuthenticationResult[],
): T => {
    const resolved = resolveSamoItemArtworkSourceForDisplay(item, serverConnections);
    const artworkUrl =
        typeof resolved === 'string' ? resolved : resolved?.uri ?? item.artworkUrl;

    if (!artworkUrl && !item.artworkImageId) {
        return item;
    }

    if (artworkUrl === item.artworkUrl) {
        return item;
    }

    return {
        ...item,
        artworkUrl,
    };
};
