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
    contentSource,
    fallbackStyle,
    letter,
    onLoad,
    serverConnections,
    source,
    style,
    transition = 0,
    uri,
}: {
    artworkImageId?: string;
    contentSource?: Pick<MobileContentSource, 'id' | 'type' | 'url'>;
    fallbackStyle?: StyleProp<ViewStyle>;
    letter: string;
    onLoad?: () => void;
    serverConnections?: ServerAuthenticationResult[];
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
    const resolvedConnections = serverConnections ?? contextConnections;
    const resolvedSource = useMemo((): ImageSource | string | undefined => {
        if (source) {
            return source;
        }

        if (contentSource && resolvedConnections.length > 0) {
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

    // A genuinely new cover (canonical identity changed) clears BOTH latches so
    // the fresh image gets a clean attempt.
    useEffect(() => {
        setErrored(false);
        setLocalFailed(false);
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
        if (!contentSource || resolvedConnections.length === 0) {
            return;
        }

        const auth = findServerAuthenticationForSource(resolvedConnections, contentSource);
        if (!auth || auth.type !== ServerType.SAMO || getCachedSamoStreamToken(auth)) {
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
            cachePolicy={useLocal ? 'memory' : 'memory-disk'}
            contentFit="cover"
            onError={() => {
                // A managed-cache file that went missing/corrupt falls back to
                // the remote source; a genuine remote failure shows the letter.
                if (useLocal) {
                    setLocalFailed(true);
                } else {
                    setErrored(true);
                }
            }}
            onLoad={onLoad}
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
