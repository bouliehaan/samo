import { SamoMobileTabId } from '@samo/core/navigation';
import { Image, type ImageSourcePropType, Text, View } from 'react-native';
import Svg, { Circle as SvgCircle, Path as SvgPath } from 'react-native-svg';

import outputPickerIcon from '../../../../assets/monitor.png';
import heartIcon from '../../assets/icons/heart.png';
import shuffleIcon from '../../assets/icons/shuffle.png';
import sleepTimerIcon from '../../assets/icons/sleep-timer.png';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';

export const PlayPauseGlyph = ({
    color,
    isPlaying,
    size = 18,
}: {
    color: string;
    isPlaying: boolean;
    size?: number;
}) => {
    if (isPlaying) {
        // Proportional bar sizing so the pause icon looks correct at any size
        // (the previous version used height: '100%' with a fixed 5px width,
        // which made the fullscreen pause icon look like two narrow stripes).
        const barWidth = Math.max(3, Math.round(size * 0.18));
        const barHeight = Math.round(size * 0.7);
        const gap = Math.max(3, Math.round(size * 0.18));
        return (
            <View
                style={{
                    alignItems: 'center',
                    flexDirection: 'row',
                    gap,
                    height: size,
                    justifyContent: 'center',
                    width: size,
                }}
            >
                <View
                    style={{
                        backgroundColor: color,
                        borderRadius: Math.max(1, Math.round(barWidth / 2.5)),
                        height: barHeight,
                        width: barWidth,
                    }}
                />
                <View
                    style={{
                        backgroundColor: color,
                        borderRadius: Math.max(1, Math.round(barWidth / 2.5)),
                        height: barHeight,
                        width: barWidth,
                    }}
                />
            </View>
        );
    }

    return (
        <View
            style={[
                styles.playGlyph,
                {
                    borderBottomWidth: size * 0.38,
                    borderLeftColor: color,
                    borderLeftWidth: size * 0.58,
                    borderTopWidth: size * 0.38,
                },
            ]}
        />
    );
};

export const TrackSkipGlyph = ({ color, direction }: { color: string; direction: -1 | 1 }) => {
    const triangleStyle =
        direction === 1
            ? {
                  borderBottomWidth: 7,
                  borderLeftColor: color,
                  borderLeftWidth: 10,
                  borderTopWidth: 7,
              }
            : {
                  borderBottomWidth: 7,
                  borderRightColor: color,
                  borderRightWidth: 10,
                  borderTopWidth: 7,
              };
    const triangles = (
        <View style={styles.skipGlyphTriangles}>
            <View style={[styles.skipGlyphTriangle, triangleStyle]} />
            <View style={[styles.skipGlyphTriangle, triangleStyle]} />
        </View>
    );
    const bar = <View style={[styles.skipGlyphBar, { backgroundColor: color }]} />;

    return (
        <View style={styles.skipGlyph}>
            {direction === -1 ? bar : null}
            {triangles}
            {direction === 1 ? bar : null}
        </View>
    );
};

export const EllipsisVerticalGlyph = ({ color }: { color: string }) => {
    return (
        <View style={{ alignItems: 'center', gap: 2, justifyContent: 'center' }}>
            <View style={{ backgroundColor: color, borderRadius: 2, height: 4, width: 4 }} />
            <View style={{ backgroundColor: color, borderRadius: 2, height: 4, width: 4 }} />
            <View style={{ backgroundColor: color, borderRadius: 2, height: 4, width: 4 }} />
        </View>
    );
};

export const FullPlayerImageGlyph = ({
    active,
    color,
    size,
    source,
}: {
    active?: boolean;
    color: string;
    size: number;
    source: ImageSourcePropType;
}) => {
    return (
        <View style={{ alignItems: 'center', height: 28, justifyContent: 'center', width: 28 }}>
            <Image
                accessibilityIgnoresInvertColors
                resizeMode="contain"
                source={source}
                style={{ height: size, tintColor: color, width: size }}
            />
            <View
                style={{
                    backgroundColor: active ? colors.accent : 'transparent',
                    borderRadius: 2,
                    bottom: 0,
                    height: 3,
                    position: 'absolute',
                    width: 3,
                }}
            />
        </View>
    );
};

export const SleepTimerGlyph = ({ active, color }: { active?: boolean; color: string }) => {
    return <FullPlayerImageGlyph active={active} color={color} size={24} source={sleepTimerIcon} />;
};

export const CastGlyph = ({ color = colors.text, size = 22 }: { color?: string; size?: number }) => {
    return (
        <Image
            resizeMode="contain"
            source={outputPickerIcon}
            style={{ height: size, tintColor: color, width: size }}
        />
    );
};

export const DownCaretGlyph = ({ color }: { color: string }) => {
    return (
        <View style={styles.downCaretGlyph}>
            <View
                style={[
                    styles.downCaretStroke,
                    styles.downCaretStrokeLeft,
                    { backgroundColor: color },
                ]}
            />
            <View
                style={[
                    styles.downCaretStroke,
                    styles.downCaretStrokeRight,
                    { backgroundColor: color },
                ]}
            />
        </View>
    );
};

export const GearGlyph = ({ color }: { color: string }) => {
    return (
        <Text
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[styles.gearGlyphText, { color }]}
        >
            ⚙
        </Text>
    );
};

export const SearchGlyph = ({ color }: { color: string }) => {
    return (
        <View style={styles.searchGlyph}>
            <View style={[styles.searchGlyphCircle, { borderColor: color }]} />
            <View style={[styles.searchGlyphHandle, { backgroundColor: color }]} />
        </View>
    );
};

export const EyeGlyph = ({
    closed = false,
    color,
}: {
    closed?: boolean;
    color: string;
}) => {
    return (
        <Svg height={22} viewBox="0 0 24 24" width={22}>
            <SvgPath
                d="M2.8 12s3.4-5.4 9.2-5.4 9.2 5.4 9.2 5.4-3.4 5.4-9.2 5.4S2.8 12 2.8 12Z"
                fill="none"
                stroke={color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
            />
            <SvgCircle cx={12} cy={12} fill="none" r={2.8} stroke={color} strokeWidth={1.8} />
            {closed ? (
                <SvgPath
                    d="M4.5 19.5 19.5 4.5"
                    stroke={color}
                    strokeLinecap="round"
                    strokeWidth={2}
                />
            ) : null}
        </Svg>
    );
};

export const ClearGlyph = ({ color }: { color: string }) => {
    return (
        <View style={styles.clearGlyph}>
            <View
                style={[
                    styles.clearGlyphStroke,
                    { backgroundColor: color, transform: [{ rotate: '45deg' }] },
                ]}
            />
            <View
                style={[
                    styles.clearGlyphStroke,
                    { backgroundColor: color, transform: [{ rotate: '-45deg' }] },
                ]}
            />
        </View>
    );
};

export const SortGlyph = ({ color }: { color: string }) => {
    return (
        <View style={styles.sortGlyph}>
            <View style={[styles.sortGlyphLine, { backgroundColor: color, width: 14 }]} />
            <View style={[styles.sortGlyphLine, { backgroundColor: color, width: 10 }]} />
            <View style={[styles.sortGlyphLine, { backgroundColor: color, width: 6 }]} />
        </View>
    );
};

export const MoreGlyph = ({ color }: { color: string }) => {
    return (
        <View style={styles.moreGlyph}>
            <View style={[styles.moreGlyphDot, { backgroundColor: color }]} />
            <View style={[styles.moreGlyphDot, { backgroundColor: color }]} />
            <View style={[styles.moreGlyphDot, { backgroundColor: color }]} />
        </View>
    );
};

export const HeartGlyph = ({ color, filled }: { color: string; filled?: boolean }) => {
    return (
        <Image
            accessibilityElementsHidden
            importantForAccessibility="no"
            resizeMode="contain"
            source={heartIcon}
            style={{
                height: 18,
                opacity: filled ? 1 : 0.55,
                tintColor: color,
                width: 18,
            }}
        />
    );
};

export const PlaylistAddGlyph = ({ color }: { color: string }) => {
    return (
        <View style={{ height: 18, justifyContent: 'space-between', width: 20 }}>
            <View style={{ backgroundColor: color, borderRadius: 1, height: 2, width: 14 }} />
            <View style={{ backgroundColor: color, borderRadius: 1, height: 2, width: 10 }} />
            <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                <View style={{ backgroundColor: color, borderRadius: 1, height: 2, width: 6 }} />
                <View style={{ height: 10, marginLeft: 4, position: 'relative', width: 10 }}>
                    <View
                        style={{
                            backgroundColor: color,
                            height: 2,
                            left: 0,
                            position: 'absolute',
                            top: 4,
                            width: 10,
                        }}
                    />
                    <View
                        style={{
                            backgroundColor: color,
                            height: 10,
                            left: 4,
                            position: 'absolute',
                            top: 0,
                            width: 2,
                        }}
                    />
                </View>
            </View>
        </View>
    );
};

export const PlusGlyph = ({ color, size = 20 }: { color: string; size?: number }) => {
    const stroke = Math.max(2, Math.round(size * 0.12));
    return (
        <View style={{ height: size, position: 'relative', width: size }}>
            <View
                style={{
                    backgroundColor: color,
                    borderRadius: 999,
                    height: stroke,
                    left: 0,
                    position: 'absolute',
                    top: (size - stroke) / 2,
                    width: size,
                }}
            />
            <View
                style={{
                    backgroundColor: color,
                    borderRadius: 999,
                    height: size,
                    left: (size - stroke) / 2,
                    position: 'absolute',
                    top: 0,
                    width: stroke,
                }}
            />
        </View>
    );
};

export const QueueAddGlyph = ({ color }: { color: string }) => {
    return (
        <View style={{ height: 18, justifyContent: 'space-between', width: 20 }}>
            <View style={{ backgroundColor: color, borderRadius: 1, height: 2, width: 18 }} />
            <View style={{ backgroundColor: color, borderRadius: 1, height: 2, width: 18 }} />
            <View
                style={{
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                }}
            >
                <View style={{ backgroundColor: color, borderRadius: 1, height: 2, width: 8 }} />
                <View style={{ height: 10, position: 'relative', width: 10 }}>
                    <View
                        style={{
                            backgroundColor: color,
                            height: 2,
                            left: 0,
                            position: 'absolute',
                            top: 4,
                            width: 10,
                        }}
                    />
                    <View
                        style={{
                            backgroundColor: color,
                            height: 10,
                            left: 4,
                            position: 'absolute',
                            top: 0,
                            width: 2,
                        }}
                    />
                </View>
            </View>
        </View>
    );
};

export const PersonGlyph = ({ color }: { color: string }) => {
    return (
        <View style={{ alignItems: 'center', height: 18, width: 20 }}>
            <View
                style={{
                    borderColor: color,
                    borderRadius: 5,
                    borderWidth: 1.6,
                    height: 8,
                    width: 8,
                }}
            />
            <View
                style={{
                    borderColor: color,
                    borderLeftWidth: 1.6,
                    borderRightWidth: 1.6,
                    borderTopLeftRadius: 8,
                    borderTopRightRadius: 8,
                    borderTopWidth: 1.6,
                    height: 7,
                    marginTop: 1,
                    width: 14,
                }}
            />
        </View>
    );
};

export const DiscGlyph = ({ color }: { color: string }) => {
    return (
        <View style={{ alignItems: 'center', height: 18, justifyContent: 'center', width: 20 }}>
            <View
                style={{
                    borderColor: color,
                    borderRadius: 9,
                    borderWidth: 1.6,
                    height: 18,
                    width: 18,
                }}
            />
            <View
                style={{
                    backgroundColor: color,
                    borderRadius: 2,
                    height: 4,
                    position: 'absolute',
                    width: 4,
                }}
            />
        </View>
    );
};

export const RadioWaveGlyph = ({ color }: { color: string }) => {
    // Concentric arcs evoking a "radio / station" feel.
    return (
        <View style={{ alignItems: 'center', height: 18, justifyContent: 'center', width: 18 }}>
            <View
                style={{
                    borderColor: color,
                    borderRadius: 9,
                    borderWidth: 1.4,
                    height: 18,
                    opacity: 0.45,
                    position: 'absolute',
                    width: 18,
                }}
            />
            <View
                style={{
                    borderColor: color,
                    borderRadius: 6,
                    borderWidth: 1.4,
                    height: 12,
                    position: 'absolute',
                    width: 12,
                }}
            />
            <View
                style={{
                    backgroundColor: color,
                    borderRadius: 2,
                    height: 4,
                    width: 4,
                }}
            />
        </View>
    );
};

export const CheckGlyph = ({ color, size = 14 }: { color: string; size?: number }) => {
    // Unicode check rendered as Text — cheap and renders consistently. The
    // tight lineHeight + textAlign keeps it centered inside its box rather
    // than dropping below the baseline like the default Text behavior.
    return (
        <Text
            accessibilityElementsHidden
            allowFontScaling={false}
            importantForAccessibility="no"
            style={{
                color,
                fontSize: size,
                fontWeight: '900',
                includeFontPadding: false,
                lineHeight: size,
                textAlign: 'center',
                textAlignVertical: 'center',
            }}
        >
            {'✓'}
        </Text>
    );
};

/**
 * Circular download progress indicator. A continuous accent-colored arc sweeps
 * clockwise from 12 o'clock over a dim background ring, with a download arrow
 * (or check, when complete) in the middle.
 */
export const CircularDownloadGlyph = ({
    completed,
    progress,
}: {
    /** True when everything's saved and the user should see the "done" state. */
    completed: boolean;
    /** 0–1 fraction of how much is downloaded. */
    progress: number;
}) => {
    const SIZE = 30;
    const STROKE = 2;
    const RADIUS = (SIZE - STROKE) / 2;
    const CIRC = 2 * Math.PI * RADIUS;
    const fraction = completed ? 1 : Math.min(1, Math.max(0, progress));
    const accent = colors.accent;
    const dim = 'rgba(255, 255, 255, 0.16)';

    return (
        <View
            pointerEvents="none"
            style={{
                alignItems: 'center',
                height: SIZE,
                justifyContent: 'center',
                width: SIZE,
            }}
        >
            <Svg
                height={SIZE}
                style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
                width={SIZE}
            >
                <SvgCircle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    fill="none"
                    r={RADIUS}
                    stroke={dim}
                    strokeWidth={STROKE}
                />
                {fraction > 0 ? (
                    <SvgCircle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        fill="none"
                        r={RADIUS}
                        stroke={accent}
                        strokeDasharray={`${CIRC * fraction}, ${CIRC}`}
                        strokeLinecap="round"
                        strokeWidth={STROKE}
                    />
                ) : null}
            </Svg>
            {completed ? (
                <CheckGlyph color={accent} size={14} />
            ) : (
                <DownloadGlyph color={progress > 0 ? accent : colors.text} />
            )}
        </View>
    );
};

export const DownloadGlyph = ({ color }: { color: string }) => {
    // Downward arrow over a small tray — universal "download" affordance.
    return (
        <View style={{ alignItems: 'center', height: 20, justifyContent: 'center', width: 20 }}>
            <View
                style={{
                    backgroundColor: color,
                    borderRadius: 1,
                    height: 8,
                    width: 2.4,
                }}
            />
            <View
                style={{
                    borderLeftColor: 'transparent',
                    borderLeftWidth: 4,
                    borderRightColor: 'transparent',
                    borderRightWidth: 4,
                    borderTopColor: color,
                    borderTopWidth: 5,
                    height: 0,
                    marginTop: -1,
                    width: 0,
                }}
            />
            <View
                style={{
                    backgroundColor: color,
                    borderRadius: 1,
                    height: 2,
                    marginTop: 2,
                    width: 14,
                }}
            />
        </View>
    );
};

/**
 * Inline "this single track is saved offline" badge for track-list rows.
 * Kept intentionally small and grey so it reads as row metadata, not an action.
 */
export const TrackDownloadedGlyph = ({ size = 12 }: { size?: number }) => {
    const knockout = colors.background;
    const shaftWidth = Math.max(1.1, size * 0.13);
    const shaftHeight = size * 0.22;
    const headWidth = size * 0.46;
    const headHeight = size * 0.22;
    return (
        <View
            style={{
                alignItems: 'center',
                backgroundColor: colors.muted,
                borderRadius: size / 2,
                height: size,
                justifyContent: 'center',
                width: size,
            }}
        >
            <View
                style={{
                    backgroundColor: knockout,
                    borderRadius: 0.5,
                    height: shaftHeight,
                    width: shaftWidth,
                }}
            />
            <View
                style={{
                    borderLeftColor: 'transparent',
                    borderLeftWidth: headWidth / 2,
                    borderRightColor: 'transparent',
                    borderRightWidth: headWidth / 2,
                    borderTopColor: knockout,
                    borderTopWidth: headHeight,
                    height: 0,
                    width: 0,
                }}
            />
        </View>
    );
};

export const BookInfoGlyph = ({ color }: { color: string }) => {
    return (
        <View
            style={{
                alignItems: 'center',
                borderColor: color,
                borderRadius: 9,
                borderWidth: 1.6,
                height: 18,
                justifyContent: 'center',
                width: 18,
            }}
        >
            <View style={{ backgroundColor: color, borderRadius: 1, height: 2, width: 2 }} />
            <View
                style={{
                    backgroundColor: color,
                    borderRadius: 1,
                    height: 7,
                    marginTop: 2,
                    width: 2,
                }}
            />
        </View>
    );
};

export const ChaptersGlyph = ({ color }: { color: string }) => {
    return (
        <View style={{ height: 18, justifyContent: 'space-between', width: 18 }}>
            {[0, 1, 2].map((index) => (
                <View key={index} style={{ alignItems: 'center', flexDirection: 'row' }}>
                    <View
                        style={{
                            backgroundColor: color,
                            borderRadius: 1,
                            height: 2,
                            marginRight: 4,
                            width: 2,
                        }}
                    />
                    <View
                        style={{
                            backgroundColor: color,
                            borderRadius: 1,
                            height: 2,
                            width: 12,
                        }}
                    />
                </View>
            ))}
        </View>
    );
};

export const PlayCircleGlyph = ({ color }: { color: string }) => {
    return (
        <View style={styles.playCircleGlyph}>
            <PlayPauseGlyph color={color} isPlaying={false} size={14} />
        </View>
    );
};

export const ShuffleGlyph = ({
    active,
    color,
    size = 24,
}: {
    active?: boolean;
    color: string;
    size?: number;
}) => {
    return (
        <FullPlayerImageGlyph
            active={active}
            color={active ? colors.accent : color}
            size={size}
            source={shuffleIcon}
        />
    );
};

export const StarGlyph = ({ color, filled }: { color: string; filled: boolean }) => {
    return (
        <View style={styles.starGlyph}>
            <Text
                accessibilityElementsHidden
                importantForAccessibility="no"
                style={[styles.starGlyphText, { color }]}
            >
                {filled ? '★' : '☆'}
            </Text>
        </View>
    );
};

export const TabIcon = ({ active, id }: { active: boolean; id: SamoMobileTabId }) => {
    const color = active ? colors.text : colors.muted;

    if (id === 'home') {
        return (
            <View style={styles.tabIcon}>
                <View style={[styles.tabHomeRoofLeft, { backgroundColor: color }]} />
                <View style={[styles.tabHomeRoofRight, { backgroundColor: color }]} />
                <View style={[styles.tabHomeBody, { borderColor: color }]} />
            </View>
        );
    }

    if (id === 'search') {
        return (
            <View style={styles.tabIcon}>
                <View style={[styles.tabSearchCircle, { borderColor: color }]} />
                <View style={[styles.tabSearchHandle, { backgroundColor: color }]} />
            </View>
        );
    }

    if (id === 'library') {
        return (
            <View style={styles.tabIcon}>
                <View style={[styles.tabLibraryBook, { borderColor: color }]} />
                <View style={[styles.tabLibraryBook, { borderColor: color, opacity: 0.72 }]} />
                <View style={[styles.tabLibraryBook, { borderColor: color, opacity: 0.5 }]} />
            </View>
        );
    }

    if (id === 'playlists') {
        return (
            <View style={styles.tabIcon}>
                <View style={[styles.tabPlaylistLine, { backgroundColor: color, top: 5 }]} />
                <View
                    style={[styles.tabPlaylistLine, { backgroundColor: color, top: 11, width: 17 }]}
                />
                <View
                    style={[styles.tabPlaylistLine, { backgroundColor: color, top: 17, width: 12 }]}
                />
                <View style={[styles.tabPlaylistPlay, { borderLeftColor: color }]} />
            </View>
        );
    }

    return (
        <View style={styles.tabIcon}>
            <View style={[styles.tabRadioBody, { borderColor: color }]} />
            <View style={[styles.tabRadioAntenna, { backgroundColor: color }]} />
            <View style={[styles.tabRadioDot, { backgroundColor: color }]} />
            <View style={[styles.tabRadioLine, { backgroundColor: color }]} />
        </View>
    );
};
