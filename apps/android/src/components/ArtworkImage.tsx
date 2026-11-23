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
import { type ServerAuthenticationResult } from '@samo/core/server';

import { useServerConnections } from '../contexts/server-connections';
import {
    type ArtworkCopy,
    peekArtworkCopy,
    subscribeArtworkIndex,
} from '../services/artwork-cache';
import { canonicalArtworkKey } from '../utils/artwork-canonical';
import { getArtworkWidth, sizeArtworkSource } from '../utils/artwork-size';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import {
    isSamoMediaUrlMissingStreamToken,
    resolveSamoItemArtworkSourceForDisplay,
} from '../utils/samo-artwork-url';

/**
 * Artwork tile backed by expo-image so cover art decodes and recycles like a
 * native app. List/grid covers opt into disk cache too so returning from a
 * detail page does not have to refetch visible album art over LAN.
 */
export const ArtworkImage = ({
    artworkImageId,
    blurRadius,
    contentSource,
    decodeFormat = 'rgb',
    fallbackStyle,
    instantPlaceholder = false,
    letter,
    onLoad,
    serverConnection,
    source,
    style,
    transition = 0,
    uri,
    width,
}: {
    artworkImageId?: string;
    /**
     * Android decode color space. Defaults to `'rgb'` (16-bit RGB_565, no alpha),
     * halving the decoded bitmap's memory + GPU-upload bytes versus 32-bit
     * `'argb'`. Opaque cover art shows no visible difference at tile size, so
     * this halves memory for every tile. Large heroes or blurred backdrop washes
     * should pass `'argb'` where gradient banding or alpha compositing matters.
     *
     * When a `blurRadius` is set and no explicit format is given, the component
     * automatically upgrades to `'argb'` — blurred layers composite with the
     * background and banding is visible at low-frequency gradients.
     */
    decodeFormat?: 'argb' | 'rgb';
    /** Blur the decoded cover (for artwork used as a backdrop wash, not as a
     *  picture). Applied natively by expo-image — no extra render pass here. */
    blurRadius?: number;
    contentSource?: Pick<MobileContentSource, 'id' | 'type' | 'url'>;
    fallbackStyle?: StyleProp<ViewStyle>;
    /**
     * Paint the cached file on the very first frame instead of one frame of
     * blank.
     *
     * THE ONLY LEGITIMATE USE IS A LARGE IMAGE THAT MOUNTS ALONE, ONCE, AND IS
     * IMMEDIATELY REPLACED — which in this app means exactly the two media-detail
     * heroes, where the skeleton swaps to real content and a blank frame is
     * visible. It is currently set nowhere else, ON PURPOSE.
     *
     * The cost (detailed at `placeholder` below) is a second, parallel decode of
     * the same file at FULL SOURCE RESOLUTION in 32-bit. It scales with the
     * SOURCE, not with the view, so a 58dp mini-player thumb pays exactly as much
     * as a full-screen hero — which is why it was wrong on the player surfaces
     * and got removed from them. And anything long-lived keeps that oversized
     * bitmap alive, and hands it to Glide's bitmap pool on release, where one
     * such bitmap can evict the entire pool.
     *
     * Before adding it anywhere: is the image large, freshly mounted, short-lived
     * on screen in placeholder form, and does a blank first frame actually read
     * as a bug? If any answer is no, leave it off.
     *
     * A slot wider than the cache keeps covers at needs no opt-in: it shows the
     * smaller cached cover while its own size loads (see `placeholder` below).
     */
    instantPlaceholder?: boolean;
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
    /**
     * How wide the slot is, in dp. A samo cover is sent at about the size it
     * is drawn (`sizeArtworkSource`) rather than as stored, which for a TV
     * tile meant decoding a 1400-3000px original to show under 300px, and for
     * a phone row a 3000px one to show 150px.
     *
     * Required, so no slot can forget it. A slot wider than the server's
     * largest size (the zoom) gets the cover as stored.
     */
    width: number;
}) => {
    const [errored, setErrored] = useState(false);
    const contextConnections = useServerConnections();
    const resolvedConnections = serverConnection ?? contextConnections;
    const slotWidth = getArtworkWidth(width);
    const resolvedSource = useMemo((): ImageSource | string | undefined => {
        if (typeof source === 'string') {
            return sizeArtworkSource(source, width);
        }
        if (source) {
            const { uri: sourceUri } = source;
            return sourceUri ? sizeArtworkSource({ ...source, uri: sourceUri }, width) : source;
        }

        if (contentSource && resolvedConnections) {
            const fromItem = resolveSamoItemArtworkSourceForDisplay(
                { artworkImageId, artworkUrl: uri, source: contentSource },
                resolvedConnections,
            );
            if (fromItem) {
                return sizeArtworkSource(fromItem, width);
            }
        }

        // The same withholding the resolver does, for the paths that never
        // reach it: no contentSource to resolve against, or connections that
        // have not loaded yet. A bare string source carries no headers, so a
        // samo /api/v1/ URL without a stream token is a request that can only
        // 401 and then be retried once auth lands.
        if (isSamoMediaUrlMissingStreamToken(uri)) {
            return undefined;
        }
        return sizeArtworkSource(uri, width);
    }, [artworkImageId, contentSource, resolvedConnections, source, uri, width]);
    const remoteUri =
        typeof resolvedSource === 'string' ? resolvedSource : resolvedSource?.uri;

    // Stable image identity. Drives the recycling key, the cache-peek pin, and
    // the expo-image cacheKey so the same cover is one entry everywhere. It
    // still strips `stream_token` — display URLs no longer carry one, but the
    // managed cache on disk was keyed this way and older entries (and the
    // header-less playback paths) can still present a tokenised URL here.
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
    //
    // `indexEpoch` is the ONE thing allowed to re-run that peek for an unchanged
    // cover, and only while the pin says MISS. The index loads asynchronously at
    // boot, so during the exact window when the most tiles mount, the peek can
    // only answer null — and pinning that answer meant a whole first screen of
    // already-cached art was fetched over the network for the lifetime of those
    // views. Re-peeking a miss costs a Map lookup and can only ever improve the
    // answer; a HIT is never re-peeked, so the pin still does its real job of
    // never swapping a visible image out from under the viewer.
    //
    // The cache keeps each cover at one width (COVER_CACHE_WIDTH), so a hit
    // can be a copy smaller than this slot draws. That copy is not drawn as
    // the slot's picture: the slot loads its own size and shows the copy
    // while it does, and draws the copy only if its own size cannot be had.
    const [indexEpoch, setIndexEpoch] = useState(0);
    const pinnedRef = useRef<{
        copy: ArtworkCopy | null;
        epoch: number;
        key: string | undefined;
    }>({
        copy: null,
        epoch: -1,
        key: undefined,
    });
    if (
        pinnedRef.current.key !== canonicalKey ||
        (pinnedRef.current.copy === null && pinnedRef.current.epoch !== indexEpoch)
    ) {
        pinnedRef.current = {
            copy: remoteUri ? peekArtworkCopy(remoteUri, slotWidth) : null,
            epoch: indexEpoch,
            key: canonicalKey,
        };
    }
    const pinnedCopy = pinnedRef.current.copy;
    const [localFailed, setLocalFailed] = useState(false);

    // Only subscribe while this tile is actually waiting on the cache. A hit has
    // nothing left to learn, so a warm-cache screen registers no listeners at
    // all and the notification costs nothing.
    useEffect(() => {
        if (pinnedCopy !== null || !remoteUri) {
            return;
        }
        return subscribeArtworkIndex(() => setIndexEpoch((current) => current + 1));
    }, [pinnedCopy, remoteUri]);

    // A genuinely new cover (canonical identity changed) clears BOTH latches so
    // the fresh image gets a clean attempt.
    useEffect(() => {
        setErrored(false);
        setLocalFailed(false);
    }, [canonicalKey]);

    // The remote URL can change without the canonical key moving (a re-auth
    // re-homes it, say). Clear only the REMOTE latch so a load that failed
    // against the old URL retries against the new one — without touching
    // localFailed, which would flip-flop a genuinely-missing local file.
    useEffect(() => {
        setErrored(false);
    }, [remoteUri]);

    const copy = localFailed ? null : pinnedCopy;
    // A copy too small for the slot is still drawn once the slot's own size
    // has failed (offline, say): a softer cover beats a letter.
    const useLocal = copy !== null && (copy.wideEnough || errored);

    // Hand expo-image a source carrying the canonical cacheKey so the local
    // file:// and the remote URL resolve to ONE cache entry — swapping between
    // them (or rotating the token) is seamless instead of a fresh decode.
    // Except for a copy standing in for a larger cover: remembered under the
    // larger one's key, it would be what that slot drew from memory from then on.
    const displaySource = useMemo((): ImageSource | undefined => {
        if (useLocal && copy) {
            return canonicalKey && copy.wideEnough
                ? { cacheKey: canonicalKey, uri: copy.uri }
                : { uri: copy.uri };
        }
        if (!resolvedSource) {
            return undefined;
        }
        const base: ImageSource =
            typeof resolvedSource === 'string' ? { uri: resolvedSource } : resolvedSource;
        return canonicalKey ? { ...base, cacheKey: canonicalKey } : base;
    }, [canonicalKey, copy, resolvedSource, useLocal]);

    // The letter fallback is reserved for art that has genuinely FAILED or that
    // does not exist. While a cover that DOES exist is still resolving (the
    // server connection / stream token is mid-flight), show a neutral tile so we
    // never flash a letter and then swap in the cover a frame later.
    const hasArtworkIdentity = Boolean(source || artworkImageId || uri);
    if ((errored && !useLocal) || (!displaySource && !hasArtworkIdentity)) {
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
            decodeFormat={blurRadius && decodeFormat === 'rgb' ? 'argb' : decodeFormat}
            onError={() => {
                // A managed-cache file that went missing/corrupt falls back to
                // the remote source.
                if (useLocal) {
                    setLocalFailed(true);
                    return;
                }
                /*
                 * A remote failure now means what it says: this cover did not
                 * load. Show the letter.
                 *
                 * This used to read every failure as a stale stream token and
                 * respond by calling `clearSamoStreamTokenCache` — wiping the
                 * PROCESS-WIDE token cache and re-minting — before retrying. An
                 * image loader reports no status code, so a 404 for a cover that
                 * genuinely does not exist was indistinguishable from a 401, and
                 * a handful of art-less items on one grid could invalidate the
                 * app's credentials repeatedly and storm the mint endpoint.
                 *
                 * The premise is gone anyway: display URLs no longer carry a
                 * stream token (see samo-artwork-url), they carry the bearer,
                 * which only a real re-auth can change. A leaf view has no
                 * business invalidating an app-wide auth cache on a guess.
                 */
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
            // source underneath (no visible change).
            //
            // OPT-IN FOR A COPY THAT IS THE SLOT'S PICTURE, AND IT MUST STAY
            // OPT-IN. THIS IS THE MOST EXPENSIVE PROP ON THE COMPONENT.
            //
            // `placeholder` is not a cheap poster frame. expo-image compiles it
            // into a Glide `thumbnail()` request — a SECOND, parallel load of the
            // same file (ExpoImageViewWrapper.rerenderIfNeeded) — and that request
            // is built with `PlaceholderDownsampleStrategy`, whose
            // `getScaleFactor()` returns a hard `1f`. It never downsamples. Nor
            // does it inherit the `.format()` below, because Glide applies parent
            // options after an explicitly-supplied thumbnail builder, so the
            // placeholder decodes as 32-bit ARGB_8888.
            //
            // So the tile that asks for a tidy 500x500 RGB_565 cover (0.5MB) also
            // decodes the SAME file at whatever size it is kept at — a 1500px
            // original is 9MB, per tile, in parallel with the real one. It was set
            // unconditionally here once, so every tile on every grid, shelf,
            // browse page and track list in the app paid it: decode threads
            // saturated, the bitmap pool thrashed, and dense pages scrolled at
            // ~15fps. The blank frame it fixes is a MOUNT artifact, and only a
            // single large image that mounts on its own is ever big enough or
            // still enough for anyone to see it.
            //
            // A copy SMALLER than the slot is the one case it is always on. Only
            // slots wider than the cache's covers have one — a hero, the player,
            // the zoom: single large images, where it decodes fewer pixels than
            // the picture it stands in for, and where without it they would sit
            // blank while their own size loads. expo-image never puts it over a
            // cover already showing, so a cover changing in place is unaffected.
            //
            // Never with a blur: the placeholder request is not blurred, so a
            // blurred backdrop would flash sharp.
            //
            // Also gated on having a local file, so an uncached tile still falls
            // through to its letter.
            placeholder={
                copy && !blurRadius && (instantPlaceholder || !useLocal)
                    ? { uri: copy.uri }
                    : undefined
            }
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
