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

export const MiniPlayer = memo(({
    artworkImageId,
    artworkUrl,
    contentSource,
    lastPlayedItem,
    onOpenFullPlayer,
    onTogglePlayback,
    playbackState,
    playerProgress,
    reducedMotion,
    serverConnections,
}: {
    artworkImageId?: string;
    artworkUrl: string | undefined;
    contentSource?: import('@samo/core/mobile').MobileContentSource;
    lastPlayedItem: MobilePlayableAudio | null;
    onOpenFullPlayer: () => void;
    onTogglePlayback: () => void;
    playbackState: AndroidPlaybackState;
    playerProgress: SharedValue<number>;
    reducedMotion: boolean;
    serverConnections: ServerAuthenticationResult[];
}) => {
    const [isMiniInteractive, setIsMiniInteractive] = useState(true);
    useAnimatedReaction(
        () => playerProgress.value < 0.08,
        (interactive, previous) => {
            if (interactive !== previous) {
                runOnJS(setIsMiniInteractive)(interactive);
            }
        },
    );

    const miniAnimatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(playerProgress.value, [0, 0.2], [1, 0], 'clamp'),
    }));

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
                        // Drive the expand spring on the UI thread right away so
                        // the card keeps climbing the instant the finger lifts.
                        // onOpenFullPlayer only reconciles React state; the open
                        // effect then re-targets this same spring (a no-op), so
                        // there is no stall waiting on the App re-render.
                        playerProgress.value = withSpring(
                            1,
                            reducedMotion ? REDUCED_MOTION_SPRING : PLAYER_OPEN_SPRING,
                        );
                        runOnJS(onOpenFullPlayer)();
                    } else {
                        playerProgress.value = reducedMotion
                            ? withTiming(0, { duration: 0 })
                            : withSpring(0, {
                                  ...settleSpring,
                                  velocity: -event.velocityY / PLAYER_EXPANSION_DISTANCE,
                              });
                    }
                }),
        [onOpenFullPlayer, playerProgress, reducedMotion, settleSpring],
    );

    const isActive = playbackState.status !== 'idle';
    const displayItem: MobilePlayableAudio | null = isActive
        ? playbackState.item
        : lastPlayedItem;
    const isPlaying = playbackState.status === 'playing' || playbackState.status === 'buffering';
    if (!displayItem) {
        return null;
    }
    const displayMetadata = isActive
        ? getPlaybackDisplayMetadata(playbackState)
        : getPlayableDisplayMetadata(
              displayItem,
              (displayItem.initialPositionSeconds ?? 0) * 1000,
          );
    const title = displayMetadata.title || displayItem?.title || '';
    const metadataLines = isActive && playbackState.message
        ? [title, playbackState.message]
        : displayMetadata.lines;
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
                        {artworkUrl || artworkImageId ? (
                            <ArtworkImage
                                artworkImageId={artworkImageId}
                                contentSource={contentSource}
                                fallbackStyle={styles.miniPlayerArtworkFallback}
                                letter={title.slice(0, 1)}
                                serverConnections={serverConnections}
                                style={styles.miniPlayerArtwork}
                                transition={200}
                                uri={artworkUrl}
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
                    </View>
                    <View style={styles.miniPlayerText}>
                        <Text numberOfLines={1} style={styles.miniPlayerTitle}>
                            {metadataLines[0] || title || 'Nothing playing'}
                        </Text>
                        {metadataLines.slice(1).map((line) => (
                            <Text
                                key={line}
                                numberOfLines={1}
                                style={styles.miniPlayerSubtitle}
                            >
                                {line}
                            </Text>
                        ))}
                    </View>
                    <QualityBadge player profile={miniBadgeProfile} />
                    <Pressable
                        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                        accessibilityRole="button"
                        onPress={handlePlayPress}
                        style={styles.miniPlayerPlayButton}
                    >
                        <PlayPauseGlyph
                            color={colors.text}
                            isPlaying={isPlaying}
                            size={24}
                        />
                    </Pressable>
                </Pressable>
            </Reanimated.View>
        </GestureDetector>
    );
});

MiniPlayer.displayName = 'MiniPlayer';

export const ConnectedMiniPlayer = memo((
    props: Omit<ComponentProps<typeof MiniPlayer>, 'playbackState'>,
) => {
    const playbackState = useMiniPlayerPlaybackState();
    return <MiniPlayer {...props} playbackState={playbackState} />;
});

ConnectedMiniPlayer.displayName = 'ConnectedMiniPlayer';

export const NowPlayingMetadataSync = memo(() => {
    const serverConnections = useServerConnections();
    const lastSentRef = useRef<string | null>(null);
    const serverConnectionsRef = useRef(serverConnections);
    serverConnectionsRef.current = serverConnections;

    useEffect(() => {
        if (!isAndroidNativePlaybackAvailable()) {
            return;
        }

        const syncMetadata = () => {
            const state = getAndroidPlaybackState();
            if (state.status === 'idle') {
                return;
            }

            // Radio-only channel. For every other source the NATIVE side owns
            // now-playing metadata: playLocally seeds it and onMediaItemTransition
            // re-derives it (with a token-fresh artwork URL) per track — pushes
            // from here either echo what native already has or describe a stale
            // item and get dropped by the native id-gate. Radio is the one source
            // whose metadata changes mid-item (ICY titles polled in JS), so it is
            // the one source that still needs this JS→native push. Skipping the
            // rest also stops this subscriber from doing URL/JSON work on every
            // 1-2s position tick of ordinary playback.
            if (state.item.source !== 'radio') {
                return;
            }

            const display = getPlaybackDisplayMetadata(state);
            const resolvedArtworkUrl =
                artworkSourceUri(
                    resolvePlaybackArtworkSourceForDisplay(
                        state.item,
                        serverConnectionsRef.current,
                    ),
                ) ?? state.item.artworkUrl;
            // Never push a TOKEN-LESS Samo artwork URL into the native
            // notification: the JS token cache goes stale during long native-
            // driven sessions (nothing on the JS side mints anymore), and the
            // resolver then yields a URL the notification's header-less fetch
            // can only 401 on — overwriting native's fresh artwork with a grey
            // tile. Omit the field instead (native keeps its own, freshened at
            // each transition) and mint in the background so the NEXT push
            // carries a live token again.
            let artworkUrl = resolvedArtworkUrl;
            if (isSamoMediaUrlMissingStreamToken(resolvedArtworkUrl)) {
                artworkUrl = undefined;
                const contentSource = getContentSourceFromPlaybackItem(
                    state.item,
                    serverConnectionsRef.current,
                );
                const auth = contentSource
                    ? findServerAuthenticationForSource(
                          serverConnectionsRef.current,
                          contentSource,
                      )
                    : undefined;
                if (auth) {
                    void ensureSamoStreamToken(auth)
                        .then(() => syncMetadata())
                        .catch(() => undefined);
                }
            }
            const metadataKey = JSON.stringify({
                artworkUrl,
                id: state.item.id,
                sessionId: state.sessionId,
                source: state.item.source,
                subtitle: display.subtitle,
                title: display.title || state.item.title,
            });

            if (metadataKey === lastSentRef.current) {
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
        };

        syncMetadata();
        return subscribeAndroidPlaybackState(syncMetadata);
    }, []);

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
    serverConnections,
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
    serverConnections: ServerAuthenticationResult[];
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
        const auth = sourceId
            ? serverConnections.find(
                  (candidate) => getPersistedServerAuthKey(candidate) === sourceId,
              )
            : undefined;
        const contentSource = auth ? getMobileContentSource(auth) : undefined;
        // Playback ids look like `<authType>:<authUrl>:<source>:<innerId>[:<episodeId>]`.
        // Strip the prefix so menu actions like "Go to Album" hit real Subsonic ids.
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
    }, [contextMenu, lastPlayedItem, playbackState, serverConnections]);

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
                            serverConnections={serverConnections}
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
            serverConnections={serverConnections}
            sheetStyle={queueSheetStyle}
        />

        <ArtworkZoomModal
            artworkImageId={artworkImageId}
            contentSource={contentSource}
            onClose={() => setIsArtworkZoomOpen(false)}
            serverConnections={serverConnections}
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

export const ConnectedFullScreenPlayer = memo((
    props: Omit<ComponentProps<typeof FullScreenPlayer>, 'playbackState'>,
) => {
    const fullPlaybackState = useAndroidPlaybackState();
    const miniPlaybackState = useMiniPlayerPlaybackState();
    const playbackState = props.visible ? fullPlaybackState : miniPlaybackState;
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

export const getCastPickerEmptyMessage = (
    castState: AndroidCastState | undefined,
    isScanning = false,
): string => {
    if (castState?.status === 'unavailable') {
        return 'Chromecast is unavailable on this device.';
    }
    if (castState?.status === 'connecting' || isScanning) {
        return 'Looking for Chromecast devices...';
    }
    if (castState?.status === 'no-devices') {
        return 'No Chromecast on this Wi‑Fi. Use the same network as the TV, or register the device in the Google Cast developer console for app 062D005A.';
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
        // Active scan can take a few seconds — keep polling while the sheet
        // is open so Chromecast rows populate after the first empty snapshot.
        const refreshTimers: Array<ReturnType<typeof setTimeout>> = [
            400, 900, 1600, 2500, 4000, 6000, 9000, 12_000, 16_000, 22_000,
        ].map((delay) => setTimeout(() => void loadRoutes(false), delay));
        const refreshInterval = setInterval(() => {
            void loadRoutes(false);
        }, 2500);

        return () => {
            cancelled = true;
            subscription.remove();
            refreshTimers.forEach(clearTimeout);
            clearInterval(refreshInterval);
            setSelectingRouteId(null);
        };
    }, [visible]);

    const routes = outputState?.routes ?? EMPTY_OUTPUT_ROUTES;
    const localRoutes = routes.filter((route) => route.kind === 'local');
    const castRoutes = routes.filter((route) => route.kind === 'cast');
    const pickerCastState = outputState?.cast ?? castState;
    const isScanningForCast =
        castRoutes.length === 0 && pickerCastState?.status !== 'unavailable';
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
                                    {getCastPickerEmptyMessage(
                                        pickerCastState,
                                        isLoading || isScanningForCast,
                                    )}
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
    progressOffsetSeconds,
    interactive,
    onChapterSeek,
    onClose,
    onPlayQueueIndex,
    queue,
    serverConnections,
    sheetStyle,
}: {
    backdropStyle: ReturnType<typeof useAnimatedStyle>;
    chapters?: MobilePlaybackSegment[];
    currentPositionMs?: number;
    progressOffsetSeconds?: number;
    interactive: boolean;
    onChapterSeek?: (positionMs: number) => void;
    onClose: () => void;
    onPlayQueueIndex?: (index: number) => void;
    queue: { index: number; items: MobilePlayableAudio[] } | null;
    serverConnections: ServerAuthenticationResult[];
    sheetStyle: ReturnType<typeof useAnimatedStyle>;
}) => {
    const items = queue?.items ?? [];
    const showingChapters = (chapters?.length ?? 0) > 0;
    // `currentPositionMs` is already the book-absolute playhead — getDisplayPositionMs
    // folds progressOffsetSeconds in upstream — and chapter.startSeconds are likewise
    // book-absolute (the chapter-tap seek below subtracts the offset to convert back to
    // a file position). Comparing them directly is correct; adding the offset again
    // double-counts it and highlights a chapter ahead of the real one on every file
    // past the first, which is what made chapters feel untrustworthy.
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
    const listScrollYRef = useRef(0);
    const listDragStartYRef = useRef<number | null>(null);
    const listDragStartedAtTopRef = useRef(false);
    const handleListScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        listScrollYRef.current = Math.max(0, event.nativeEvent.contentOffset.y);
    }, []);
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
            event.nativeEvent.pageY - startY > QUEUE_CLOSE_DISTANCE
        ) {
            onClose();
        }
    }, [onClose]);
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
                        onPress={() =>
                            onChapterSeek?.(
                                getPlayerPositionMsForAbsProgress(
                                    chapter.startSeconds,
                                    { progressOffsetSeconds },
                                ),
                            )
                        }
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
                            artworkImageId={row.item.artworkImageId}
                            contentSource={getContentSourceFromPlaybackItem(
                                row.item,
                                serverConnections,
                            )}
                            fallbackStyle={styles.queueRowThumbFallback}
                            letter={(row.item.title ?? '?').slice(0, 1).toUpperCase()}
                            serverConnections={serverConnections}
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
                        onTouchEnd={handleListTouchEnd}
                        onTouchStart={handleListTouchStart}
                        renderItem={renderItem}
                        scrollEventThrottle={16}
                        showsVerticalScrollIndicator={false}
                        style={styles.queueSheetScroll}
                    />
                </Reanimated.View>
            </Reanimated.View>
        </>
    );
});
