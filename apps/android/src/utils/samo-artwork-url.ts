import {
    parsePodcastPlaybackEpisodeId,
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
    getSamoPodcastEpisodeStreamUrl,
    ensureSamoStreamToken,
    type ServerAuthenticationResult,
} from '@samo/core/server';

import { getArtworkLocalUri, peekArtworkLocalUri } from '../services/artwork-cache';
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

/**
 * True for a Samo `/api/v1/…` media URL that carries NO stream token. Such a
 * URL 401s for any fetcher that can't attach the Bearer header — notably the
 * native notification artwork loader. Callers should withhold the URL (or
 * mint first) rather than hand it to a header-less consumer.
 */
export const isSamoMediaUrlMissingStreamToken = (url: string | undefined): boolean => {
    if (!url) {
        return false;
    }
    try {
        const parsed = new URL(url);
        return (
            parsed.pathname.includes('/api/v1/') && !parsed.searchParams.has('stream_token')
        );
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
    serverConnection: ServerAuthenticationResult | null,
): ServerAuthenticationResult | undefined => {
    if (!url || !serverConnection) {
        return undefined;
    }
    return sameHost(serverConnection.url, url) ? serverConnection : undefined;
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
    const uri = typeof source === 'string' ? source : source.uri;
    // Already cached? A synchronous peek (a Map lookup) short-circuits with no
    // native call — keeps press-time prefetch from touching the bridge when the
    // bulk warm has already cached the cover. Only a miss kicks a download.
    if (!uri || peekArtworkLocalUri(uri)) {
        return;
    }
    void getArtworkLocalUri(uri, typeof source === 'string' ? undefined : source.headers);
};

export const resolveSamoArtworkUrlForDisplay = (
    artworkUrl: string | undefined,
    source: { id?: string; type?: ServerAuthenticationResult['type']; url?: string } | undefined,
    serverConnection: ServerAuthenticationResult | null,
): string | undefined => {
    if (!artworkUrl || !source) {
        return artworkUrl;
    }

    const auth = findServerAuthenticationForSource(serverConnection, source);
    if (!auth) {
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
    serverConnection: ServerAuthenticationResult | null,
): SamoArtworkImageSource | undefined => {
    if (!artworkImageId || !source) {
        return undefined;
    }

    const auth = findServerAuthenticationForSource(serverConnection, source);
    if (!auth) {
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

    return resolveSamoArtworkImageSourceForDisplay(url, source, serverConnection);
};

export const resolveSamoArtworkImageSourceForDisplay = (
    artworkUrl: string | undefined,
    source: Pick<MobileContentSource, 'id' | 'type' | 'url'> | undefined,
    serverConnection: ServerAuthenticationResult | null,
): SamoArtworkImageSource | undefined => {
    const resolvedUrl = resolveSamoArtworkUrlForDisplay(artworkUrl, source, serverConnection);
    if (!resolvedUrl) {
        return undefined;
    }

    const auth = findServerAuthenticationForSource(serverConnection, source);
    if (!auth || !isSamoApiMediaUrl(resolvedUrl)) {
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
    serverConnection: ServerAuthenticationResult | null,
): SamoArtworkImageSource | undefined => {
    return (
        resolveSamoArtworkFromImageId(item.artworkImageId, item.source, serverConnection) ??
        resolveSamoArtworkImageSourceForDisplay(item.artworkUrl, item.source, serverConnection)
    );
};

export const resolvePlaybackArtworkSourceForDisplay = (
    item: Pick<
        MobilePlayableAudio,
        'artworkImageId' | 'artworkUrl' | 'contentSourceId' | 'id'
    > | null | undefined,
    serverConnection: ServerAuthenticationResult | null,
): SamoArtworkImageSource | undefined => {
    if (!item) {
        return undefined;
    }

    const contentSource = getContentSourceFromPlaybackItem(item, serverConnection);
    return resolveSamoItemArtworkSourceForDisplay(
        {
            artworkImageId: item.artworkImageId,
            artworkUrl: getHighResolutionArtworkUrl(item.artworkUrl),
            source: contentSource,
        },
        serverConnection,
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
    serverConnection: ServerAuthenticationResult | null,
): Promise<MobilePlayableAudio> => {
    const contentSource = getContentSourceFromPlaybackItem(item, serverConnection);
    const sourceAuth = contentSource
        ? findServerAuthenticationForSource(serverConnection, contentSource)
        : undefined;
    const urlAuth =
        findAuthenticationForPlaybackUrl(item.url, serverConnection) ??
        findAuthenticationForPlaybackUrl(item.castUrl, serverConnection);
    const auth = sourceAuth ?? urlAuth;

    let streamToken: string | undefined;
    if (auth) {
        streamToken = await ensureSamoStreamToken(auth).catch(() => undefined);
    }

    const resolvedArtworkUrl =
        artworkSourceUri(resolvePlaybackArtworkSourceForDisplay(item, serverConnection)) ??
        item.artworkUrl;

    let nextUrl = item.url;
    let nextCastUrl = item.castUrl;
    let httpHeaders = item.httpHeaders;
    if (auth && streamToken) {
        const audiobookId =
            item.source === 'audiobook' ? parseSamoAudiobookIdFromPlaybackId(item.id) : undefined;
        if (audiobookId) {
            // Keep sub-second precision: a chapter seek's progressSeconds drives the
            // server's frame-accurate seek, so flooring it would cost up to a second.
            const bookStart = Math.max(0, item.progressOffsetSeconds ?? 0);
            nextUrl = getSamoAudiobookStreamUrl(auth, audiobookId, {
                progressSeconds: bookStart,
                streamToken,
            });
        } else if (item.source === 'podcast') {
            const episodeId = parsePodcastPlaybackEpisodeId(item.id);
            if (episodeId) {
                const resume = Math.max(0, Math.floor(item.progressOffsetSeconds ?? 0));
                nextUrl = getSamoPodcastEpisodeStreamUrl(auth, episodeId, {
                    ...(resume > 0 ? { offsetSeconds: resume } : {}),
                    streamToken,
                });
            } else {
                nextUrl = finalizeSamoMediaUrl(auth, item.url, streamToken) ?? item.url;
            }
        } else {
            nextUrl = finalizeSamoMediaUrl(auth, item.url, streamToken) ?? item.url;
        }
        if (item.castUrl) {
            nextCastUrl = finalizeSamoMediaUrl(auth, item.castUrl, streamToken) ?? item.castUrl;
        }
    } else if (auth) {
        const bearer = getSamoBearerToken(auth);
        if (bearer && (isSamoApiMediaUrl(item.url) || (item.castUrl && isSamoApiMediaUrl(item.castUrl)))) {
            httpHeaders = { ...httpHeaders, Authorization: `Bearer ${bearer}` };
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
    serverConnection: ServerAuthenticationResult | null,
): T => {
    const resolved = resolveSamoItemArtworkSourceForDisplay(item, serverConnection);
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
