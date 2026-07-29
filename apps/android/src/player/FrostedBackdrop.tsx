import { memo, useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, View } from 'react-native';
import { getColors } from 'react-native-image-colors';
import LinearGradient from 'react-native-linear-gradient';

import ditherTexture from '../../assets/dither.png';
import { styles } from '../theme/styles';
import { canonicalArtworkKey } from '../utils/artwork-canonical';
import {
    buildFrostedBackdropStops,
    FROSTED_BACKDROP_STOPS,
    FROSTED_GLASS_DEPTH,
    FROSTED_GLASS_DEPTH_LOCATIONS,
    FROSTED_GLASS_SHEEN,
    FROSTED_GLASS_SHEEN_LOCATIONS,
} from '../utils/color';

// Cover IDENTITY → finished ramp. Keyed on the canonical (stream-token
// stripped) URL, exactly like the artwork cache and expo-image's cacheKey:
// Samo rotates the token in every artwork URL roughly every 25 minutes, so a
// raw-URL key made this cache miss on EVERY track after every rotation. Each
// miss is a full cover download + bitmap decode + Palette pass (getColors is
// native work kicked off the JS thread) plus a visible ramp crossfade — a
// periodic, unexplained stall exactly like the ones this app has been chasing.
// It also grew without bound: one dead entry per track per rotation, forever.
// Extraction now runs once per COVER; every later visit (skip back, reopen,
// queue loop, token rotation) repaints instantly with zero native work.
const rampCache = new Map<string, string[]>();
// Bound it anyway — a long shuffle session touches a lot of distinct covers,
// and a ramp we haven't seen in hundreds of tracks is not worth the retention.
const MAX_RAMP_CACHE = 64;

const rememberRamp = (key: string, ramp: string[]): void => {
    rampCache.delete(key);
    rampCache.set(key, ramp);
    if (rampCache.size > MAX_RAMP_CACHE) {
        // Map preserves insertion order, so the first key is the oldest.
        const oldest = rampCache.keys().next();
        if (!oldest.done) {
            rampCache.delete(oldest.value);
        }
    }
};

const NEUTRAL_RAMP = FROSTED_BACKDROP_STOPS as string[];

const pickSeedColor = (result: Awaited<ReturnType<typeof getColors>>): string | null => {
    if (result.platform === 'android') {
        return result.vibrant || result.darkVibrant || result.dominant || result.average || null;
    }
    if (result.platform === 'ios') {
        return result.primary || result.background || null;
    }
    return null;
};

const resolveRampForArtwork = async (artworkUrl: string): Promise<string[]> => {
    const cacheKey = canonicalArtworkKey(artworkUrl);
    const cached = rampCache.get(cacheKey);
    if (cached) {
        return cached;
    }
    const result = await getColors(artworkUrl, {
        cache: true,
        fallback: '#3a414c',
        // react-native-image-colors keeps its OWN cache under this key — give
        // it the canonical identity too, or it re-downloads and re-decodes the
        // same cover on every token rotation right alongside us.
        key: cacheKey,
    });
    const seed = pickSeedColor(result);
    const ramp = seed ? buildFrostedBackdropStops(seed) : NEUTRAL_RAMP;
    rememberRamp(cacheKey, ramp);
    return ramp;
};

const RAMP_CROSSFADE_MS = 420;

/**
 * Frosted-glass player backdrop, tinted by the current artwork. One consistent
 * premium surface — charcoal ramp + glass sheen + bottom vignette + frost
 * grain — whose CAST follows the album: the ramp is re-seeded from the
 * artwork's vibrant color and CROSSFADED in over the previous ramp, so track
 * changes read as the light in the room shifting, never a hard repaint (the
 * flicker that got the original extraction pass removed).
 */
export const FrostedBackdrop = memo(({ artworkUrl }: { artworkUrl?: string }) => {
    const [ramps, setRamps] = useState<{ current: string[]; previous: string[] }>({
        current: NEUTRAL_RAMP,
        previous: NEUTRAL_RAMP,
    });
    const fadeProgress = useRef(new Animated.Value(1)).current;
    const currentRampRef = useRef<string[]>(NEUTRAL_RAMP);

    useEffect(() => {
        let isStale = false;
        const apply = (ramp: string[]) => {
            if (isStale || ramp === currentRampRef.current) {
                return;
            }
            setRamps({ current: ramp, previous: currentRampRef.current });
            currentRampRef.current = ramp;
            fadeProgress.setValue(0);
            Animated.timing(fadeProgress, {
                duration: RAMP_CROSSFADE_MS,
                toValue: 1,
                useNativeDriver: true,
            }).start();
        };

        if (!artworkUrl) {
            apply(NEUTRAL_RAMP);
            return;
        }
        // Synchronous hit on the canonical identity: a token rotation must
        // repaint NOTHING (same cover → same ramp → apply() no-ops on the
        // identity check), which is what keeps the crossfade for real track
        // changes only.
        const cached = rampCache.get(canonicalArtworkKey(artworkUrl));
        if (cached) {
            apply(cached);
            return;
        }
        resolveRampForArtwork(artworkUrl)
            .then(apply)
            .catch(() => apply(NEUTRAL_RAMP));
        return () => {
            isStale = true;
        };
    }, [artworkUrl, fadeProgress]);

    return (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <LinearGradient
                colors={ramps.previous}
                end={{ x: 0.82, y: 1 }}
                pointerEvents="none"
                start={{ x: 0.18, y: 0 }}
                style={StyleSheet.absoluteFill}
            />
            <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { opacity: fadeProgress }]}
            >
                <LinearGradient
                    colors={ramps.current}
                    end={{ x: 0.82, y: 1 }}
                    pointerEvents="none"
                    start={{ x: 0.18, y: 0 }}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>
            <LinearGradient
                colors={FROSTED_GLASS_SHEEN as unknown as string[]}
                end={{ x: 0.85, y: 0.9 }}
                locations={FROSTED_GLASS_SHEEN_LOCATIONS as unknown as number[]}
                pointerEvents="none"
                start={{ x: 0.05, y: 0 }}
                style={StyleSheet.absoluteFill}
            />
            <LinearGradient
                colors={FROSTED_GLASS_DEPTH as unknown as string[]}
                end={{ x: 0.5, y: 1 }}
                locations={FROSTED_GLASS_DEPTH_LOCATIONS as unknown as number[]}
                pointerEvents="none"
                start={{ x: 0.5, y: 0.5 }}
                style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.fullPlayerDither]}>
                <Image resizeMode="repeat" source={ditherTexture} style={StyleSheet.absoluteFill} />
            </View>
        </View>
    );
});

FrostedBackdrop.displayName = 'FrostedBackdrop';
