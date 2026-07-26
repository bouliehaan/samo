import { Image as ExpoImage, type ImageSource } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    type ImageStyle,
    type StyleProp,
    Text,
    View,
    type ViewStyle,
} from 'react-native';

import { type MobileContentSource } from '@samo/core/mobile';
import {
    clearSamoStreamTokenCache,
    ensureSamoStreamToken,
    findServerAuthenticationForSource,
    getCachedSamoStreamToken,
    ServerType,
    type ServerAuthenticationResult,
} from '@samo/core/server';

import { useServerConnections } from '../contexts/server-connections';
import { peekArtworkLocalUri } from '../services/artwork-cache';
import { canonicalArtworkKey } from '../utils/artwork-canonical';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { resolveSamoItemArtworkSourceForDisplay } from '../utils/samo-artwork-url';

/**
 * Artwork tile backed by expo-image so cover art decodes and recycles like a
 * native app. List/grid covers opt into disk cache too so returning from a
 * detail page does not have to refetch visible album art over LAN.
 */
export const ArtworkImage = ({
    artworkImageId,
    blurRadius,
    contentSource,
    decodeFormat,
    fallbackStyle,
    letter,
    onLoad,
    serverConnection,
    source,
    style,
    transition = 0,
    uri,
}: {
    artworkImageId?: string;
    /**
     * Android decode color space. `'rgb'` decodes to 16-bit RGB_565 (no alpha),
     * halving the decoded bitmap's memory + GPU-upload bytes versus the default
     * 32-bit `'argb'`. Opaque cover art shows no visible difference at tile size,
     * so dense recycling grids pass `'rgb'` to double how many covers stay in the
     * memory cache before eviction (fewer re-decodes / less blank-on-scroll-back),
     * while large heroes keep `'argb'` where gradient banding could surface.
     */
    decodeFormat?: 'argb' | 'rgb';
    /** Blur the decoded cover (for artwork used as a backdrop wash, not as a
     *  picture). Applied natively by expo-image — no extra render pass here. */
    blurRadius?: number;
    contentSource?: Pick<MobileContentSource, 'id' | 'type' | 'url'>;
    fallbackStyle?: StyleProp<ViewStyle>;
    letter: string;
    onLoad?: () => void;
    serverConnection?: ServerAuthenticationResult | null;
    source?: ImageSource | string;
    style: StyleProp<ImageStyle>;
    /**
     * Crossfade duration (ms) when the cover changes in place — e.g. the
     * now-playing artwork dissolving track→track. Defaults to 0 (hard swap) so
     * dense, recycled list/grid tiles pay no transition cost during scroll.
     */
    transition?: number;
    uri?: string;
}) => {
    const [errored, setErrored] = useState(false);
    const [streamTokenRevision, setStreamTokenRevision] = useState(0);
    const contextConnections = useServerConnections();
    const resolvedConnections = serverConnection ?? contextConnections;
    const resolvedSource = useMemo((): ImageSource | string | undefined => {
        if (source) {
            return source;
        }

        if (contentSource && resolvedConnections) {
            const fromItem = resolveSamoItemArtworkSourceForDisplay(
                { artworkImageId, artworkUrl: uri, source: contentSource },
                resolvedConnections,
            );
            if (fromItem) {
                return fromItem;
            }
        }

        return uri;
    }, [
        artworkImageId,
        contentSource,
        resolvedConnections,
        source,
        streamTokenRevision,
        uri,
    ]);
    const remoteUri =
        typeof resolvedSource === 'string' ? resolvedSource : resolvedSource?.uri;

    // Stable image identity (stream token stripped). Drives the recycling key,
    // the cache-peek pin, and the expo-image cacheKey so a rotated token never
    // resets the native view, re-decodes, or re-downloads the same cover.
    const canonicalKey = useMemo(
        () => (remoteUri ? canonicalArtworkKey(remoteUri) : undefined),
        [remoteUri],
    );

    // Cover art is cached proactively in bulk after a sync (see
    // services/artwork-prefetch). On the render path we only do a SYNCHRONOUS
    // peek — a hit shows the local file instantly (offline, even); a miss shows
    // the remote source via expo-image's native memory-disk pipeline. We never
    // kick a per-tile download here, so a tile-dense screen (Home) can't flood
    // the bridge. Pin the choice once per cover so the image never swaps mid-view.
    const pinnedRef = useRef<{ key: string | undefined; uri: string | null }>({
        key: undefined,
        uri: null,
    });
    if (pinnedRef.current.key !== canonicalKey) {
        pinnedRef.current = {
            key: canonicalKey,
            uri: remoteUri ? peekArtworkLocalUri(remoteUri) : null,
        };
    }
    const pinnedLocalUri = pinnedRef.current.uri;
    const [localFailed, setLocalFailed] = useState(false);
    // One forced token re-mint per cover identity — recovers from a stale-token
    // 401 (server rotated the token but our cache still held the old one) without
    // flip-flopping into an infinite retry.
    const remoteRetriedRef = useRef(false);

    // A genuinely new cover (canonical identity changed) clears BOTH latches so
    // the fresh image gets a clean attempt.
    useEffect(() => {
        setErrored(false);
        setLocalFailed(false);
        remoteRetriedRef.current = false;
    }, [canonicalKey]);

    // A stream-token refresh changes the remote URL but NOT the canonical key.
    // Clear only the REMOTE latch so a load that failed on a stale token retries
    // with the fresh one — without touching localFailed, which would flip-flop a
    // genuinely-missing local file on every rotation.
    useEffect(() => {
        setErrored(false);
    }, [remoteUri]);

    const useLocal = Boolean(pinnedLocalUri) && !localFailed;

    // Hand expo-image a source carrying the canonical cacheKey so the local
    // file:// and the remote URL resolve to ONE cache entry — swapping between
    // them (or rotating the token) is seamless instead of a fresh decode.
    const displaySource = useMemo((): ImageSource | undefined => {
        if (useLocal && pinnedLocalUri) {
            return canonicalKey
                ? { cacheKey: canonicalKey, uri: pinnedLocalUri }
                : { uri: pinnedLocalUri };
        }
        if (!resolvedSource) {
            return undefined;
        }
        const base: ImageSource =
            typeof resolvedSource === 'string' ? { uri: resolvedSource } : resolvedSource;
        return canonicalKey ? { ...base, cacheKey: canonicalKey } : base;
    }, [canonicalKey, pinnedLocalUri, resolvedSource, useLocal]);

    useEffect(() => {
        if (!contentSource || !resolvedConnections) {
            return;
        }

        const auth = findServerAuthenticationForSource(resolvedConnections, contentSource);
        if (!auth || getCachedSamoStreamToken(auth)) {
            return;
        }

        let cancelled = false;
        void ensureSamoStreamToken(auth)
            .then(() => {
                if (!cancelled) {
                    setStreamTokenRevision((current) => current + 1);
                }
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [contentSource, canonicalKey, resolvedConnections]);

    // The letter fallback is reserved for art that has genuinely FAILED or that
    // does not exist. While a cover that DOES exist is still resolving (the
    // server connection / stream token is mid-flight), show a neutral tile so we
    // never flash a letter and then swap in the cover a frame later.
    const hasArtworkIdentity = Boolean(source || artworkImageId || uri);
    if (errored || (!displaySource && !hasArtworkIdentity)) {
        return (
            <View
                style={[
                    style as StyleProp<ViewStyle>,
                    styles.artworkImageFallback,
                    fallbackStyle,
                ]}
            >
                <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>
                    {letter}
                </Text>
            </View>
        );
    }
    if (!displaySource) {
        return (
            <View
                style={[
                    style as StyleProp<ViewStyle>,
                    styles.artworkImageFallback,
                    fallbackStyle,
                ]}
            />
        );
    }

    return (
        <ExpoImage
            blurRadius={blurRadius}
            cachePolicy={useLocal ? 'memory' : 'memory-disk'}
            contentFit="cover"
            decodeFormat={decodeFormat}
            onError={() => {
                // A managed-cache file that went missing/corrupt falls back to
                // the remote source.
                if (useLocal) {
                    setLocalFailed(true);
                    return;
                }
                // A remote failure on a Samo cover is usually a STALE stream token:
                // the server rotated it but our cache still held the old one, so
                // the re-mint effect (which only fires when NO token is cached)
                // never ran and the URL keeps 401-ing. Force ONE re-mint + retry
                // before giving up to the letter — this is the "mini sometimes
                // loses its artwork" fix.
                if (contentSource && resolvedConnections && !remoteRetriedRef.current) {
                    const auth = findServerAuthenticationForSource(
                        resolvedConnections,
                        contentSource,
                    );
                    if (auth) {
                        remoteRetriedRef.current = true;
                        clearSamoStreamTokenCache(auth);
                        void ensureSamoStreamToken(auth)
                            .then(() => setStreamTokenRevision((current) => current + 1))
                            .catch(() => setErrored(true));
                        return;
                    }
                }
                setErrored(true);
            }}
            onLoad={onLoad}
            // The cached file as the placeholder: a FRESHLY MOUNTED expo-image
            // paints nothing on its first frame while it (re)resolves the source,
            // even when that source is already in cache. That one blank frame is
            // the "artwork flashes after the skeleton swaps to the detail page" —
            // the detail hero is a brand-new view, so it pays the mount cost. With
            // the same cached file handed in as the placeholder, the new view shows
            // the cover immediately instead of blank, then resolves the identical
            // source underneath (no visible change). Only set when we actually have
            // a local file, so an uncached tile still falls through to its letter.
            placeholder={pinnedLocalUri ? { uri: pinnedLocalUri } : undefined}
            placeholderContentFit="cover"
            // A crossfade needs the SAME native view to persist across source
            // changes. recyclingKey forces a fresh view (list tiles use it so a
            // recycled row never flashes the previous cover), which would cancel
            // the fade — so drop it whenever we're transitioning in place.
            recyclingKey={transition > 0 ? undefined : canonicalKey}
            source={displaySource}
            style={style}
            transition={transition}
        />
    );
};
