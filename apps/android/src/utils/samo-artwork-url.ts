import {
    parsePodcastPlaybackEpisodeId,
    parseSamoAudiobookIdFromPlaybackId,
    parseSamoAudiobookMediaFileIdFromPlaybackId,
    type MobileContentSource,
    type MobilePlayableAudio,
} from '@samo/core/mobile';
import {
    finalizeSamoMediaUrl,
    findServerAuthenticationForSource,
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
 * True for a samo `/api/v1/…` media URL that carries NO stream token. Such a
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

/*
 * THE DISPLAY PATH DOES NOT USE STREAM TOKENS.
 *
 * Every /api/v1 route on the server runs through `requireUser`, and its
 * `authenticateRequest` tries the Authorization bearer FIRST, falling back to
 * the `stream_token` query param only when the bearer is absent or invalid.
 * Cover routes included. So for any consumer that can send headers — expo-image
 * here, and expo-file-system's `downloadAsync` in the managed artwork cache —
 * the token in the URL was never doing any work.
 *
 * It was doing HARM. Stream tokens live in a process-local map on the server
 * (`internal/users/streamtokens.go`) with no persistence, so every server
 * restart revokes every outstanding token while this client is still holding
 * one it believes has half an hour left. Every cover URL built from it then
 * 401s at once — and because an image loader reports no status code, the only
 * available reading of that failure was "the token must be stale", which is how
 * a single missing cover came to invalidate the token cache for the whole app.
 *
 * A rotating credential in the URL also churned identity: it sat in the
 * memoization key here, so a token rotation cleared the entire resolved-artwork
 * cache and forced a full Home re-derive, twice per token cycle, for nothing.
 *
 * The token stays where it is genuinely load-bearing: `preparePlaybackItemForNative`
 * below, because the MediaSession/notification bitmap loader and the cast
 * receiver cannot send our headers.
 */

/** Internal: the URL half of the fallback path. Everything outside this module
 *  goes through `resolveSamoItemArtworkSourceForDisplay`, which is memoized —
 *  keep it that way, this one rebuilds from scratch on every call. */
const resolveSamoArtworkUrlForDisplay = (
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

    // No token, but still finalized: this is what re-homes a scan-time
    // loopback/hostname URL onto the origin the device actually connected with.
    return finalizeSamoMediaUrl(auth, artworkUrl);
};

const resolveSamoArtworkImageSourceForDisplay = (
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

/**
 * Memoized display source per (item identity × credentials).
 *
 * THE hot path of the app. Home re-derives its display sections on every
 * content/recents/connection change — a dozen-plus times on a cold boot — and
 * each derive resolved artwork for every item of every shelf plus every
 * persisted recent (~900 items), while each visible tile resolved its own
 * again. On device that measured ~0.4-0.9ms per item, i.e. most of a 0.5-1.5s
 * SYNCHRONOUS block on the render path, repeated. The answer is a pure
 * function of the item's ids and the current tokens, so it is computed once
 * and reused until the credentials rotate.
 *
 * Bounded: cleared wholesale when the credential key changes (a re-auth rebuilds
 * every URL's authorization anyway) and when it outgrows the cap, so it can
 * never grow into a leak on a large library.
 */
const RESOLVED_ARTWORK_CACHE_LIMIT = 4096;
const resolvedArtworkCache = new Map<string, SamoArtworkImageSource | undefined>();
let resolvedArtworkCacheKey = '';
let resolvedArtworkGeneration = 0;

const getResolvedArtworkCache = (credentialKey: string): Map<string, SamoArtworkImageSource | undefined> => {
    if (resolvedArtworkCacheKey !== credentialKey) {
        resolvedArtworkCacheKey = credentialKey;
        resolvedArtworkGeneration += 1;
        resolvedArtworkCache.clear();
    } else if (resolvedArtworkCache.size > RESOLVED_ARTWORK_CACHE_LIMIT) {
        resolvedArtworkCache.clear();
    }
    return resolvedArtworkCache;
};

/**
 * Bumped whenever the credentials behind every resolved URL change — which now
 * means a re-auth and nothing else. Callers that cache a DERIVED value — an item
 * with its artwork backfilled, say — stamp it with this and recompute when it
 * moves, instead of each keeping its own idea of when a URL went stale.
 */
export const getArtworkResolutionGeneration = (): number => resolvedArtworkGeneration;

export const resolveSamoItemArtworkSourceForDisplay = (
    item: {
        artworkImageId?: string;
        artworkUrl?: string;
        source?: Pick<MobileContentSource, 'id' | 'type' | 'url'>;
    },
    serverConnection: ServerAuthenticationResult | null,
): SamoArtworkImageSource | undefined => {
    const source = item.source;
    if (!source || (!item.artworkImageId && !item.artworkUrl)) {
        return undefined;
    }
    // ONE auth lookup for the whole resolve — the layered helpers below each
    // did their own (three per item, plus two redundant token finalizes).
    const auth = findServerAuthenticationForSource(serverConnection, source);
    if (!auth) {
        // Non-samo source: the stored URL is all there is, and it needs no
        // bearer — hand it over.
        //
        // NOT-YET-CONNECTED is a different case wearing the same clothes, and
        // handing the URL over there is a request that cannot succeed. A samo
        // /api/v1/ media URL with no stream token 401s for any consumer that
        // cannot attach the Bearer header, which is exactly what a bare string
        // source is. The tile then loaded a second time once the connection
        // resolved — measured through samo-proxy as three covers going 401 and
        // the same three URLs returning 200 about 120ms later. On the Android
        // client's no-reuse connection pool each of those wasted attempts is a
        // full TCP + TLS handshake.
        //
        // Withholding it renders the neutral tile the caller already shows
        // while artwork resolves, and the memo recomputes into a real source
        // the moment auth lands. Same one-frame placeholder, one request.
        return isSamoMediaUrlMissingStreamToken(item.artworkUrl)
            ? undefined
            : item.artworkUrl;
    }

    const bearer = getSamoBearerToken(auth);
    // The credential key no longer carries a stream token, so it only moves on
    // a genuine re-auth. It used to flip every time the cached token entered its
    // refresh lead window and again when the new one landed, and each flip threw
    // away all 4096 entries and bumped the generation Home keys its display
    // derive off — a full re-derive of every shelf, twice per token cycle,
    // caused entirely by a query param the display path did not need.
    const cache = getResolvedArtworkCache(`${auth.url}|${bearer ?? ''}`);
    const cacheKey = `${source.id ?? ''}|${item.artworkImageId ?? ''}|${item.artworkUrl ?? ''}`;
    const cached = cache.get(cacheKey);
    if (cached !== undefined || cache.has(cacheKey)) {
        return cached;
    }

    const resolved = resolveArtworkSourceUncached(item, auth, bearer, serverConnection);
    cache.set(cacheKey, resolved);
    return resolved;
};

const resolveArtworkSourceUncached = (
    item: {
        artworkImageId?: string;
        artworkUrl?: string;
        source?: Pick<MobileContentSource, 'id' | 'type' | 'url'>;
    },
    auth: ServerAuthenticationResult,
    bearer: string | undefined,
    serverConnection: ServerAuthenticationResult | null,
): SamoArtworkImageSource | undefined => {
    if (item.artworkImageId) {
        // Built straight from the id, so the route is by construction
        // `/api/v1/…` and already homed on the connected origin — nothing to
        // re-finalize and nothing to parse back out to classify. The bearer is
        // what authenticates it.
        const url = getSamoMetadataImageUrl(auth, item.artworkImageId);
        if (url) {
            return bearer ? { headers: { Authorization: `Bearer ${bearer}` }, uri: url } : url;
        }
    }
    return resolveSamoArtworkImageSourceForDisplay(item.artworkUrl, item.source, serverConnection);
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
 * The artwork URL for a HEADER-LESS consumer — the MediaSession/notification
 * bitmap loader, ExoPlayer, the cast receiver. None of them can send our bearer,
 * so this is the one artwork path that still embeds a stream token.
 *
 * It builds on the display resolver rather than duplicating it: that already
 * re-homes the URL onto the connected origin and picks the right cover for the
 * item, and the only thing left to add is the credential this consumer needs.
 * Keeping it a separate, explicitly-named function is the point — the token is
 * now something a caller has to ASK for, so no future edit can quietly put one
 * back on the display path (where it authenticates nothing and only churns
 * cache identity), and no future edit can quietly take one off here (where its
 * absence is a grey lock screen).
 */
export const resolveNativeArtworkUrl = (
    item: Pick<
        MobilePlayableAudio,
        'artworkImageId' | 'artworkUrl' | 'contentSourceId' | 'id'
    > | null | undefined,
    serverConnection: ServerAuthenticationResult | null,
    streamToken: string | undefined,
): string | undefined => {
    const resolved = artworkSourceUri(
        resolvePlaybackArtworkSourceForDisplay(item, serverConnection),
    );
    if (!resolved || !streamToken || !item) {
        return resolved;
    }
    const contentSource = getContentSourceFromPlaybackItem(item, serverConnection);
    const auth = contentSource
        ? findServerAuthenticationForSource(serverConnection, contentSource)
        : undefined;
    if (!auth || !isSamoApiMediaUrl(resolved)) {
        return resolved;
    }
    return finalizeSamoMediaUrl(auth, resolved, streamToken) ?? resolved;
};

/**
 * Native MediaSession / lock-screen artwork can't send Bearer headers — embed
 * a fresh stream token (or absolute URL) before handing art to ExoPlayer.
 *
 * Queue items keep the stream URL they were built with. samo stream tokens
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

    // Lock-screen / notification artwork.
    //
    // DO NOT hand native a `peekArtworkLocalUri` path here. That index is
    // in-memory and its own contract says so: "Assumes the file exists for a
    // tracked entry; display code falls back to the remote URL if the local
    // file turns out to be missing." `ArtworkImage` HAS that fallback — the
    // media session does NOT. Substituting the cached file here produced a
    // stream of `FileNotFoundException ... ENOENT` from the notification's
    // bitmap loader with nothing to recover to, i.e. a worse coverless lock
    // screen than the problem it was meant to fix. Native gets the remote URL;
    // it re-mints and re-freshens that URL on its own timer.
    const resolvedArtworkUrl =
        resolveNativeArtworkUrl(item, serverConnection, streamToken) ?? item.artworkUrl;

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
                // Must survive the re-token: the queue item was BUILT against one
                // specific file, and dropping the id here asked the server for a
                // different stream than the one every offset/duration on the item
                // describes. Native's own re-mint (SamoNativeStreamUrl) keeps it —
                // the two rebuilds have to agree or they point at different audio.
                mediaFileId: parseSamoAudiobookMediaFileIdFromPlaybackId(item.id),
                // Same shape as native: only send a real seek, so a plain play of
                // file N asks for the file whole rather than a seek to its start.
                ...(bookStart > 0 ? { progressSeconds: bookStart } : {}),
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
