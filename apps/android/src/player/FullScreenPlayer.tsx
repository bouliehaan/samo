import { buildAudioQualityBadgeItems } from '@samo/core/audio-quality';
import {
    getMobileContentSource,
    getPlaybackQualityProfile,
    parsePodcastPlaybackShowId,
    MobileHomeItemType,
    MobileSearchItemType,
    type MobileHomeItem,
    type MobilePlayableAudio,
    type MobilePlaybackSegment,
    type MobileSearchItem,
    LONG_FORM_RELATIVE_SKIP_SECONDS,
} from '@samo/core/mobile';
import {
    ensureSamoStreamToken,
    findServerAuthenticationForSource,
    type ServerAuthenticationResult,
} from '@samo/core/server';
import { FlashList } from '@shopify/flash-list';
import { Image as ExpoImage } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import ditherTexture from '../../assets/dither.png';
import {
    type ComponentProps,
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    type GestureResponderEvent,
    Image,
    Modal,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';
import Reanimated, {
    interpolate,
    runOnJS,
    type SharedValue,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import { ArtworkImage } from '../components/ArtworkImage';
import { ArtworkZoomModal } from '../components/ArtworkZoomModal';
import {
    CastGlyph,
    ChaptersGlyph,
    CheckGlyph,
    DownCaretGlyph,
    EllipsisVerticalGlyph,
    MoreGlyph,
    PlayPauseGlyph,
    ShuffleGlyph,
    SleepTimerGlyph,
    TrackSkipGlyph,
} from '../components/Glyphs';
import { QualityBadge, QualityBadgeRow } from '../components/QualityBadge';
import { SegmentedSeekBar } from '../components/SegmentedSeekBar';
import { SwipeDismissSheet } from '../components/SwipeDismissSheet';
import { useMediaContextMenu } from '../contexts/media-context-menu';
import {
    type AndroidCastState,
    type AndroidMediaOutputRoute,
    type AndroidMediaOutputState,
    cancelAndroidSleepTimer,
    getAndroidOutputRoutes,
    isAndroidNativePlaybackAvailable,
    selectAndroidOutputRoute,
    setAndroidSleepTimer,
    subscribeToAndroidOutputRouteEvents,
    updateAndroidNowPlayingMetadata,
} from '../services/audio-playback';
import { getContentSourceFromPlaybackItem } from '../utils/content-source';
import { getPersistedServerAuthKey } from '../services/persisted-server';
import { useServerConnections } from '../contexts/server-connections';
import { getPlayerPositionMsForAbsProgress } from '../utils/abs-progress-math';
import {
    artworkSourceUri,
    isSamoMediaUrlMissingStreamToken,
    resolvePlaybackArtworkSourceForDisplay,
} from '../utils/samo-artwork-url';
import {
    getAndroidPlaybackState,
    subscribeAndroidPlaybackState,
    useAndroidPlaybackState,
    useMiniPlayerPlaybackState,
} from '../state/playback-store';
import { type AndroidPlaybackState } from '../types/playback';
import {
    findActiveChapterIndex,
    formatChapterRange,
    formatPlaybackTime,
    getActivePlaybackStatus,
    getDurationLabel,
    getPlayableDisplayMetadata,
    getPlaybackDisplayMetadata,
    getPlaybackDurationMs,
    getDisplayPositionMs,
    getStablePlaybackPositionMs,
    isLivePlayback,
} from '../utils/playback-time';
import {
    FROSTED_BACKDROP_STOPS,
    FROSTED_GLASS_DEPTH,
    FROSTED_GLASS_DEPTH_LOCATIONS,
    FROSTED_GLASS_SHEEN,
    FROSTED_GLASS_SHEEN_LOCATIONS,
} from '../utils/color';
import { clamp } from '../utils/math';
import { formatQualityProfile } from '../services/quality-badge-assets';
import { triggerImpact } from '../services/haptics';
import {
    DISMISS_DISTANCE,
    DISMISS_VELOCITY,
    FULL_PLAYER_PADDING_TOP,
    FULL_PLAYER_PLAY_GLYPH_SIZE,
    OPEN_SPRING,
    PLAYER_EXPANSION_DISTANCE,
    QUEUE_CLOSE_DISTANCE,
    QUEUE_CLOSE_VELOCITY,
    QUEUE_SHEET_HEIGHT,
    REDUCED_MOTION_SPRING,
    SCREEN_HEIGHT,
    SCREEN_WIDTH,
} from '../theme/layout';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { PlayerIconButton } from './PlayerIconButton';
import {
    PLAYER_CLOSE_SPRING,
    PLAYER_OPEN_SPRING,
    shellTopRadius,
} from './player-motion';

const ReanimatedFlashList = Reanimated.createAnimatedComponent(FlashList) as typeof FlashList;
const FLASH_LIST_MAINTAIN_POSITION_DISABLED = { disabled: true };
const CAST_ICON_ACTIVE_TINT = 'rgba(202, 160, 79, 0.78)';
const CAST_ICON_INACTIVE_TINT = 'rgba(245, 245, 245, 0.72)';

import { QueueSheetOverlay, type QueueSheetListItem, QUEUE_SHEET_ROW_HEIGHT, QUEUE_SHEET_DRAW_DISTANCE } from './QueueSheetOverlay';
const SLEEP_OPTIONS: { label: string; seconds: number; wide?: boolean }[] = [
    { label: '15m', seconds: 15 * 60 },
    { label: '30m', seconds: 30 * 60 },
    { label: '45m', seconds: 45 * 60 },
    { label: '1h', seconds: 60 * 60 },
    { label: '1h 30m', seconds: 90 * 60 },
    { label: '2h', seconds: 120 * 60 },
    { label: 'End of track', seconds: -1, wide: true },
];

export const FullScreenPlayer = memo(({
    artworkImageId,
    artworkUrl,
    contentSource,
    castState,
    isShuffled,
    lastPlayedItem,
    onClose,
    onNext,
    onOpenOutputPicker,
    onPlayQueueIndex,
    onPrevious,
    onSeek,
    onSkipBySeconds,
    onToggleShuffle,
    onTogglePlayback,
    playbackState,
    playerProgress,
    queue,
    reducedMotion,
    serverConnection,
    visible,
}: {
    // Canonical high-res artwork URL — same string the MiniPlayer renders.
    // Derived once in the parent so the two players share one expo-image
    // cache entry and one in-flight load.
    artworkImageId?: string;
    artworkUrl: string | undefined;
    contentSource?: import('@samo/core/mobile').MobileContentSource;
    castState: AndroidCastState;
    isShuffled: boolean;
    lastPlayedItem: MobilePlayableAudio | null;
    onClose: () => void;
    onNext: () => void;
    onOpenOutputPicker: () => void;
    onPlayQueueIndex?: (index: number) => void;
    onPrevious: () => void;
    onSeek: (positionMs: number) => void;
    onSkipBySeconds?: (offsetSeconds: number) => void;
    onTogglePlayback: () => void;
    onToggleShuffle: () => void;
    playbackState: AndroidPlaybackState;
    playerProgress: SharedValue<number>;
    queue: { index: number; items: MobilePlayableAudio[] } | null;
    reducedMotion: boolean;
    serverConnection: ServerAuthenticationResult | null;
    visible: boolean;
}) => {
    const [sleepMenuVisible, setSleepMenuVisible] = useState(false);
    const [isArtworkZoomOpen, setIsArtworkZoomOpen] = useState(false);
    // Collapsed shell is invisible but was still above the tab bar (zIndex 10000).
    // Gate hits so the navbar stays tappable at rest; enable once expansion starts.
    const [isShellInteractive, setIsShellInteractive] = useState(false);
    const [sleepSecondsLeft, setSleepSecondsLeft] = useState<null | number>(null);
    // Queue sheet position: 0 = hidden below the screen, 1 = fully expanded.
    // Driven by the same vertical-drag gesture that handles player dismiss,
    // mode-switched per drag based on direction and current state.
    const queueProgress = useSharedValue(0);
    const dragMode = useSharedValue<'player' | 'queue'>('player');
    const dragStartQueue = useSharedValue(0);
    const contextMenu = useMediaContextMenu();
    const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);
    const sleepTickRef = useRef<NodeJS.Timeout | null>(null);
    const activeItem = playbackState.status !== 'idle' ? playbackState.item : null;
    const displayItem: MobilePlayableAudio | null = activeItem ?? lastPlayedItem;
    const isResting = !activeItem && Boolean(displayItem);
    const canSkipPlayback = Boolean(displayItem && displayItem.source !== 'radio');

    const startSleepTimer = useCallback((seconds: number) => {
        if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
        if (sleepTickRef.current) clearInterval(sleepTickRef.current);
        if (seconds === -1) {
            void cancelAndroidSleepTimer().catch(() => undefined);
            setSleepSecondsLeft(-1);
            return;
        }
        setSleepSecondsLeft(seconds);
        void setAndroidSleepTimer(seconds).catch(() => undefined);
        sleepTimerRef.current = setTimeout(() => {
            onTogglePlayback();
            setSleepSecondsLeft(null);
        }, seconds * 1000);
        sleepTickRef.current = setInterval(() => {
            setSleepSecondsLeft((s) => (s !== null && s > 0 ? s - 1 : null));
        }, 1000);
    }, [onTogglePlayback]);

    const cancelSleepTimer = useCallback(() => {
        if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
        if (sleepTickRef.current) clearInterval(sleepTickRef.current);
        void cancelAndroidSleepTimer().catch(() => undefined);
        setSleepSecondsLeft(null);
    }, []);

    useEffect(() => {
        return () => {
            if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
            if (sleepTickRef.current) clearInterval(sleepTickRef.current);
            void cancelAndroidSleepTimer().catch(() => undefined);
        };
    }, []);
    useEffect(() => {
        setIsArtworkZoomOpen(false);
    }, [artworkUrl]);

    const openSpring = reducedMotion ? REDUCED_MOTION_SPRING : PLAYER_OPEN_SPRING;
    const closeSpring = reducedMotion ? REDUCED_MOTION_SPRING : PLAYER_CLOSE_SPRING;
    const settleSpring = reducedMotion ? REDUCED_MOTION_SPRING : OPEN_SPRING;
    const dismissPlayer = useCallback(() => {
        // Animate closed first; flip parent state only once the motion finishes
        // so tab chrome and visible stay in sync with what the user sees.
        const onFinish = (finished?: boolean) => {
            'worklet';
            if (finished) {
                runOnJS(onClose)();
            }
        };
        playerProgress.value = reducedMotion
            ? withTiming(0, { duration: 0 }, onFinish)
            : withSpring(0, closeSpring, onFinish);
    }, [closeSpring, onClose, playerProgress, reducedMotion]);

    const openFullscreenContextMenu = useCallback(() => {
        const item = playbackState.status !== 'idle' ? playbackState.item : lastPlayedItem;
        if (!item) {
            return;
        }

        // contentSourceId is set on newly-built playback objects, but a track
        // persisted as lastPlayedItem before this build won't have it — so
        // also fall back to extracting the prefix from the well-known playback
        // id format `<authType>:<authUrl>:<source>:<innerId>[:<episodeId>]`.
        const idPrefixMatch = item.id.match(
            /^([^:]+:[^:]+):(?:music|audiobook|podcast(?:-episode)?|radio):/,
        );
        const sourceId = item.contentSourceId ?? idPrefixMatch?.[1];
        const auth = sourceId && serverConnection && getPersistedServerAuthKey(serverConnection) === sourceId ? serverConnection : undefined;
        const contentSource = auth ? getMobileContentSource(auth) : undefined;
        // Playback ids look like `<authType>:<authUrl>:<source>:<innerId>[:<episodeId>]`.
        // Strip the prefix so menu actions like "Go to Album" hit real underlying ids.
        const idMatch = item.id.match(/:(?:music|audiobook|podcast(?:-episode)?|radio):(.+)$/);
        const innerId = idMatch ? idMatch[1] : item.id;

        if (item.source === 'music') {
            const songItem: MobileSearchItem = {
                album: item.album,
                albumId: item.albumId,
                artist: item.artist,
                artistId: item.artistId,
                artworkImageId: item.artworkImageId,
                artworkUrl: item.artworkUrl,
                id: innerId,
                playback: item,
                source: contentSource,
                subtitle: item.subtitle,
                title: item.title,
                type: MobileSearchItemType.SONG,
            };
            contextMenu.openForItem(songItem, { suppressQueueAction: true });
            return;
        }

        if (item.source === 'radio') {
            const radioItem: MobileHomeItem = {
                artworkUrl: item.artworkUrl,
                id: innerId,
                playback: item,
                source: contentSource,
                subtitle: item.subtitle,
                title: item.title,
                type: MobileHomeItemType.RADIO,
            };
            contextMenu.openForItem(radioItem, { suppressQueueAction: true });
            return;
        }

        if (item.source === 'audiobook' || item.source === 'podcast') {
            const ownerId =
                parsePodcastPlaybackShowId(item.id) ??
                (item.source === 'podcast' ? innerId.split(':')[0] : innerId);
            const homeItem: MobileHomeItem = {
                artworkUrl: item.artworkUrl,
                id: ownerId,
                source: contentSource,
                subtitle: item.subtitle,
                title: item.title,
                type:
                    item.source === 'audiobook'
                        ? MobileHomeItemType.AUDIOBOOK
                        : MobileHomeItemType.PODCAST,
            };
            contextMenu.openForItem(homeItem, { suppressQueueAction: true });
        }
    }, [contextMenu, lastPlayedItem, playbackState, serverConnection]);

    // One vertical pan on the shell: drag up from the dock opens the panel;
    // drag down dismisses; upward while open can raise the queue sheet.
    const dragGesture = useMemo(
        () =>
            Gesture.Pan()
                .activeOffsetY([-8, 10])
                .failOffsetX([-28, 28])
                .onStart(() => {
                    'worklet';
                    dragStartQueue.value = queueProgress.value;
                    dragMode.value = queueProgress.value > 0 ? 'queue' : 'player';
                })
                .onChange((event) => {
                    'worklet';
                    // Only promote a player drag into a queue-raise while the
                    // player is still fully docked. Once it has been pulled down
                    // even slightly we're dismissing, so an upward wobble must
                    // NOT hijack the gesture into queue mode — that path left
                    // playerProgress stranded mid-screen (the "stuck halfway"
                    // glitch) because the queue branch of onEnd never settled it.
                    if (
                        dragMode.value === 'player' &&
                        event.translationY < -10 &&
                        playerProgress.value > 0.98
                    ) {
                        dragMode.value = 'queue';
                    }

                    if (dragMode.value === 'queue') {
                        const fraction =
                            -event.translationY / QUEUE_SHEET_HEIGHT;
                        const next = dragStartQueue.value + fraction;
                        queueProgress.value = next > 1 ? 1 : next < 0 ? 0 : next;
                        return;
                    }

                    const dragFraction = event.translationY / PLAYER_EXPANSION_DISTANCE;
                    const next = 1 - dragFraction;
                    playerProgress.value = next > 1 ? 1 : next < 0 ? 0 : next;
                })
                .onEnd((event) => {
                    'worklet';
                    if (dragMode.value === 'queue') {
                        // Safety net: the player sits fully docked behind the
                        // queue sheet, so guarantee it lands at 1 no matter how
                        // the mode flipped during the drag.
                        if (playerProgress.value < 1) {
                            playerProgress.value = withSpring(1, settleSpring);
                        }
                        if (
                            dragStartQueue.value > 0.8 &&
                            (event.translationY > QUEUE_CLOSE_DISTANCE ||
                                event.velocityY > QUEUE_CLOSE_VELOCITY)
                        ) {
                            queueProgress.value = withSpring(0, settleSpring);
                            return;
                        }

                        // Snap open or closed based on position + velocity.
                        const opening =
                            queueProgress.value > 0.5 ||
                            event.velocityY < -700;
                        queueProgress.value = withSpring(
                            opening ? 1 : 0,
                            settleSpring,
                        );
                        return;
                    }
                    const shouldDismiss =
                        event.translationY > DISMISS_DISTANCE ||
                        (event.velocityY > DISMISS_VELOCITY &&
                            event.translationY > 40);
                    if (shouldDismiss) {
                        const onFinish = (finished?: boolean) => {
                            'worklet';
                            if (finished) {
                                runOnJS(onClose)();
                            }
                        };
                        playerProgress.value = reducedMotion
                            ? withTiming(0, { duration: 0 }, onFinish)
                            : withSpring(
                                  0,
                                  {
                                      ...closeSpring,
                                      velocity:
                                          -event.velocityY / PLAYER_EXPANSION_DISTANCE,
                                  },
                                  onFinish,
                              );
                        return;
                    }
                    playerProgress.value = withSpring(1, {
                        ...openSpring,
                        velocity: -event.velocityY / PLAYER_EXPANSION_DISTANCE,
                    });
                }),
        [
            closeSpring,
            dragMode,
            dragStartQueue,
            onClose,
            openSpring,
            playerProgress,
            queueProgress,
            reducedMotion,
            settleSpring,
        ],
    );

    // Animated styles for the queue overlay. The sheet rises from the bottom
    // of the screen; a separate dimming backdrop fades in alongside it so the
    // player content underneath visibly recedes.
    const queueBackdropStyle = useAnimatedStyle(() => ({
        opacity: interpolate(queueProgress.value, [0, 1], [0, 0.55], 'clamp'),
    }));
    const queueSheetStyle = useAnimatedStyle(() => ({
        transform: [
            {
                translateY: interpolate(
                    queueProgress.value,
                    [0, 1],
                    [QUEUE_SHEET_HEIGHT, 0],
                    'clamp',
                ),
            },
        ],
    }));

    // Gate pointerEvents on the backdrop + sheet so the player below stays
    // interactive when the queue is closed (an invisible Pressable at opacity 0
    // would otherwise swallow taps).
    const [isQueueInteractive, setIsQueueInteractive] = useState(false);
    useAnimatedReaction(
        () => queueProgress.value > 0.05,
        (open, previous) => {
            if (open !== previous) {
                runOnJS(setIsQueueInteractive)(open);
            }
        },
    );

    const closeQueue = useCallback(() => {
        queueProgress.value = withSpring(0, settleSpring);
    }, [queueProgress, settleSpring]);

    // Horizontal swipe-to-skip. Separated so it can fail cleanly when the gesture
    // is clearly vertical — composing with Simultaneous lets the user
    // start a swipe in either direction without one stealing the other.
    const skipGesture = useMemo(
        () =>
            Gesture.Pan()
                .enabled(canSkipPlayback)
                .activeOffsetX([-30, 30])
                .failOffsetY([-30, 30])
                .onEnd((event) => {
                    'worklet';
                    if (event.translationX < -80 || event.velocityX < -700) {
                        runOnJS(onNext)();
                    } else if (event.translationX > 80 || event.velocityX > 700) {
                        runOnJS(onPrevious)();
                    }
                }),
        [canSkipPlayback, onNext, onPrevious],
    );

    const playerGesture = useMemo(
        () => Gesture.Simultaneous(dragGesture, skipGesture),
        [dragGesture, skipGesture],
    );

    // One solid card sliding up over the app. The shell is laid out once at full
    // size (styles.fullPlayer: top 0, height SCREEN_HEIGHT, opaque) and parked
    // below the screen when closed — so the ONLY thing that animates per frame is
    // translateY, a cheap GPU transform with no height/top/flex layout work. The
    // top corners round off as it docks for a tactile "card" read.
    const playerAnimatedStyle = useAnimatedStyle(() => {
        const p = playerProgress.value;
        return {
            borderTopLeftRadius: shellTopRadius(p),
            borderTopRightRadius: shellTopRadius(p),
            transform: [
                { translateY: interpolate(p, [0, 1], [SCREEN_HEIGHT, 0], 'clamp') },
            ],
        };
    });

    // Settle haptic — fires exactly once whenever the spring lands at fully
    // open, whatever path got us there (tap, drag, programmatic). Does not
    // fire on close, on initial mount, or on partial drags that snap back.
    useAnimatedReaction(
        () => playerProgress.value > 0.985,
        (settled, previous) => {
            if (settled && previous === false) {
                runOnJS(triggerImpact)('light');
            }
        },
    );

    useAnimatedReaction(
        () => playerProgress.value > 0.02,
        (interactive, previous) => {
            if (interactive !== previous) {
                runOnJS(setIsShellInteractive)(interactive);
            }
        },
    );

    // Stay mounted whenever there's something to play, so close animations
    // triggered from outside the player (back button, navigation) still get to
    // run. Visibility/interactivity is now derived from playerProgress + visible.
    if (!displayItem) {
        return null;
    }

    const durationMs = activeItem
        ? getPlaybackDurationMs(playbackState)
        : (displayItem.durationSeconds ?? 0) * 1000;
    const isLive = activeItem ? isLivePlayback(playbackState) : Boolean(displayItem.isLive);
    const isPlaying = playbackState.status === 'playing' || playbackState.status === 'buffering';
    const display = activeItem
        ? getPlaybackDisplayMetadata(playbackState)
        : getPlayableDisplayMetadata(
              displayItem,
              (displayItem.initialPositionSeconds ?? 0) * 1000,
          );
    const displayTitle = display.lines[0] || display.title || displayItem.title || 'Unknown title';
    const isMusicSource = displayItem.source === 'music';
    const qualityItems = isMusicSource
        ? buildAudioQualityBadgeItems({
              ...displayItem.quality,
              compact: true,
              mode: 'detail',
          })
        : [];
    const isLongFormSource =
        displayItem.source === 'audiobook' || displayItem.source === 'podcast';
    const showShuffleControl = !isLongFormSource && displayItem.source !== 'radio';
    const showSkipControls = displayItem.source !== 'radio';
    const showLongFormSkip = Boolean(onSkipBySeconds) && isLongFormSource;
    const showSleepInBottomBar = isLongFormSource;
    const showCastInMainControls = displayItem.source === 'radio';
    const castButton = (
        <Pressable
            accessibilityLabel={
                castState.isConnected
                    ? `Choose audio output. Casting to ${castState.deviceName ?? 'Chromecast'}`
                    : 'Choose audio output'
            }
            accessibilityRole="button"
            onPress={onOpenOutputPicker}
            style={styles.fullPlayerBottomBarButton}
        >
            <CastGlyph
                color={
                    castState.isConnected
                        ? CAST_ICON_ACTIVE_TINT
                        : CAST_ICON_INACTIVE_TINT
                }
                size={22}
            />
        </Pressable>
    );
    const sleepTimerButton = (
        <Pressable
            accessibilityLabel="Sleep Timer"
            accessibilityRole="button"
            onPress={() =>
                sleepSecondsLeft !== null ? cancelSleepTimer() : setSleepMenuVisible(true)
            }
            style={styles.fullPlayerBottomBarButton}
        >
            <SleepTimerGlyph
                active={sleepSecondsLeft !== null}
                color={sleepSecondsLeft !== null ? colors.accent : colors.text}
            />
        </Pressable>
    );
    const filePositionMs =
        playbackState.status !== 'idle' ? (playbackState.positionMs ?? 0) : 0;
    const positionMs = activeItem
        ? getDisplayPositionMs(activeItem, filePositionMs)
        : filePositionMs;
    const handleTimelineSeek = (timelinePositionMs: number) => {
        if (!activeItem) {
            onSeek(timelinePositionMs);
            return;
        }

        if (activeItem.source === 'audiobook' || activeItem.source === 'podcast') {
            onSeek(
                getPlayerPositionMsForAbsProgress(
                    timelinePositionMs / 1000,
                    activeItem,
                ),
            );
            return;
        }

        onSeek(timelinePositionMs);
    };
    const timelineSegments = displayItem.timelineSegments;
    return (
        <>
        <GestureDetector gesture={playerGesture}>
        <Reanimated.View
            pointerEvents={isShellInteractive ? 'auto' : 'none'}
            style={[
                styles.fullPlayer,
                playerAnimatedStyle,
            ]}
        >
            {/* Frosted-glass backdrop. Deliberately album-independent — one
                consistent premium surface instead of a color that repaints per
                track. A warm charcoal base wash is lifted by a soft diagonal
                glass sheen (light catching the surface), grounded by a gentle
                bottom vignette, and textured with fine frost grain (the dither
                overlay) so the whole panel reads as gilded frosted glass. */}
            <View
                pointerEvents="none"
                style={StyleSheet.absoluteFillObject}
            >
                <LinearGradient
                    colors={FROSTED_BACKDROP_STOPS as unknown as string[]}
                    end={{ x: 0.82, y: 1 }}
                    pointerEvents="none"
                    start={{ x: 0.18, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                />
                <LinearGradient
                    colors={FROSTED_GLASS_SHEEN as unknown as string[]}
                    end={{ x: 0.85, y: 0.9 }}
                    locations={FROSTED_GLASS_SHEEN_LOCATIONS as unknown as number[]}
                    pointerEvents="none"
                    start={{ x: 0.05, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                />
                <LinearGradient
                    colors={FROSTED_GLASS_DEPTH as unknown as string[]}
                    end={{ x: 0.5, y: 1 }}
                    locations={FROSTED_GLASS_DEPTH_LOCATIONS as unknown as number[]}
                    pointerEvents="none"
                    start={{ x: 0.5, y: 0.5 }}
                    style={StyleSheet.absoluteFillObject}
                />
                <View
                    pointerEvents="none"
                    style={[StyleSheet.absoluteFillObject, styles.fullPlayerDither]}
                >
                    <Image
                        resizeMode="repeat"
                        source={ditherTexture}
                        style={StyleSheet.absoluteFillObject}
                    />
                </View>
            </View>

            <Reanimated.View style={styles.fullPlayerExpandedPanel}>
            <View style={styles.fullPlayerContent}>
            <View style={styles.fullPlayerHeader}>
                <Pressable
                    accessibilityLabel="Close player"
                    accessibilityRole="button"
                    onPress={dismissPlayer}
                    style={styles.fullPlayerHeaderButton}
                >
                    <DownCaretGlyph color={colors.text} />
                </Pressable>
                <View style={styles.fullPlayerHeaderSpacer} />
                <Pressable
                    accessibilityLabel="More options"
                    accessibilityRole="button"
                    onPress={() => openFullscreenContextMenu()}
                    style={styles.fullPlayerHeaderButton}
                >
                    <EllipsisVerticalGlyph color={colors.text} />
                </Pressable>
            </View>

            <View style={styles.fullPlayerArtworkWrap}>
                <Pressable
                    accessibilityLabel={`Open ${displayTitle} artwork`}
                    accessibilityRole="button"
                    disabled={!artworkUrl && !artworkImageId}
                    onPress={() => setIsArtworkZoomOpen(true)}
                    style={styles.fullPlayerArtworkShadow}
                >
                    {artworkUrl || artworkImageId ? (
                        <ArtworkImage
                            artworkImageId={artworkImageId}
                            contentSource={contentSource}
                            fallbackStyle={styles.fullPlayerArtworkFallback}
                            letter={displayTitle.slice(0, 1)}
                            serverConnection={serverConnection}
                            style={styles.fullPlayerArtwork}
                            transition={280}
                            uri={artworkUrl}
                        />
                    ) : (
                        <View style={styles.fullPlayerArtworkFallback}>
                            <Text style={styles.fullPlayerArtworkLetter}>
                                {displayTitle.slice(0, 1)}
                            </Text>
                        </View>
                    )}
                </Pressable>
            </View>

            {/* Bottom stack — revealed by the growing shell clip, fixed layout. */}
            <View
                style={[
                    styles.fullPlayerBottom,
                    !isMusicSource && styles.fullPlayerBottomLifted,
                ]}
            >
                <View style={styles.fullPlayerMetadata}>
                    {display.lines.length > 0 ? (
                        <Text numberOfLines={2} style={styles.fullPlayerTitle}>
                            {display.lines[0]}
                        </Text>
                    ) : (
                        <Text numberOfLines={2} style={styles.fullPlayerTitle}>
                            {displayTitle}
                        </Text>
                    )}
                    {display.lines.slice(1).map((line) => (
                        <Text key={line} numberOfLines={1} style={styles.fullPlayerSubtitle}>
                            {line}
                        </Text>
                    ))}
                    {qualityItems.length > 0 ? (
                        <View style={styles.fullPlayerQualityRow}>
                            <QualityBadgeRow items={qualityItems} />
                        </View>
                    ) : null}
                </View>

                <View style={styles.fullPlayerProgress}>
                    <SegmentedSeekBar
                        durationMs={durationMs}
                        isLive={isLive}
                        isPlaying={playbackState.status === 'playing'}
                        onSeek={handleTimelineSeek}
                        positionMs={positionMs}
                        segments={timelineSegments}
                        sessionKey={
                            activeItem && playbackState.status !== 'idle'
                                ? `${playbackState.sessionId}:${activeItem.id}`
                                : undefined
                        }
                        tint={colors.accent}
                    />
                    <View style={styles.fullPlayerTimeRow}>
                        <Text style={styles.fullPlayerTime}>
                            {isLive ? '' : formatPlaybackTime(positionMs)}
                        </Text>
                        <Text style={[styles.fullPlayerTime, styles.fullPlayerTimeRight]}>
                            {activeItem
                                ? getDurationLabel(playbackState)
                                : displayItem.source === 'radio'
                                  ? 'RADIO'
                                  : formatPlaybackTime(durationMs)}
                        </Text>
                    </View>
                </View>

                <View style={styles.fullPlayerControls}>
                    <View
                        style={[
                            styles.fullPlayerControlSide,
                            styles.fullPlayerControlSideLeft,
                            showLongFormSkip && styles.fullPlayerControlSideLongForm,
                        ]}
                    >
                        {showShuffleControl ? (
                            <PlayerIconButton
                                accessibilityLabel="Shuffle"
                                onPress={onToggleShuffle}
                            >
                                <ShuffleGlyph active={isShuffled} color={colors.text} />
                            </PlayerIconButton>
                        ) : showCastInMainControls ? (
                            castButton
                        ) : null}
                        {showSkipControls ? (
                            <PlayerIconButton accessibilityLabel="Previous" onPress={onPrevious}>
                                <TrackSkipGlyph color={colors.text} direction={-1} size={24} />
                            </PlayerIconButton>
                        ) : (
                            <View style={styles.playerControlButtonSpacer} />
                        )}
                        {showLongFormSkip ? (
                            <PlayerIconButton
                                accessibilityLabel={`Back ${LONG_FORM_RELATIVE_SKIP_SECONDS} seconds`}
                                onPress={() =>
                                    onSkipBySeconds?.(-LONG_FORM_RELATIVE_SKIP_SECONDS)
                                }
                            >
                                <Text style={styles.longFormSkipLabel}>
                                    −{LONG_FORM_RELATIVE_SKIP_SECONDS}
                                </Text>
                            </PlayerIconButton>
                        ) : null}
                    </View>
                    <View style={styles.playerControlPrimarySlot}>
                        <PlayerIconButton
                            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                            onPress={onTogglePlayback}
                            primary
                        >
                            <PlayPauseGlyph
                                color={colors.text}
                                isPlaying={isPlaying}
                                size={FULL_PLAYER_PLAY_GLYPH_SIZE}
                            />
                        </PlayerIconButton>
                    </View>
                    <View
                        style={[
                            styles.fullPlayerControlSide,
                            styles.fullPlayerControlSideRight,
                            showLongFormSkip && styles.fullPlayerControlSideLongForm,
                        ]}
                    >
                        {showLongFormSkip ? (
                            <PlayerIconButton
                                accessibilityLabel={`Forward ${LONG_FORM_RELATIVE_SKIP_SECONDS} seconds`}
                                onPress={() =>
                                    onSkipBySeconds?.(LONG_FORM_RELATIVE_SKIP_SECONDS)
                                }
                            >
                                <Text style={styles.longFormSkipLabel}>
                                    +{LONG_FORM_RELATIVE_SKIP_SECONDS}
                                </Text>
                            </PlayerIconButton>
                        ) : null}
                        {showSkipControls ? (
                            <PlayerIconButton accessibilityLabel="Next" onPress={onNext}>
                                <TrackSkipGlyph color={colors.text} direction={1} size={24} />
                            </PlayerIconButton>
                        ) : (
                            <View style={styles.playerControlButtonSpacer} />
                        )}
                        {!showSleepInBottomBar ? (
                            <PlayerIconButton
                                accessibilityLabel="Sleep Timer"
                                onPress={() =>
                                    sleepSecondsLeft !== null
                                        ? cancelSleepTimer()
                                        : setSleepMenuVisible(true)
                                }
                            >
                                <SleepTimerGlyph
                                    active={sleepSecondsLeft !== null}
                                    color={
                                        sleepSecondsLeft !== null
                                            ? colors.accent
                                            : colors.text
                                    }
                                />
                            </PlayerIconButton>
                        ) : null}
                    </View>
                </View>

                {sleepSecondsLeft !== null && sleepSecondsLeft !== -1 && (
                    <Text style={styles.fullPlayerSleepLabel}>
                        Sleeping in {Math.floor(sleepSecondsLeft / 60)}:{String(sleepSecondsLeft % 60).padStart(2, '0')}
                    </Text>
                )}

                {(!showCastInMainControls || castState.isConnected || showSleepInBottomBar) ? (
                    <View style={styles.fullPlayerBottomBar}>
                        {!showCastInMainControls ? castButton : null}
                        {castState.isConnected ? (
                            <Text numberOfLines={1} style={styles.fullPlayerCastStatus}>
                                Casting to {castState.deviceName ?? 'Chromecast'}
                            </Text>
                        ) : (
                            <View style={styles.fullPlayerBottomBarSpacer} />
                        )}
                        {showSleepInBottomBar ? sleepTimerButton : null}
                    </View>
                ) : null}

                {activeItem && playbackState.status !== 'idle' && playbackState.message ? (
                    <Text numberOfLines={2} style={styles.fullPlayerErrorText}>
                        {playbackState.message}
                    </Text>
                ) : null}
            </View>
            </View>
            </Reanimated.View>

        </Reanimated.View>
        </GestureDetector>

        <QueueSheetOverlay
            backdropStyle={queueBackdropStyle}
            chapters={
                displayItem.source === 'audiobook' ? timelineSegments : undefined
            }
            currentPositionMs={positionMs}
            progressOffsetSeconds={displayItem.progressOffsetSeconds}
            interactive={isQueueInteractive}
            onChapterSeek={onSeek}
            onClose={closeQueue}
            onPlayQueueIndex={onPlayQueueIndex}
            queue={queue}
            serverConnection={serverConnection}
            sheetStyle={queueSheetStyle}
        />

        <ArtworkZoomModal
            artworkImageId={artworkImageId}
            contentSource={contentSource}
            onClose={() => setIsArtworkZoomOpen(false)}
            serverConnection={serverConnection}
            title={displayTitle}
            uri={artworkUrl}
            visible={isArtworkZoomOpen}
        />

        {/* Sleep timer picker */}
        <Modal animationType="slide" onRequestClose={() => setSleepMenuVisible(false)} transparent visible={sleepMenuVisible}>
            <Pressable onPress={() => setSleepMenuVisible(false)} style={styles.modalBackdrop}>
                <SwipeDismissSheet
                    onDismiss={() => setSleepMenuVisible(false)}
                    style={styles.actionSheet}
                >
                    <View style={styles.actionSheetHandle} />
                    <Text style={styles.actionSheetTitle}>Sleep Timer</Text>
                    <View style={styles.sleepPillGrid}>
                        {SLEEP_OPTIONS.map((opt) => {
                            const isActive = sleepSecondsLeft !== null
                                && ((opt.seconds === -1 && sleepSecondsLeft === -1)
                                    || (opt.seconds !== -1 && sleepSecondsLeft > 0 && Math.abs(opt.seconds - sleepSecondsLeft) <= 1));
                            return (
                                <Pressable
                                    key={opt.label}
                                    onPress={() => {
                                        startSleepTimer(opt.seconds);
                                        setSleepMenuVisible(false);
                                    }}
                                    style={[
                                        styles.sleepPill,
                                        opt.wide ? styles.sleepPillWide : null,
                                        isActive ? styles.sleepPillActive : null,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.sleepPillText,
                                            isActive ? styles.sleepPillTextActive : null,
                                        ]}
                                    >
                                        {opt.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </SwipeDismissSheet>
            </Pressable>
        </Modal>

        {/* Universal MediaContextMenu (rendered at App root) handles the "..." menu. */}
        </>
    );
});

