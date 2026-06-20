import React, { createContext, useContext, useEffect } from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import Animated, {
    Easing,
    type SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import { colors, spacing } from '../theme/tokens';
import { styles } from '../theme/styles';
import {
    getHomeSectionRowHeight,
    HOME_COMPACT_OFFSET,
    HOME_PRIMARY_TILE,
    HOME_ROUNDED_OFFSET,
    HOME_TILE_GAP,
} from '../theme/layout';
import { type HomeDisplaySection } from '../types/home';

// FND-safe motion: a GENTLE, slow, low-contrast opacity breathe — no moving
// shimmer sweep, no hard edges. Low amplitude (0.35→0.6) keeps the contrast well
// under any flicker-risk threshold; the pulse is always on (it reads as
// "premium", and the slow fade doesn't bother FND).
const SKELETON_MIN_OPACITY = 0.35;
const SKELETON_MAX_OPACITY = 0.6;
const SKELETON_PULSE_MS = 900;

const useSkeletonPulse = (): SharedValue<number> => {
    const opacity = useSharedValue(SKELETON_MIN_OPACITY);
    useEffect(() => {
        opacity.value = withRepeat(
            withTiming(SKELETON_MAX_OPACITY, {
                duration: SKELETON_PULSE_MS,
                easing: Easing.inOut(Easing.ease),
            }),
            -1,
            true,
        );
    }, [opacity]);
    return opacity;
};

// One animation driver shared by every block on a page. A skeleton page can hold
// 30+ blocks; without this each would run its own UI-thread timing loop. Wrap a
// skeleton tree in this provider and all its blocks breathe off one value, in
// sync, for a fraction of the cost.
const SkeletonPulseContext = createContext<SharedValue<number> | null>(null);

export const SkeletonPulseProvider = ({ children }: { children: React.ReactNode }) => {
    const pulse = useSkeletonPulse();
    return (
        <SkeletonPulseContext.Provider value={pulse}>{children}</SkeletonPulseContext.Provider>
    );
};

/**
 * A primitive skeleton block that gently breathes to indicate loading. Uses the
 * shared `SkeletonPulseProvider` driver when one is present (cheap, in-sync),
 * otherwise falls back to its own driver so standalone blocks still animate.
 */
export const SkeletonBlock = ({
    style,
    borderRadius = 6,
}: {
    style?: StyleProp<ViewStyle>;
    borderRadius?: number;
}) => {
    const shared = useContext(SkeletonPulseContext);
    const own = useSharedValue(SKELETON_MIN_OPACITY);

    useEffect(() => {
        if (shared) {
            return;
        }
        own.value = withRepeat(
            withTiming(SKELETON_MAX_OPACITY, {
                duration: SKELETON_PULSE_MS,
                easing: Easing.inOut(Easing.ease),
            }),
            -1,
            true,
        );
    }, [own, shared]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: (shared ?? own).value,
    }));

    return (
        <Animated.View
            style={[
                {
                    backgroundColor: colors.surface,
                    borderRadius,
                },
                style,
                animatedStyle,
            ]}
        />
    );
};

/**
 * A full track row skeleton matching the layout of `renderTrackRow`.
 */
export const SkeletonTrackRow = () => {
    return (
        <View style={styles.trackRow}>
            {/* Artwork Block */}
            <SkeletonBlock style={{ width: 44, height: 44 }} />

            {/* Text Blocks */}
            <View style={styles.trackText}>
                {/* Title */}
                <SkeletonBlock style={{ width: '60%', height: 16, marginBottom: 6 }} borderRadius={4} />
                {/* Subtitle */}
                <SkeletonBlock style={{ width: '40%', height: 12 }} borderRadius={3} />
            </View>

            {/* Time / Actions block */}
            <SkeletonBlock style={{ width: 24, height: 12 }} borderRadius={3} />
        </View>
    );
};

/**
 * A square tile skeleton matching the layout of `ViewAllScreen` tiles.
 */
export const SkeletonTile = () => {
    return (
        <View style={styles.viewAllTilePlaceholder}>
            {/* Main square image */}
            <SkeletonBlock style={{ width: '100%', aspectRatio: 1, marginBottom: 8 }} borderRadius={10} />
            {/* Text lines */}
            <SkeletonBlock style={{ width: '80%', height: 14, marginBottom: 4 }} borderRadius={3} />
            <SkeletonBlock style={{ width: '50%', height: 12 }} borderRadius={3} />
        </View>
    );
};

/**
 * A two-column grid of tile skeletons — a structural stand-in for the
 * Library / Playlists / Radio grids while their first content derives, instead
 * of a bare centered spinner.
 */
export const SkeletonTileGrid = ({ count = 12 }: { count?: number }) => (
    <SkeletonPulseProvider>
        <View
            style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 16,
                padding: 16,
                width: '100%',
            }}
        >
            {Array.from({ length: count }).map((_, index) => (
                <View key={index} style={{ width: '45%' }}>
                    <SkeletonTile />
                </View>
            ))}
        </View>
    </SkeletonPulseProvider>
);

/**
 * A vertical stack of list-row skeletons — a structural stand-in for list-based
 * screens (e.g. Playlists) while their first content derives.
 */
export const SkeletonListRows = ({ count = 8 }: { count?: number }) => (
    <SkeletonPulseProvider>
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}>
            {Array.from({ length: count }).map((_, index) => (
                <SkeletonTrackRow key={index} />
            ))}
        </View>
    </SkeletonPulseProvider>
);

type HomeSkeletonVariant = HomeDisplaySection['variant'];

interface HomeSkeletonTileSpec {
    artworkSize: number;
    centered: boolean;
    lines: number;
    radius: number;
    tileWidth: number;
}

// Mirror the real tile geometry (see styles.mediaArtwork* / mediaTile*) so a
// reserved skeleton tile matches the live tile's footprint.
const homeSkeletonTileSpec = (variant: HomeSkeletonVariant): HomeSkeletonTileSpec => {
    switch (variant) {
        case 'artist':
            return {
                artworkSize: HOME_PRIMARY_TILE - HOME_COMPACT_OFFSET,
                centered: true,
                lines: 1,
                radius: 999,
                tileWidth: HOME_PRIMARY_TILE - HOME_COMPACT_OFFSET,
            };
        case 'podcast':
        case 'podcast-feed':
            return {
                artworkSize: HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET,
                centered: false,
                lines: 2,
                radius: 26,
                tileWidth: HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET,
            };
        case 'radio':
            return {
                artworkSize: HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET,
                centered: true,
                lines: 1,
                radius: 30,
                tileWidth: HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET,
            };
        default:
            return {
                artworkSize: HOME_PRIMARY_TILE,
                centered: false,
                lines: 2,
                radius: 2,
                tileWidth: HOME_PRIMARY_TILE,
            };
    }
};

const HomeSkeletonTile = ({ variant }: { variant: HomeSkeletonVariant }) => {
    if (variant === 'wide' || variant === 'continue') {
        return (
            <View style={[styles.mediaTile, styles.mediaTileWide]}>
                <SkeletonBlock style={{ width: 112, height: 112 }} borderRadius={2} />
                <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
                    <SkeletonBlock style={{ width: '80%', height: 14 }} borderRadius={4} />
                    <SkeletonBlock style={{ width: '55%', height: 12 }} borderRadius={3} />
                    <SkeletonBlock style={{ width: '40%', height: 12 }} borderRadius={3} />
                </View>
            </View>
        );
    }

    const spec = homeSkeletonTileSpec(variant);
    return (
        <View
            style={{
                alignItems: spec.centered ? 'center' : 'stretch',
                marginRight: HOME_TILE_GAP,
                width: spec.tileWidth,
            }}
        >
            <SkeletonBlock
                style={{ height: spec.artworkSize, marginBottom: 4, width: spec.artworkSize }}
                borderRadius={spec.radius}
            />
            <SkeletonBlock
                style={{
                    height: 13,
                    marginBottom: 5,
                    marginTop: 2,
                    width: spec.centered ? '70%' : '78%',
                }}
                borderRadius={4}
            />
            {spec.lines > 1 ? (
                <SkeletonBlock
                    style={{ height: 11, width: spec.centered ? '45%' : '52%' }}
                    borderRadius={3}
                />
            ) : null}
            {variant === 'podcast-feed' ? (
                <SkeletonBlock style={{ height: 3, marginTop: 6, width: '100%' }} borderRadius={2} />
            ) : null}
        </View>
    );
};

const HomeSkeletonRowContent = ({
    count = 4,
    skeletonTitle = false,
    title,
    variant,
}: {
    count?: number;
    skeletonTitle?: boolean;
    title?: string;
    variant: HomeSkeletonVariant;
}) => {
    const rowHeight = getHomeSectionRowHeight(variant, 1);
    return (
        <View style={styles.homeSection}>
            {title !== undefined || skeletonTitle ? (
                <View style={styles.sectionHeaderRow}>
                    {title !== undefined ? (
                        <Text style={styles.sectionTitle}>{title}</Text>
                    ) : (
                        <SkeletonBlock
                            style={{ height: 24, marginVertical: 4, width: 150 }}
                            borderRadius={6}
                        />
                    )}
                </View>
            ) : null}
            <View style={[styles.homeRowList, { flexDirection: 'row', height: rowHeight }]}>
                {Array.from({ length: count }).map((_, index) => (
                    <HomeSkeletonTile key={index} variant={variant} />
                ))}
            </View>
        </View>
    );
};

/**
 * A drop-in skeleton for ONE home shelf, reserved at the variant's exact row
 * height so the real content swaps into its slot with zero layout shift. Used
 * for network-gated shelves (Podcast Feed / Rediscover) whose real items arrive
 * a beat after the page paints.
 */
export const HomeSkeletonRow = ({
    count = 4,
    title,
    variant,
}: {
    count?: number;
    title?: string;
    variant: HomeSkeletonVariant;
}) => (
    <SkeletonPulseProvider>
        <HomeSkeletonRowContent count={count} title={title} variant={variant} />
    </SkeletonPulseProvider>
);

const HOME_SKELETON_PAGE_ROWS: Array<{ count: number; variant: HomeSkeletonVariant }> = [
    { count: 6, variant: 'recents' },
    { count: 4, variant: 'album' },
    { count: 5, variant: 'podcast' },
    { count: 5, variant: 'artist' },
];

/**
 * A full-page home skeleton mirroring the real shelf stack — shown on the cold
 * first paint (fresh install / post-clear) instead of a bare centered spinner,
 * so loading reads as structure filling in rather than a spinner→page pop.
 */
export const HomeSkeletonPage = () => (
    <SkeletonPulseProvider>
        <View style={{ paddingTop: spacing.md }}>
            {HOME_SKELETON_PAGE_ROWS.map((row, index) => (
                <HomeSkeletonRowContent
                    count={row.count}
                    key={index}
                    skeletonTitle
                    variant={row.variant}
                />
            ))}
        </View>
    </SkeletonPulseProvider>
);
