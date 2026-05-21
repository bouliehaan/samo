import { buildAudioQualityBadgeItems } from '@samo/core/audio-quality';
import {
    getMobileContentSource,
    getPlaybackQualityProfile,
    MobileHomeItemType,
    MobileSearchItemType,
    type MobileHomeItem,
    type MobilePlayableAudio,
    type MobilePlaybackSegment,
    type MobileSearchItem,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';
import { FlashList } from '@shopify/flash-list';
import { Image as ExpoImage } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { getColors as getImageColors } from 'react-native-image-colors';
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
    Animated,
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
    useAnimatedScrollHandler,
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
import { getPersistedServerAuthKey } from '../services/persisted-server';
import { useAndroidPlaybackState } from '../state/playback-store';
import { type AndroidPlaybackState } from '../types/playback';
import {
    findActiveChapterIndex,
    formatChapterRange,
    formatPlaybackTime,
    getActivePlaybackStatus,
    getDurationLabel,
    getPlaybackDisplayMetadata,
    getPlaybackDurationMs,
    getStablePlaybackPositionMs,
    isLivePlayback,
} from '../utils/playback-time';
import { buildBackdropStops, darkenColor, pickAlbumEssenceColor } from '../utils/color';
import { clamp } from '../utils/math';
import { formatQualityProfile } from '../services/quality-badge-assets';
import { triggerImpact } from '../services/haptics';
import {
    DISMISS_DISTANCE,
    DISMISS_VELOCITY,
    FULL_PLAYER_EXPANDED_TOP,
    FULL_PLAYER_PADDING_TOP,
    MINI_PLAYER_COLLAPSED_TOP,
    MINI_PLAYER_HEIGHT,
    MINI_PLAYER_RADIUS,
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
import { PlayerMorphArtwork } from './PlayerMorphArtwork';
import {
    collapsedLidOpacity,
    contentRevealOpacity,
    contentRevealProgress,
    contentRevealTranslateY,
    miniHandoffOpacity,
    miniStaticArtworkOpacity,
    PLAYER_CLOSE_SPRING,
    PLAYER_OPEN_SPRING,
    shellElevation,
    shellMaterialOpacity,
    staticHeroArtworkOpacity,
    washLayerOpacity,
    washLayerTranslateY,
} from './player-motion';

const ReanimatedFlashList = Reanimated.createAnimatedComponent(FlashList) as typeof FlashList;
const FLASH_LIST_MAINTAIN_POSITION_DISABLED = { disabled: true };
const CAST_ICON_ACTIVE_TINT = 'rgba(202, 160, 79, 0.78)';
const CAST_ICON_INACTIVE_TINT = 'rgba(245, 245, 245, 0.72)';

export const MiniPlayer = memo(({
    artworkUrl,
    lastPlayedItem,
    onOpenFullPlayer,
    onTogglePlayback,
    playbackState,
    playerProgress,
    reducedMotion,
}: {
    // The canonical high-res artwork URL for the current playback. Same URL
    // the FullScreenPlayer uses, so opening fullscreen is a guaranteed cache
    // hit — no flicker, no "low-res first" state.
    artworkUrl: string | undefined;
    lastPlayedItem: MobilePlayableAudio | null;
    onOpenFullPlayer: () => void;
    onTogglePlayback: () => void;
    playbackState: AndroidPlaybackState;
    playerProgress: SharedValue<number>;
    reducedMotion: boolean;
}) => {
    const [isMiniInteractive, setIsMiniInteractive] = useState(true);
    useAnimatedReaction(
        () => playerProgress.value < 0.1,
        (interactive, previous) => {
            if (interactive !== previous) {
                runOnJS(setIsMiniInteractive)(interactive);
            }
        },
    );

    // Mini chrome stays glued to the dock until the shell has grown over it — no
    // float-away; one object, not two layers sliding past each other.
    const miniAnimatedStyle = useAnimatedStyle(() => ({
        opacity: miniHandoffOpacity(playerProgress.value),
    }));
    const miniArtworkAnimatedStyle = useAnimatedStyle(() => ({
        opacity: miniStaticArtworkOpacity(playerProgress.value),
    }));
    // Drag-up follows the finger by moving progress across the actual distance
    // between the mini player's top edge and the fullscreen top edge. That
    // keeps the expanding surface under the finger instead of behaving like a
    // generic modal sheet.
    //
    // Failure offsets keep horizontal swipes and the play/pause tap from
    // accidentally triggering the open gesture.
    const openSpring = reducedMotion ? REDUCED_MOTION_SPRING : PLAYER_OPEN_SPRING;
    const settleSpring = reducedMotion ? REDUCED_MOTION_SPRING : OPEN_SPRING;
    const miniDragGesture = useMemo(
        () =>
            Gesture.Pan()
                .activeOffsetY(-8)
                .failOffsetX([-20, 20])
                .onChange((event) => {
                    'worklet';
                    if (event.translationY >= 0) {
                        playerProgress.value = 0;
                        return;
                    }
                    const next = -event.translationY / PLAYER_EXPANSION_DISTANCE;
                    playerProgress.value = next > 1 ? 1 : next;
                })
                .onEnd((event) => {
                    'worklet';
                    const shouldCommit =
                        event.translationY < -PLAYER_EXPANSION_DISTANCE * 0.24 ||
                        event.velocityY < -760;
                    if (shouldCommit) {
                        runOnJS(onOpenFullPlayer)();
                        playerProgress.value = reducedMotion
                            ? withTiming(1, { duration: 0 })
                            : withSpring(1, {
                                  ...openSpring,
                                  velocity: -event.velocityY / PLAYER_EXPANSION_DISTANCE,
                              });
                    } else {
                        playerProgress.value = reducedMotion
                            ? withTiming(0, { duration: 0 })
                            : withSpring(0, {
                                  ...openSpring,
                                  velocity: -event.velocityY / PLAYER_EXPANSION_DISTANCE,
                              });
                    }
                }),
        [onOpenFullPlayer, openSpring, playerProgress, reducedMotion],
    );

    const isActive = playbackState.status !== 'idle';
    const displayItem: MobilePlayableAudio | null = isActive
        ? playbackState.item
        : lastPlayedItem;
    const isPlaying = playbackState.status === 'playing' || playbackState.status === 'buffering';
    const activeDisplay = isActive ? getPlaybackDisplayMetadata(playbackState) : null;
    const title = activeDisplay?.title ?? displayItem?.title ?? '';
    const subtitle = isActive
        ? (playbackState.message ?? activeDisplay?.subtitle)
        : (displayItem?.subtitle ?? undefined);
    const miniBadgeProfile =
        displayItem?.source === 'music' ? getPlaybackQualityProfile(displayItem) : undefined;

    const handlePlayPress = (event: GestureResponderEvent) => {
        event.stopPropagation();
        onTogglePlayback();
    };

    return (
        <GestureDetector gesture={miniDragGesture}>
        <Reanimated.View
            pointerEvents={isMiniInteractive ? 'auto' : 'none'}
            style={[styles.miniPlayer, miniAnimatedStyle]}
        >
            <Pressable
                accessibilityRole="button"
                onPress={onOpenFullPlayer}
                style={styles.miniPlayerTouchable}
            >
                <View style={styles.miniPlayerArtworkContainer}>
                    <Reanimated.View style={[styles.miniPlayerArtworkSlot, miniArtworkAnimatedStyle]}>
                        {artworkUrl ? (
                            <ExpoImage
                                cachePolicy="memory-disk"
                                source={artworkUrl}
                                style={styles.miniPlayerArtwork}
                                transition={120}
                            />
                        ) : (
                            <View style={styles.miniPlayerArtworkFallback}>
                                {title ? (
                                    <Text style={styles.miniPlayerArtworkLetter}>
                                        {title.slice(0, 1)}
                                    </Text>
                                ) : null}
                            </View>
                        )}
                    </Reanimated.View>
                </View>
                <View style={styles.miniPlayerText}>
                    <Text numberOfLines={1} style={styles.miniPlayerTitle}>
                        {title || 'Nothing playing'}
                    </Text>
                    {subtitle ? (
                        <Text numberOfLines={1} style={styles.miniPlayerSubtitle}>
                            {subtitle}
                        </Text>
                    ) : null}
                </View>
                <QualityBadge player profile={miniBadgeProfile} />
                <Pressable
                    accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                    accessibilityRole="button"
                    disabled={!displayItem}
                    onPress={handlePlayPress}
                    style={styles.miniPlayerPlayButton}
                >
                    <PlayPauseGlyph color={colors.text} isPlaying={isPlaying} size={24} />
                </Pressable>
            </Pressable>
        </Reanimated.View>
        </GestureDetector>
    );
});

export const ConnectedMiniPlayer = memo((
    props: Omit<ComponentProps<typeof MiniPlayer>, 'playbackState'>,
) => {
    const playbackState = useAndroidPlaybackState();
    return <MiniPlayer {...props} playbackState={playbackState} />;
});

ConnectedMiniPlayer.displayName = 'ConnectedMiniPlayer';

export const NowPlayingMetadataSync = memo(() => {
    const metadataKey = useAndroidPlaybackState((state) => {
        if (state.status === 'idle') {
            return null;
        }

        const display = getPlaybackDisplayMetadata(state);
        return JSON.stringify({
            artworkUrl: state.item.artworkUrl,
            id: state.item.id,
            sessionId: state.sessionId,
            source: state.item.source,
            subtitle: display.subtitle,
            title: display.title || state.item.title,
        });
    });
    const lastSentRef = useRef<string | null>(null);

    useEffect(() => {
        if (
            !metadataKey ||
            metadataKey === lastSentRef.current ||
            !isAndroidNativePlaybackAvailable()
        ) {
            return;
        }

        lastSentRef.current = metadataKey;
        const metadata = JSON.parse(metadataKey) as {
            artworkUrl?: string;
            id: string;
            sessionId: string;
            source: string;
            subtitle?: string;
            title: string;
        };

        void updateAndroidNowPlayingMetadata(metadata).catch(() => undefined);
    }, [metadataKey]);

    return null;
});

NowPlayingMetadataSync.displayName = 'NowPlayingMetadataSync';

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
    artworkUrl,
    castState,
    isShuffled,
    lastPlayedItem,
    onClose,
    onNext,
    onPlayQueueIndex,
    onPrevious,
    onSeek,
    onToggleShuffle,
    onTogglePlayback,
    playbackQueueRevision: _playbackQueueRevision,
    playbackState,
    playerProgress,
    queue,
    reducedMotion,
    serverConnections,
    visible,
}: {
    // Canonical high-res artwork URL — same string the MiniPlayer renders.
    // Derived once in the parent so the two players share one expo-image
    // cache entry and one in-flight load.
    artworkUrl: string | undefined;
    castState: AndroidCastState;
    isShuffled: boolean;
    lastPlayedItem: MobilePlayableAudio | null;
    onClose: () => void;
    onNext: () => void;
    onPlayQueueIndex?: (index: number) => void;
    onPrevious: () => void;
    onSeek: (positionMs: number) => void;
    onTogglePlayback: () => void;
    onToggleShuffle: () => void;
    /** Bumps when the JS queue ref mutates so memoized player re-reads `queue`. */
    playbackQueueRevision: number;
    playbackState: AndroidPlaybackState;
    playerProgress: SharedValue<number>;
    queue: { index: number; items: MobilePlayableAudio[] } | null;
    reducedMotion: boolean;
    serverConnections: ServerAuthenticationResult[];
    visible: boolean;
}) => {
    const [sleepMenuVisible, setSleepMenuVisible] = useState(false);
    const [outputPickerVisible, setOutputPickerVisible] = useState(false);
    const [isArtworkZoomOpen, setIsArtworkZoomOpen] = useState(false);
    const [sleepSecondsLeft, setSleepSecondsLeft] = useState<null | number>(null);
    // Queue sheet position: 0 = hidden below the screen, 1 = fully expanded.
    // Driven by the same vertical-drag gesture that handles player dismiss,
    // mode-switched per drag based on direction and current state.
    const queueProgress = useSharedValue(0);
    const dragMode = useSharedValue<'player' | 'queue'>('player');
    const dragStartQueue = useSharedValue(0);
    const contextMenu = useMediaContextMenu();
    const [bgPrev, setBgPrev] = useState<null | string>(null);
    const [bgCurr, setBgCurr] = useState<null | string>(null);
    const bgFade = useRef(new Animated.Value(1)).current;
    const sleepTimerRef = useRef<NodeJS.Timeout | null>(null);
    const sleepTickRef = useRef<NodeJS.Timeout | null>(null);
    const activeItem = playbackState.status !== 'idle' ? playbackState.item : null;
    const displayItem: MobilePlayableAudio | null = activeItem ?? lastPlayedItem;
    const isResting = !activeItem && Boolean(displayItem);
    const canSkipPlayback = Boolean(displayItem && displayItem.source !== 'radio');

    useEffect(() => {
        if (!artworkUrl) return;
        let cancelled = false;
        getImageColors(artworkUrl, {
            cache: true,
            fallback: '#101010',
            key: artworkUrl,
            // High-quality extraction picks more swatches and clusters them
            // more carefully, which dramatically improves the OKLab scorer's
            // chance of finding a characteristic muted swatch.
            quality: 'high',
        })
            .then((result) => {
                if (cancelled) return;
                const next = pickAlbumEssenceColor(result);
                if (!next) return;
                setBgCurr((current) => {
                    if (current === next) return current;
                    setBgPrev(current);
                    bgFade.setValue(0);
                    Animated.timing(bgFade, {
                        duration: 520,
                        toValue: 1,
                        useNativeDriver: false,
                    }).start();
                    return next;
                });
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [artworkUrl, bgFade]);

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
        const idPrefixMatch = item.id.match(/^([^:]+:[^:]+):(?:music|audiobook|podcast|radio):/);
        const sourceId = item.contentSourceId ?? idPrefixMatch?.[1];
        const auth = sourceId
            ? serverConnections.find(
                  (candidate) => getPersistedServerAuthKey(candidate) === sourceId,
              )
            : undefined;
        const contentSource = auth ? getMobileContentSource(auth) : undefined;
        // Playback ids look like `<authType>:<authUrl>:<source>:<innerId>[:<episodeId>]`.
        // Strip the prefix so menu actions like "Go to Album" hit real Subsonic ids.
        const idMatch = item.id.match(/:(?:music|audiobook|podcast|radio):(.+)$/);
        const innerId = idMatch ? idMatch[1] : item.id;

        if (item.source === 'music') {
            const songItem: MobileSearchItem = {
                album: item.album,
                albumId: item.albumId,
                artist: item.artist,
                artistId: item.artistId,
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
            // For podcasts the inner id is `<itemId>:<episodeId>`; for audiobooks it's
            // just `<itemId>`. Either way we want the library item id for the menu.
            const ownerId = innerId.split(':')[0];
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
    }, [contextMenu, lastPlayedItem, playbackState, serverConnections]);

    // One vertical-drag gesture handles three intents based on direction and
    // current state: swipe-down dismisses the player; swipe-up opens the queue
    // sheet (replacing the old queue button); a swipe-down while the queue is
    // open closes the queue instead of dismissing the player. Mode is locked
    // at the moment the first significant drag direction is detected so the
    // motion stays predictable.
    const dragGesture = useMemo(
        () =>
            Gesture.Pan()
                .activeOffsetY([-10, 10])
                .failOffsetX([-30, 30])
                .onStart(() => {
                    'worklet';
                    dragStartQueue.value = queueProgress.value;
                    // Tentative: if the queue is already open, this drag is
                    // about the queue; otherwise wait for direction to decide.
                    dragMode.value = queueProgress.value > 0 ? 'queue' : 'player';
                })
                .onChange((event) => {
                    'worklet';
                    if (
                        dragMode.value === 'player' &&
                        event.translationY < -10
                    ) {
                        // First upward motion: switch to queue-mode.
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

    // The outer shell keeps the original physical frame expansion out of the
    // miniplayer. The expensive content inside is fixed at the fully-open size
    // and clipped by this shell, so the gesture still reads as one object
    // sliding open without forcing the whole player body through layout.
    const playerAnimatedStyle = useAnimatedStyle(() => {
        const p = playerProgress.value;
        return {
            borderTopLeftRadius: interpolate(p, [0, 1], [MINI_PLAYER_RADIUS, 0], 'clamp'),
            borderTopRightRadius: interpolate(p, [0, 1], [MINI_PLAYER_RADIUS, 0], 'clamp'),
            elevation: shellElevation(p),
            height: interpolate(p, [0, 1], [MINI_PLAYER_HEIGHT, SCREEN_HEIGHT], 'clamp'),
            opacity: shellMaterialOpacity(p),
            top: interpolate(
                p,
                [0, 1],
                [MINI_PLAYER_COLLAPSED_TOP, FULL_PLAYER_EXPANDED_TOP],
                'clamp',
            ),
        };
    });
    const backdropWashStyle = useAnimatedStyle(() => ({
        opacity: washLayerOpacity(playerProgress.value),
        transform: [{ translateY: washLayerTranslateY(playerProgress.value) }],
    }));
    const collapsedSurfaceStyle = useAnimatedStyle(() => ({
        opacity: collapsedLidOpacity(playerProgress.value),
    }));
    const playerContentAnimatedStyle = useAnimatedStyle(() => {
        const p = playerProgress.value;
        const reveal = contentRevealProgress(p);
        const paddingCompensationY = interpolate(
            p,
            [0, 1],
            [-FULL_PLAYER_PADDING_TOP, 0],
            'clamp',
        );
        return {
            opacity: contentRevealOpacity(reveal),
            transform: [
                {
                    translateY: contentRevealTranslateY(reveal, paddingCompensationY),
                },
            ],
        };
    });
    const staticHeroArtworkStyle = useAnimatedStyle(() => ({
        opacity: staticHeroArtworkOpacity(playerProgress.value),
    }));

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
        : { subtitle: displayItem.subtitle, title: displayItem.title };
    const isMusicSource = displayItem.source === 'music';
    const qualityItems = isMusicSource
        ? buildAudioQualityBadgeItems({
              ...displayItem.quality,
              compact: true,
              mode: 'detail',
          })
        : [];
    const showShuffleControl =
        displayItem.source !== 'audiobook' && displayItem.source !== 'radio';
    const showSkipControls = displayItem.source !== 'radio';
    const castButton = (
        <Pressable
            accessibilityLabel={
                castState.isConnected
                    ? `Choose audio output. Casting to ${castState.deviceName ?? 'Chromecast'}`
                    : 'Choose audio output'
            }
            accessibilityRole="button"
            onPress={() => setOutputPickerVisible(true)}
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
    const positionMs =
        playbackState.status !== 'idle' ? (playbackState.positionMs ?? 0) : 0;
    const timelineSegments = displayItem.timelineSegments;
    return (
        <>
        <GestureDetector gesture={playerGesture}>
        <Reanimated.View
            pointerEvents={visible ? 'auto' : 'none'}
            style={[
                styles.fullPlayer,
                playerAnimatedStyle,
            ]}
        >
            {/* OLED base; remains under the gradients so unfilled corners stay black. */}
            <View pointerEvents="none" style={styles.fullPlayerBg} />
            {/* Tidal-style backdrop: a single album-derived color holds the whole screen
                in one family, with a gentle vertical darkening that adds depth without
                breaking into a separate tone. Two stacked native linear gradients
                cross-fade on track change so the new album color rolls in smoothly,
                and stops are perceptually generated in OKLab so the mid-gradient
                stays in the album's color family instead of muddying. */}
            <Reanimated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFillObject, backdropWashStyle]}
            >
                {bgPrev ? (
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            StyleSheet.absoluteFillObject,
                            {
                                opacity: bgFade.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [1, 0],
                                }),
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={buildBackdropStops(bgPrev) as unknown as string[]}
                            end={{ x: 0.82, y: 1 }}
                            start={{ x: 0.18, y: 0 }}
                            style={StyleSheet.absoluteFillObject}
                        />
                    </Animated.View>
                ) : null}
                <Animated.View
                    pointerEvents="none"
                    style={[
                        StyleSheet.absoluteFillObject,
                        {
                            opacity: bgCurr
                                ? bgFade.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: [0, 1],
                                  })
                                : 1,
                        },
                    ]}
                >
                    <LinearGradient
                        colors={buildBackdropStops(bgCurr) as unknown as string[]}
                        end={{ x: 0.82, y: 1 }}
                        start={{ x: 0.18, y: 0 }}
                        style={StyleSheet.absoluteFillObject}
                    />
                </Animated.View>
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
            </Reanimated.View>
            <Reanimated.View
                pointerEvents="none"
                style={[
                    StyleSheet.absoluteFillObject,
                    styles.fullPlayerCollapsedSurface,
                    collapsedSurfaceStyle,
                ]}
            />

            <PlayerMorphArtwork
                artworkUrl={artworkUrl}
                letter={display.title.slice(0, 1)}
                playerProgress={playerProgress}
            />

            <Reanimated.View style={[styles.fullPlayerContent, playerContentAnimatedStyle]}>
            {/* Header: down chevron / spacer / more menu */}
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

            {/* Artwork — fixed proportional size so it can never overlap metadata below */}
            <View style={styles.fullPlayerArtworkWrap}>
                <Reanimated.View style={[styles.fullPlayerArtworkHeroSlot, staticHeroArtworkStyle]}>
                <Pressable
                    accessibilityLabel={`Open ${display.title} artwork`}
                    accessibilityRole="button"
                    disabled={!artworkUrl}
                    onPress={() => setIsArtworkZoomOpen(true)}
                    style={styles.fullPlayerArtworkShadow}
                >
                    {artworkUrl ? (
                        <ExpoImage
                            // expo-image's default is to decode bitmaps at the
                            // view's current size. The fullscreen player's
                            // artwork view is shrunk by flex while the player
                            // is collapsed, so the default would cache a tiny
                            // bitmap and then re-decode from disk at full size
                            // mid-open — the "low-res until it gets big"
                            // flash. Forcing a full-res decode up front means
                            // one bitmap, same pixels at every player state.
                            allowDownscaling={false}
                            cachePolicy="memory-disk"
                            contentFit="cover"
                            priority="high"
                            recyclingKey={artworkUrl}
                            source={{ uri: artworkUrl }}
                            style={styles.fullPlayerArtwork}
                            transition={90}
                        />
                    ) : (
                        <View style={styles.fullPlayerArtworkFallback}>
                            <Text style={styles.fullPlayerArtworkLetter}>
                                {display.title.slice(0, 1)}
                            </Text>
                        </View>
                    )}
                    {/* Format badge sits in the corner of the artwork — the same
                        artwork-overlay treatment used on home and view-all tiles,
                        scaled up for the hero. */}
                    <QualityBadge
                        overlay
                        profile={getPlaybackQualityProfile(displayItem)}
                    />
                </Pressable>
                </Reanimated.View>
            </View>

            {/* Bottom stack: each block owns its own row — no overlap. */}
            <View
                style={[
                    styles.fullPlayerBottom,
                    !isMusicSource && styles.fullPlayerBottomLifted,
                ]}
            >
                <View style={styles.fullPlayerMetadata}>
                    <Text
                        numberOfLines={2}
                        style={styles.fullPlayerTitle}
                    >
                        {display.title}
                    </Text>
                    {display.subtitle ? (
                        <Text numberOfLines={1} style={styles.fullPlayerSubtitle}>
                            {display.subtitle}
                        </Text>
                    ) : null}
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
                        onSeek={onSeek}
                        positionMs={positionMs}
                        segments={timelineSegments}
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
                    <View style={styles.fullPlayerControlSide}>
                        {showShuffleControl ? (
                            <PlayerIconButton accessibilityLabel="Shuffle" onPress={onToggleShuffle}>
                                <ShuffleGlyph active={isShuffled} color={colors.text} />
                            </PlayerIconButton>
                        ) : (
                            castButton
                        )}
                        {showSkipControls ? (
                            <PlayerIconButton accessibilityLabel="Previous" onPress={onPrevious}>
                                <TrackSkipGlyph color={colors.text} direction={-1} />
                            </PlayerIconButton>
                        ) : (
                            <View style={styles.playerControlButtonSpacer} />
                        )}
                    </View>
                    <PlayerIconButton
                        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                        onPress={onTogglePlayback}
                        primary
                    >
                        <PlayPauseGlyph color="#ffffff" isPlaying={isPlaying} size={44} />
                    </PlayerIconButton>
                    <View style={[styles.fullPlayerControlSide, styles.fullPlayerControlSideRight]}>
                        {showSkipControls ? (
                            <PlayerIconButton accessibilityLabel="Next" onPress={onNext}>
                                <TrackSkipGlyph color={colors.text} direction={1} />
                            </PlayerIconButton>
                        ) : (
                            <View style={styles.playerControlButtonSpacer} />
                        )}
                        <PlayerIconButton
                            accessibilityLabel="Sleep Timer"
                            onPress={() => sleepSecondsLeft !== null ? cancelSleepTimer() : setSleepMenuVisible(true)}
                        >
                            <SleepTimerGlyph
                                active={sleepSecondsLeft !== null}
                                color={sleepSecondsLeft !== null ? colors.accent : colors.text}
                            />
                        </PlayerIconButton>
                    </View>
                </View>

                {sleepSecondsLeft !== null && sleepSecondsLeft !== -1 && (
                    <Text style={styles.fullPlayerSleepLabel}>
                        Sleeping in {Math.floor(sleepSecondsLeft / 60)}:{String(sleepSecondsLeft % 60).padStart(2, '0')}
                    </Text>
                )}

                {/* Bottom row — cast on left when shuffle is visible. For radio
                    and audiobooks the cast button moves up into the (now empty)
                    shuffle slot, so the bar only carries the casting-status
                    label when connected. */}
                {(showShuffleControl || castState.isConnected) ? (
                    <View style={styles.fullPlayerBottomBar}>
                        {showShuffleControl ? castButton : null}
                        {castState.isConnected ? (
                            <Text numberOfLines={1} style={styles.fullPlayerCastStatus}>
                                Casting to {castState.deviceName ?? 'Chromecast'}
                            </Text>
                        ) : null}
                    </View>
                ) : null}

                {activeItem && playbackState.status !== 'idle' && playbackState.message ? (
                    <Text numberOfLines={2} style={styles.fullPlayerErrorText}>
                        {playbackState.message}
                    </Text>
                ) : null}
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
            interactive={isQueueInteractive}
            onChapterSeek={onSeek}
            onClose={closeQueue}
            onPlayQueueIndex={onPlayQueueIndex}
            queue={queue}
            sheetStyle={queueSheetStyle}
        />

        <ArtworkZoomModal
            onClose={() => setIsArtworkZoomOpen(false)}
            title={display.title}
            uri={artworkUrl}
            visible={isArtworkZoomOpen}
        />

        <OutputPickerModal
            castState={castState}
            onClose={() => setOutputPickerVisible(false)}
            visible={outputPickerVisible}
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

export const ConnectedFullScreenPlayer = memo((
    props: Omit<ComponentProps<typeof FullScreenPlayer>, 'playbackState'>,
) => {
    const playbackState = useAndroidPlaybackState();
    return <FullScreenPlayer {...props} playbackState={playbackState} />;
});

ConnectedFullScreenPlayer.displayName = 'ConnectedFullScreenPlayer';

const EMPTY_OUTPUT_ROUTES: AndroidMediaOutputRoute[] = [];

export const getOutputRouteGlyphLabel = (route: AndroidMediaOutputRoute): string => {
    const type = route.type ?? '';
    if (type.includes('bluetooth') || type.startsWith('ble') || type === 'hearing-aid') {
        return 'BT';
    }
    if (type.startsWith('usb')) {
        return 'USB';
    }
    if (type.startsWith('wired')) {
        return 'AUX';
    }
    return 'SP';
};

export const getCastPickerEmptyMessage = (castState: AndroidCastState | undefined): string => {
    if (castState?.status === 'unavailable') {
        return 'Chromecast is unavailable on this device.';
    }
    if (castState?.status === 'connecting') {
        return 'Looking for Chromecast devices...';
    }
    return 'No Chromecast devices found.';
};

export const OutputPickerModal = memo(({
    castState,
    onClose,
    visible,
}: {
    castState: AndroidCastState;
    onClose: () => void;
    visible: boolean;
}) => {
    const [outputState, setOutputState] = useState<AndroidMediaOutputState | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectingRouteId, setSelectingRouteId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!visible) {
            return;
        }

        let cancelled = false;
        const loadRoutes = async (showLoading: boolean) => {
            if (showLoading) {
                setIsLoading(true);
            }
            setError(null);
            try {
                const next = await getAndroidOutputRoutes();
                if (!cancelled) {
                    setOutputState(next);
                }
            } catch (routeError) {
                if (!cancelled) {
                    setError(
                        routeError instanceof Error
                            ? routeError.message
                            : 'Could not load audio outputs.',
                    );
                }
            } finally {
                if (!cancelled && showLoading) {
                    setIsLoading(false);
                }
            }
        };

        void loadRoutes(true);
        const subscription = subscribeToAndroidOutputRouteEvents((next) => {
            if (cancelled) {
                return;
            }
            setOutputState(next);
            setIsLoading(false);
            setError(null);
        });
        const refreshTimers: Array<ReturnType<typeof setTimeout>> = [
            setTimeout(() => void loadRoutes(false), 850),
            setTimeout(() => void loadRoutes(false), 2200),
        ];

        return () => {
            cancelled = true;
            subscription.remove();
            refreshTimers.forEach(clearTimeout);
            setSelectingRouteId(null);
        };
    }, [visible]);

    const routes = outputState?.routes ?? EMPTY_OUTPUT_ROUTES;
    const localRoutes = routes.filter((route) => route.kind === 'local');
    const castRoutes = routes.filter((route) => route.kind === 'cast');
    const pickerCastState = outputState?.cast ?? castState;
    const listScrollYRef = useRef(0);
    const listDragStartYRef = useRef<number | null>(null);
    const listDragStartedAtTopRef = useRef(false);
    const handleListScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        listScrollYRef.current = event.nativeEvent.contentOffset.y;
    }, []);
    const handleListTouchStart = useCallback((event: GestureResponderEvent) => {
        listDragStartYRef.current = event.nativeEvent.pageY;
        listDragStartedAtTopRef.current = listScrollYRef.current <= 2;
    }, []);
    const handleListTouchEnd = useCallback((event: GestureResponderEvent) => {
        const startY = listDragStartYRef.current;
        listDragStartYRef.current = null;

        if (
            startY !== null &&
            listDragStartedAtTopRef.current &&
            event.nativeEvent.pageY - startY > QUEUE_CLOSE_DISTANCE + 18
        ) {
            onClose();
        }
    }, [onClose]);

    const handleSelectRoute = useCallback(
        async (route: AndroidMediaOutputRoute) => {
            if (selectingRouteId) {
                return;
            }
            if (route.isSelected) {
                onClose();
                return;
            }

            setSelectingRouteId(route.id);
            setError(null);
            try {
                const next = await selectAndroidOutputRoute(route);
                setOutputState(next);
                onClose();
            } catch (selectError) {
                setError(
                    selectError instanceof Error
                        ? selectError.message
                        : 'Could not switch audio output.',
                );
            } finally {
                setSelectingRouteId(null);
            }
        },
        [onClose, selectingRouteId],
    );

    const renderRoute = (route: AndroidMediaOutputRoute) => {
        const isSelecting = selectingRouteId === route.id;
        const isDisabled = Boolean(selectingRouteId) || route.isAvailable === false;
        const iconColor = route.isSelected ? colors.accent : colors.text;

        return (
            <Pressable
                accessibilityLabel={`${route.title}${route.subtitle ? `, ${route.subtitle}` : ''}`}
                accessibilityRole="button"
                disabled={isDisabled}
                key={route.id}
                onPress={(event) => {
                    event.stopPropagation();
                    void handleSelectRoute(route);
                }}
                style={({ pressed }) => [
                    styles.outputPickerRow,
                    pressed && styles.outputPickerRowPressed,
                    route.isSelected && styles.outputPickerRowSelected,
                    isDisabled && !isSelecting && styles.outputPickerRowDisabled,
                ]}
            >
                <View
                    style={[
                        styles.outputPickerIcon,
                        route.isSelected && styles.outputPickerIconSelected,
                    ]}
                >
                    {route.kind === 'cast' ? (
                        <CastGlyph color={iconColor} size={20} />
                    ) : (
                        <Text
                            adjustsFontSizeToFit
                            numberOfLines={1}
                            style={[
                                styles.outputPickerIconLabel,
                                route.isSelected && styles.outputPickerIconLabelSelected,
                            ]}
                        >
                            {getOutputRouteGlyphLabel(route)}
                        </Text>
                    )}
                </View>
                <View style={styles.outputPickerRowBody}>
                    <Text numberOfLines={1} style={styles.outputPickerTitle}>
                        {route.title}
                    </Text>
                    {route.subtitle ? (
                        <Text numberOfLines={1} style={styles.outputPickerSubtitle}>
                            {route.subtitle}
                        </Text>
                    ) : null}
                </View>
                <View style={styles.outputPickerState}>
                    {isSelecting ? (
                        <ActivityIndicator color={colors.accent} size="small" />
                    ) : route.isSelected ? (
                        <CheckGlyph color={colors.accent} size={16} />
                    ) : null}
                </View>
            </Pressable>
        );
    };

    return (
        <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
            <Pressable onPress={onClose} style={styles.modalBackdrop}>
                <Pressable
                    onPress={(event) => event.stopPropagation()}
                    style={styles.actionSheet}
                >
                    <View style={styles.actionSheetHandle} />
                    <Text style={styles.actionSheetTitle}>Audio Output</Text>
                    {isLoading && !outputState ? (
                        <View style={styles.outputPickerLoading}>
                            <ActivityIndicator color={colors.accent} size="small" />
                        </View>
                    ) : (
                        <ScrollView
                            contentContainerStyle={styles.outputPickerList}
                            keyboardShouldPersistTaps="handled"
                            nestedScrollEnabled
                            onScroll={handleListScroll}
                            onTouchEnd={handleListTouchEnd}
                            onTouchStart={handleListTouchStart}
                            scrollEventThrottle={16}
                            style={styles.outputPickerScroll}
                        >
                            {localRoutes.length > 0 ? (
                                <>
                                    <Text style={styles.outputPickerSectionLabel}>
                                        Phone and Bluetooth
                                    </Text>
                                    {localRoutes.map(renderRoute)}
                                </>
                            ) : null}
                            <Text style={styles.outputPickerSectionLabel}>Chromecast</Text>
                            {castRoutes.length > 0 ? (
                                castRoutes.map(renderRoute)
                            ) : (
                                <Text style={styles.outputPickerEmpty}>
                                    {getCastPickerEmptyMessage(pickerCastState)}
                                </Text>
                            )}
                            {error ? (
                                <Text style={styles.outputPickerError}>{error}</Text>
                            ) : null}
                        </ScrollView>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
});

export type QueueSheetListItem =
    | { chapter: MobilePlaybackSegment; index: number; kind: 'chapter' }
    | { index: number; item: MobilePlayableAudio; kind: 'queue' };

const EMPTY_QUEUE_SHEET_ROWS: QueueSheetListItem[] = [];
export const QUEUE_SHEET_ROW_HEIGHT = 60;
export const QUEUE_SHEET_DRAW_DISTANCE = QUEUE_SHEET_ROW_HEIGHT * 10;

export const QueueSheetOverlay = memo(({
    backdropStyle,
    chapters,
    currentPositionMs,
    interactive,
    onChapterSeek,
    onClose,
    onPlayQueueIndex,
    queue,
    sheetStyle,
}: {
    backdropStyle: ReturnType<typeof useAnimatedStyle>;
    chapters?: MobilePlaybackSegment[];
    currentPositionMs?: number;
    interactive: boolean;
    onChapterSeek?: (positionMs: number) => void;
    onClose: () => void;
    onPlayQueueIndex?: (index: number) => void;
    queue: { index: number; items: MobilePlayableAudio[] } | null;
    sheetStyle: ReturnType<typeof useAnimatedStyle>;
}) => {
    const items = queue?.items ?? [];
    const showingChapters = (chapters?.length ?? 0) > 0;
    const positionSeconds = (currentPositionMs ?? 0) / 1000;
    const activeChapterIndex = showingChapters
        ? findActiveChapterIndex(chapters!, positionSeconds)
        : -1;
    const queueSheetRows = useMemo<QueueSheetListItem[]>(
        () => {
            if (!interactive) {
                return EMPTY_QUEUE_SHEET_ROWS;
            }

            return showingChapters
                ? (chapters ?? []).map((chapter, index) => ({
                      chapter,
                      index,
                      kind: 'chapter' as const,
                  }))
                : items.map((item, index) => ({ index, item, kind: 'queue' as const }));
        },
        [chapters, interactive, items, showingChapters],
    );
    const listScrollY = useSharedValue(0);
    const listTopPullStartX = useSharedValue(0);
    const listTopPullStartY = useSharedValue(0);
    const listTopPullStartedAtTop = useSharedValue(false);
    const listTopPullActive = useSharedValue(false);
    const handleListScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            listScrollY.value = Math.max(0, event.contentOffset.y);
        },
    });
    const dismissGesture = useMemo(
        () =>
            Gesture.Pan()
                .activeOffsetY(8)
                .failOffsetX([-28, 28])
                .onEnd((event) => {
                    'worklet';
                    if (
                        event.translationY > QUEUE_CLOSE_DISTANCE ||
                        event.velocityY > QUEUE_CLOSE_VELOCITY
                    ) {
                        runOnJS(onClose)();
                    }
                }),
        [onClose],
    );
    const listTopPullGesture = useMemo(
        () =>
            Gesture.Pan()
                .enabled(interactive)
                .manualActivation(true)
                .onTouchesDown((event) => {
                    'worklet';
                    const touch = event.allTouches[0];
                    if (!touch) {
                        return;
                    }
                    listTopPullStartX.value = touch.absoluteX;
                    listTopPullStartY.value = touch.absoluteY;
                    listTopPullStartedAtTop.value = listScrollY.value <= 2;
                    listTopPullActive.value = false;
                })
                .onTouchesMove((event, state) => {
                    'worklet';
                    if (listTopPullActive.value) {
                        return;
                    }

                    const touch = event.allTouches[0];
                    if (!touch) {
                        state.fail();
                        return;
                    }

                    const deltaX = touch.absoluteX - listTopPullStartX.value;
                    const deltaY = touch.absoluteY - listTopPullStartY.value;
                    if (
                        !listTopPullStartedAtTop.value ||
                        listScrollY.value > 2 ||
                        deltaY < -4 ||
                        (Math.abs(deltaX) > 28 && Math.abs(deltaX) > deltaY)
                    ) {
                        state.fail();
                        return;
                    }

                    if (deltaY > 8) {
                        state.activate();
                    }
                })
                .onStart(() => {
                    'worklet';
                    listTopPullActive.value = true;
                })
                .onEnd((event) => {
                    'worklet';
                    if (
                        event.translationY > QUEUE_CLOSE_DISTANCE ||
                        event.velocityY > QUEUE_CLOSE_VELOCITY
                    ) {
                        runOnJS(onClose)();
                    }
                })
                .onFinalize(() => {
                    'worklet';
                    listTopPullActive.value = false;
                    listTopPullStartedAtTop.value = false;
                }),
        [
            interactive,
            listScrollY,
            listTopPullActive,
            listTopPullStartX,
            listTopPullStartY,
            listTopPullStartedAtTop,
            onClose,
        ],
    );
    const listScrollGesture = useMemo(
        () => Gesture.Simultaneous(Gesture.Native(), listTopPullGesture),
        [listTopPullGesture],
    );
    const keyExtractor = useCallback((row: QueueSheetListItem) => {
        if (row.kind === 'chapter') {
            return `${row.chapter.id}-${row.index}`;
        }

        return `${row.item.id}-${row.index}`;
    }, []);
    const getItemType = useCallback((row: QueueSheetListItem) => row.kind, []);
    const renderItem = useCallback(
        ({ item: row }: { item: QueueSheetListItem }) => {
            if (row.kind === 'chapter') {
                const isActive = row.index === activeChapterIndex;
                const chapter = row.chapter;
                return (
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => onChapterSeek?.(chapter.startSeconds * 1000)}
                        style={styles.queueRow}
                    >
                        <View style={styles.queueChapterNumber}>
                            <Text
                                style={[
                                    styles.queueChapterNumberText,
                                    isActive && { color: colors.accent },
                                ]}
                            >
                                {row.index + 1}
                            </Text>
                        </View>
                        <View style={styles.queueRowBody}>
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.queueRowTitle,
                                    isActive && { color: colors.accent },
                                ]}
                            >
                                {chapter.title ?? `Chapter ${row.index + 1}`}
                            </Text>
                            <Text numberOfLines={1} style={styles.queueRowSubtitle}>
                                {formatChapterRange(chapter)}
                            </Text>
                        </View>
                        {isActive ? (
                            <View style={styles.queueNowPlayingIndicator}>
                                <View
                                    style={[
                                        styles.queueRowPlayingBar,
                                        styles.queueRowPlayingBarShort,
                                    ]}
                                />
                                <View style={styles.queueRowPlayingBar} />
                                <View
                                    style={[
                                        styles.queueRowPlayingBar,
                                        styles.queueRowPlayingBarShort,
                                    ]}
                                />
                            </View>
                        ) : null}
                    </Pressable>
                );
            }

            const isActive = queue?.index === row.index;
            const queueRowProfile = getPlaybackQualityProfile(row.item);
            return (
                <Pressable
                    accessibilityRole="button"
                    onPress={() => onPlayQueueIndex?.(row.index)}
                    style={styles.queueRow}
                >
                    <View>
                        <ArtworkImage
                            fallbackStyle={styles.queueRowThumbFallback}
                            letter={row.item.title.slice(0, 1).toUpperCase()}
                            style={styles.queueRowThumb}
                            uri={row.item.artworkUrl}
                        />
                        <QualityBadge thumb profile={queueRowProfile} />
                    </View>
                    <View style={styles.queueRowBody}>
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.queueRowTitle,
                                isActive && { color: colors.accent },
                            ]}
                        >
                            {row.item.title}
                        </Text>
                        {row.item.subtitle ? (
                            <Text numberOfLines={1} style={styles.queueRowSubtitle}>
                                {row.item.subtitle}
                            </Text>
                        ) : null}
                    </View>
                    {isActive ? (
                        <View style={styles.queueNowPlayingIndicator}>
                            <View
                                style={[
                                    styles.queueRowPlayingBar,
                                    styles.queueRowPlayingBarShort,
                                ]}
                            />
                            <View style={styles.queueRowPlayingBar} />
                            <View
                                style={[
                                    styles.queueRowPlayingBar,
                                    styles.queueRowPlayingBarShort,
                                ]}
                            />
                        </View>
                    ) : null}
                </Pressable>
            );
        },
        [activeChapterIndex, onChapterSeek, onPlayQueueIndex, queue?.index],
    );
    return (
        <>
            <Reanimated.View
                pointerEvents={interactive ? 'auto' : 'none'}
                style={[styles.queueSheetBackdrop, backdropStyle]}
            >
                <Pressable
                    accessibilityLabel="Close queue"
                    onPress={onClose}
                    style={StyleSheet.absoluteFillObject}
                />
            </Reanimated.View>
            <Reanimated.View
                pointerEvents={interactive ? 'auto' : 'none'}
                style={[styles.queueSheet, sheetStyle]}
            >
                <GestureDetector gesture={dismissGesture}>
                    <View style={styles.queueSheetHeader}>
                        <View style={styles.queueSheetHandle} />
                        <View style={styles.queueSheetTitleRow}>
                            <Text style={styles.queueSheetTitle}>
                                {showingChapters ? 'Chapters' : 'Up Next'}
                            </Text>
                            <Pressable
                                accessibilityLabel="Close queue"
                                accessibilityRole="button"
                                hitSlop={8}
                                onPress={onClose}
                                style={styles.queueSheetCloseButton}
                            >
                                <DownCaretGlyph color={colors.text} />
                            </Pressable>
                        </View>
                    </View>
                </GestureDetector>
                <GestureDetector gesture={listScrollGesture}>
                    <Reanimated.View style={styles.queueSheetScroll}>
                        <ReanimatedFlashList
                            contentContainerStyle={styles.queueSheetContent}
                            data={queueSheetRows}
                            drawDistance={QUEUE_SHEET_DRAW_DISTANCE}
                            extraData={`${activeChapterIndex}:${queue?.index ?? -1}`}
                            getItemType={getItemType}
                            keyboardShouldPersistTaps="handled"
                            keyExtractor={keyExtractor}
                            ListEmptyComponent={
                                interactive && !showingChapters ? (
                                    <Text style={styles.queueSheetEmpty}>The queue is empty.</Text>
                                ) : null
                            }
                            maintainVisibleContentPosition={FLASH_LIST_MAINTAIN_POSITION_DISABLED}
                            nestedScrollEnabled
                            onScroll={handleListScroll}
                            renderItem={renderItem}
                            scrollEventThrottle={16}
                            showsVerticalScrollIndicator={false}
                            style={styles.queueSheetScroll}
                        />
                    </Reanimated.View>
                </GestureDetector>
            </Reanimated.View>
        </>
    );
});
