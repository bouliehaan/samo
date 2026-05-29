import { Image as ExpoImage } from 'expo-image';

import {
    parseSamoAudiobookIdFromPlaybackId,
    type MobileContentSource,
    type MobilePlayableAudio,
} from '@samo/core/mobile';
import {
    finalizeSamoMediaUrl,
    findServerAuthenticationForSource,
    getCachedSamoStreamToken,
    getSamoBearerToken,
    getSamoAudiobookStreamUrl,
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

const sameHost = (left: string, right: string): boolean => {
    try {
        return new URL(left).host === new URL(right).host;
    } catch {
        return false;
    }
};

const findAuthenticationForPlaybackUrl = (
    url: string | undefined,
    serverConnections: ServerAuthenticationResult[],
): ServerAuthenticationResult | undefined => {
    if (!url) {
        return undefined;
    }
    return serverConnections.find((candidate) => sameHost(candidate.url, url));
};

const finalizeAudiobookshelfPlaybackUrl = (
    authentication: ServerAuthenticationResult,
    url: string | undefined,
): string | undefined => {
    if (!url || authentication.type !== ServerType.AUDIOBOOKSHELF) {
        return url;
    }

    try {
        const parsed = new URL(url);
        const hasToken = parsed.searchParams.has('token');
        const likelyAbsStream = parsed.pathname.includes('/api/') || hasToken;
        if (!likelyAbsStream) {
            return url;
        }
        if (!sameHost(authentication.url, url)) {
            return url;
        }
        parsed.searchParams.set('token', authentication.credential);
        return parsed.toString();
    } catch {
        return url;
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
    const sourceAuth = contentSource
        ? findServerAuthenticationForSource(serverConnections, contentSource)
        : undefined;
    const urlAuth =
        findAuthenticationForPlaybackUrl(item.url, serverConnections) ??
        findAuthenticationForPlaybackUrl(item.castUrl, serverConnections);
    const auth = sourceAuth ?? urlAuth;

    let streamToken: string | undefined;
    if (auth?.type === ServerType.SAMO) {
        streamToken = await ensureSamoStreamToken(auth).catch(() => undefined);
    }

    const resolvedArtworkUrl =
        artworkSourceUri(resolvePlaybackArtworkSourceForDisplay(item, serverConnections)) ??
        item.artworkUrl;

    let nextUrl = item.url;
    let nextCastUrl = item.castUrl;
    let httpHeaders = item.httpHeaders;
    if (auth?.type === ServerType.SAMO && streamToken) {
        const audiobookId =
            item.source === 'audiobook' ? parseSamoAudiobookIdFromPlaybackId(item.id) : undefined;
        if (audiobookId) {
            const bookStart = Math.max(0, Math.floor(item.progressOffsetSeconds ?? 0));
            nextUrl = getSamoAudiobookStreamUrl(auth, audiobookId, {
                progressSeconds: bookStart,
                streamToken,
            });
        } else {
            nextUrl = finalizeSamoMediaUrl(auth, item.url, streamToken) ?? item.url;
        }
        if (item.castUrl) {
            nextCastUrl = finalizeSamoMediaUrl(auth, item.castUrl, streamToken) ?? item.castUrl;
        }
    } else if (auth?.type === ServerType.SAMO) {
        const bearer = getSamoBearerToken(auth);
        if (bearer && (isSamoApiMediaUrl(item.url) || (item.castUrl && isSamoApiMediaUrl(item.castUrl)))) {
            httpHeaders = { ...httpHeaders, Authorization: `Bearer ${bearer}` };
        }
    } else if (auth?.type === ServerType.AUDIOBOOKSHELF) {
        nextUrl = finalizeAudiobookshelfPlaybackUrl(auth, item.url) ?? item.url;
        if (item.castUrl) {
            nextCastUrl =
                finalizeAudiobookshelfPlaybackUrl(auth, item.castUrl) ?? item.castUrl;
        }
    }

    if (
        resolvedArtworkUrl === item.artworkUrl &&
        nextUrl === item.url &&
        nextCastUrl === item.castUrl &&
        httpHeaders === item.httpHeaders
    ) {
        return item;
    }

    return {
        ...item,
        artworkUrl: resolvedArtworkUrl,
        ...(httpHeaders !== item.httpHeaders ? { httpHeaders } : {}),
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
