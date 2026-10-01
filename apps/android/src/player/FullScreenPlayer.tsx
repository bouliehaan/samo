import { type MobilePlayableAudio, type MobileHomeItem, LONG_FORM_RELATIVE_SKIP_SECONDS } from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';
import { type ComponentProps, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, type LayoutRectangle, Pressable, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
    interpolate,
    runOnJS,
    type SharedValue,
    useAnimatedReaction,
    useAnimatedStyle,
} from 'react-native-reanimated';

import { ArtworkImage } from '../components/ArtworkImage';
import { ArtworkZoomModal } from '../components/ArtworkZoomModal';
import {
    CastGlyph,
    DownCaretGlyph,
    EllipsisVerticalGlyph,
    PlayPauseGlyph,
    RepeatGlyph,
    ShuffleGlyph,
    SleepTimerGlyph,
    TrackSkipGlyph,
} from '../components/Glyphs';
import { QualityBadgeRow } from '../components/QualityBadge';
import { SegmentedSeekBar } from '../components/SegmentedSeekBar';
import { useMediaContextMenu } from '../contexts/media-context-menu';
import { type AndroidCastState } from '../services/audio-playback';
import {
    previousSamoChannelProgramme,
    samoChannelIdForPlayback,
    skipSamoChannelProgramme,
} from '../services/samo-channel';
import {
    loadArtistHomeItemById,
    loadArtistHomeItemByName,
} from '../services/catalog/catalog-reads';
import { useAndroidPlaybackPositionMs } from '../state/playback-store';
import { useSamoChannelSelector } from '../state/samo-channel';
import { getPlayerPositionMsForPlaybackProgress } from '../utils/playback-progress-math';
import { type AndroidPlaybackState } from '../types/playback';
import {
    formatPlaybackTime,
    getDurationLabel,
    getPlayableDisplayMetadata,
    getPlaybackDisplayMetadata,
    getPlaybackDurationMs,
    getDisplayPositionMs,
    isLivePlayback,
} from '../utils/playback-time';
import { triggerImpact } from '../services/haptics';
import {
    FULL_PLAYER_PLAY_GLYPH_SIZE,
    OPEN_SPRING,
    REDUCED_MOTION_SPRING,
    SCREEN_HEIGHT,
} from '../theme/layout';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { usePlaybackBusy } from '../hooks/use-playback-busy';
import { peekArtworkLocalUri } from '../services/artwork-cache';
import { resolveSamoItemArtworkSourceForDisplay } from '../utils/samo-artwork-url';
import { getPlayerArtworkMode, savePlayerArtworkMode } from '../services/player-preferences';
import { FrostedBackdrop } from './FrostedBackdrop';
import { PlayerArtwork } from './PlayerArtwork';
import { openPlaybackContextMenu } from './playback-context-item';
import { PlayerIconButton } from './PlayerIconButton';
import { getPlayerQualityItems, getPlayerQualityPill } from './quality-pill';
import {
    PLAYER_CLOSE_SPRING,
    PLAYER_OPEN_SPRING,
    shellTopRadius,
} from './player-motion';
import { QueueSheetOverlay } from './QueueSheetOverlay';
import { SleepTimerSheet } from './SleepTimerSheet';
import { usePlayerShellGestures } from './use-player-shell-gestures';
import { useSleepTimer } from './use-sleep-timer';

const CAST_ICON_ACTIVE_TINT = 'rgba(207, 216, 227, 0.85)';
const CAST_ICON_INACTIVE_TINT = 'rgba(245, 245, 245, 0.72)';

/** Overflow below this is measurement noise, not a title that needs scrolling. */
const MARQUEE_MIN_OVERFLOW = 1;
/** Pixels of empty space between the two copies in the banner loop. */
const MARQUEE_GAP = 64;
/**
 * Travel speed. This is the number that decides whether the ticker reads or
 * just moves: past roughly 35px/s the eye has to chase the line instead of
 * reading it, and the old 50px/s sat well over that.
 */
const MARQUEE_PIXELS_PER_SECOND = 28;
/** Beat of stillness at the top of every cycle, so the start of the title is
 *  legible before anything moves. */
const MARQUEE_DWELL_MS = 1600;

/**
 * Marquee (ticker) for single-line player text (title + subtitle lines) that
 * may overflow the player width; static when the text fits.
 *
 * Banner-style: two copies of the text scroll continuously in one direction
 * with a spacer gap between them. When the first copy exits the left edge, the
 * second copy is exactly where the first started — seamless infinite loop,
 * matching Spotify / Apple Music tickers.
 *
 * Identity is the text: mount one per string (see the `key` at both call
 * sites) and a new track gets a ticker that starts from the beginning.
 */
const PlayerMarqueeText = memo(({
    children,
    style,
}: {
    children: string;
    style?: object | object[];
}) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const containerWidth = useRef(0);
    const textWidth = useRef(0);
    // One full banner cycle in px, or 0 when the text fits and renders static.
    const [loopDistance, setLoopDistance] = useState(0);

    const measure = useCallback(() => {
        const overflow = textWidth.current - containerWidth.current;
        // A sub-pixel difference is not an overflow; scrolling one would just
        // twitch. Also covers the pass where only one of the two onLayouts has
        // reported and the other width is still 0.
        const next =
            containerWidth.current > 0 && overflow > MARQUEE_MIN_OVERFLOW
                ? textWidth.current + MARQUEE_GAP
                : 0;
        // Bail out when the measurement is unchanged, or the ticker stutters:
        // `onLayout` fires several times over a player's life (mount, the
        // second copy landing, the shell's open transition) and every state
        // change here tears the running loop down and rebuilds it.
        setLoopDistance((prev) => (prev === next ? prev : next));
    }, []);

    // This effect OWNS the animation. It is the only thing that starts one and
    // its cleanup is the only thing that stops one.
    //
    // Stopping from measure() instead is what stranded the ticker for good:
    // measure() killed the loop on every layout event, but the restart was
    // gated behind a *change* of state, so a second overflowing title — same
    // overflow verdict, same state, no re-render — parked the text at zero and
    // never started it again. Only a track whose title FIT, clearing the flag,
    // could revive it. Keeping start and stop in one place makes that
    // unrepresentable.
    //
    // The start also has to land after the second copy has mounted: the native
    // driver bakes the animation graph at `.start()` time and does not pick up
    // views that mount later. Reading `loopDistance` from state (not a ref)
    // gives that for free — the value that mounts the copy is the value that
    // starts the loop, one commit later.
    useEffect(() => {
        if (loopDistance <= 0) {
            return;
        }
        const anim = Animated.loop(
            Animated.sequence([
                Animated.delay(MARQUEE_DWELL_MS),
                Animated.timing(translateX, {
                    duration: (loopDistance / MARQUEE_PIXELS_PER_SECOND) * 1000,
                    easing: Easing.linear,
                    toValue: -loopDistance,
                    useNativeDriver: true,
                }),
                // Reset instantly (0ms) — the second copy is now pixel-aligned
                // with the original start, so the jump is invisible.
                Animated.timing(translateX, {
                    duration: 0,
                    toValue: 0,
                    useNativeDriver: true,
                }),
            ]),
        );
        anim.start();
        return () => {
            anim.stop();
            // Park. Without this a title that stops needing to scroll keeps the
            // offset it died at and sits half off the edge of the screen.
            translateX.setValue(0);
        };
    }, [loopDistance, translateX]);

    return (
        <View
            onLayout={(e) => {
                containerWidth.current = e.nativeEvent.layout.width;
                measure();
            }}
            style={styles.fullPlayerMarqueeContainer}
        >
            {/* The text is measured inside a track far wider than the player,
                NOT inside the clipping container — see fullPlayerMarqueeTrack.
                `numberOfLines` is only a wrap guard here: against the track's
                width there is nothing to ellipsize, it just pins one line. */}
            <View style={styles.fullPlayerMarqueeTrack}>
                <Animated.Text
                    numberOfLines={1}
                    onLayout={(e) => {
                        textWidth.current = e.nativeEvent.layout.width;
                        measure();
                    }}
                    style={[style, styles.fullPlayerMarqueeText, { transform: [{ translateX }] }]}
                >
                    {children}
                </Animated.Text>
                {/* Second copy for the banner loop — sits to the right of the
                    first with a gap, so when the first scrolls off-screen the
                    second is seamlessly in position. Hidden when text fits. */}
                {loopDistance > 0 ? (
                    <Animated.Text
                        numberOfLines={1}
                        style={[
                            style,
                            styles.fullPlayerMarqueeText,
                            { marginLeft: MARQUEE_GAP, transform: [{ translateX }] },
                        ]}
                    >
                        {children}
                    </Animated.Text>
                ) : null}
            </View>
        </View>
    );
});

PlayerMarqueeText.displayName = 'PlayerMarqueeText';

/**
 * The seek bar and its time row — the only part of the player that has to
 * redraw as the playhead moves, and therefore the only part that subscribes to
 * it.
 *
 * The playhead used to arrive as a prop on FullScreenPlayer, which meant the
 * native engine's 1Hz tick re-rendered this entire 900-line component — every
 * control, the artwork, the marquee, the queue sheet — once a second for the
 * whole duration of a track, to move one bar and re-stamp one label. Everything
 * else up there renders from state that changes when the TRACK changes.
 *
 * Subscribing here instead confines the per-second work to these two leaves.
 * Note how little it actually feeds: `formatPlaybackTime` for the elapsed
 * label, and a baseline for the bar — which interpolates itself on the UI
 * thread between ticks and only needs the number to correct its drift. That
 * was already true before; the cost was simply being paid at the wrong level
 * of the tree.
 */
const PlayerProgressBlock = memo(({
    activeItem,
    durationLabel,
    durationMs,
    externalGestures,
    isLive,
    isPlaying,
    onSeek,
    segments,
    sessionKey,
}: {
    activeItem: MobilePlayableAudio | null;
    durationLabel: string;
    durationMs?: number;
    externalGestures?: ComponentProps<typeof SegmentedSeekBar>['externalGestures'];
    isLive: boolean;
    isPlaying: boolean;
    onSeek: (positionMs: number) => void;
    segments?: ComponentProps<typeof SegmentedSeekBar>['segments'];
    sessionKey?: string;
}) => {
    const filePositionMs = useAndroidPlaybackPositionMs();
    // Audiobook file positions are per-file; the bar, the label and the chapter
    // markers are all book-absolute. Same fold the parent used to do.
    const positionMs = activeItem
        ? getDisplayPositionMs(activeItem, filePositionMs)
        : filePositionMs;

    return (
        <View style={styles.fullPlayerProgress}>
            <SegmentedSeekBar
                durationMs={durationMs}
                externalGestures={externalGestures}
                isLive={isLive}
                isPlaying={isPlaying}
                onSeek={onSeek}
                positionMs={positionMs}
                segments={segments}
                sessionKey={sessionKey}
                tint="#ffffff"
            />
            <View style={styles.fullPlayerTimeRow}>
                <Text style={styles.fullPlayerTime}>
                    {isLive ? '' : formatPlaybackTime(positionMs)}
                </Text>
                <Text style={[styles.fullPlayerTime, styles.fullPlayerTimeRight]}>
                    {durationLabel}
                </Text>
            </View>
        </View>
    );
});

PlayerProgressBlock.displayName = 'PlayerProgressBlock';

export const FullScreenPlayer = memo(({
    artworkImageId,
    artworkUrl,
    contentSource,
    castState,
    isShuffled,
    lastPlayedItem,
    onCancelGesture,
    onClose,
    onCycleRepeatMode,
    onGoToArtist,
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
    repeatMode,
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
    onCancelGesture: () => void;
    onClose: () => void;
    onCycleRepeatMode: () => void;
    /** Called when the user taps the artist avatar — closes player + navigates
     *  to artist page. `resolvedArtistId` carries the mirror-resolved id when
     *  the playable itself has none (name-fallback lookups). */
    onGoToArtist?: (item: MobilePlayableAudio, resolvedArtistId?: string) => void;
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
    repeatMode: 'all' | 'off' | 'one';
    serverConnection: ServerAuthenticationResult | null;
    visible: boolean;
}) => {
    const [artworkMode, setArtworkMode] = useState(getPlayerArtworkMode);
    const [artworkFrame, setArtworkFrame] = useState<LayoutRectangle>({ x: 0, y: 0, width: 0, height: 0 });
    const toggleArtworkMode = useCallback(() => {
        const next = getPlayerArtworkMode() === 'framed' ? 'immersive' : 'framed';
        savePlayerArtworkMode(next);
        setArtworkMode(next);
        triggerImpact('light');
    }, []);
    const [sleepMenuVisible, setSleepMenuVisible] = useState(false);
    const [isArtworkZoomOpen, setIsArtworkZoomOpen] = useState(false);
    // Collapsed shell is invisible but was still above the tab bar (zIndex 10000).
    // Gate hits so the navbar stays tappable at rest; enable once expansion starts.
    const [isShellInteractive, setIsShellInteractive] = useState(false);
    const contextMenu = useMediaContextMenu();
    const sleepTimer = useSleepTimer(onTogglePlayback);
    const activeItem = playbackState.status !== 'idle' ? playbackState.item : null;
    const displayItem: MobilePlayableAudio | null = activeItem ?? lastPlayedItem;
    const canSkipPlayback = Boolean(displayItem && displayItem.source !== 'radio');
    // A samo channel is the one radio source with programming of its own, so it
    // is the one where PREV and NEXT still mean something. They are not local
    // moves: there is one encoder and every listener is on the same second, so
    // these ask the STATION to move on and everybody tuned in hears it. An
    // internet station is somebody else's stream with nothing to skip to, and
    // keeps the bare play/pause it has always had.
    const isSamoChannel = samoChannelIdForPlayback(displayItem) !== null;
    // Held above the early return, as every hook here must be.
    const channelCommand = useSamoChannelSelector((state) => state.command);
    const channelNotice = useSamoChannelSelector((state) => state.notice);

    // Collapsed quality pill toggle state — flip between quality-spec and bitrate/path view.
    const [qualityPillFlipped, setQualityPillFlipped] = useState(false);

    // Artist avatar — loaded from the local catalog mirror by artistId.
    const [artistItem, setArtistItem] = useState<MobileHomeItem | null>(null);
    const artistFetchRef = useRef<string | null>(null);

    // The URI the backdrop extracts its tint from — resolved the same way
    // ArtworkImage resolves the cover (imageId → tokened URL), then swapped
    // for the prefetched LOCAL file when the cache has it, so extraction is
    // instant, offline-safe, and never trips a 401.
    const paletteArtworkUrl = useMemo(() => {
        const resolved = resolveSamoItemArtworkSourceForDisplay(
            { artworkImageId, artworkUrl, source: contentSource },
            serverConnection,
        );
        const remoteUri = (typeof resolved === 'string' ? resolved : resolved?.uri) ?? artworkUrl;
        if (!remoteUri) {
            return undefined;
        }
        return peekArtworkLocalUri(remoteUri) ?? remoteUri;
    }, [artworkImageId, artworkUrl, contentSource, serverConnection]);

    useEffect(() => {
        setIsArtworkZoomOpen(false);
        // Reset pill state on track change.
        setQualityPillFlipped(false);
    }, [artworkUrl]);

    // Fetch artist info from the local catalog mirror whenever the playing
    // track changes. Prefers the track's artistId; items without one (queues
    // restored from the native persisted queue, pre-fix mirror rows) fall back
    // to a name lookup. Null on miss — the header shows the down-caret.
    useEffect(() => {
        const artistId = displayItem?.artistId;
        const artistName = displayItem?.artist;
        const sourceId = displayItem?.contentSourceId;
        if (!sourceId || (!artistId && !artistName) || displayItem?.source !== 'music') {
            setArtistItem(null);
            return;
        }
        const fetchKey = `${sourceId}:${artistId ?? `name:${artistName}`}`;
        if (artistFetchRef.current === fetchKey) return;
        artistFetchRef.current = fetchKey;
        const lookup = artistId
            ? loadArtistHomeItemById(sourceId, artistId).then(
                  (item) => item ?? (artistName ? loadArtistHomeItemByName(sourceId, artistName) : null),
              )
            : loadArtistHomeItemByName(sourceId, artistName!);
        void lookup.then((item) => {
            // Guard against stale responses if the track changed during the await.
            if (artistFetchRef.current === fetchKey) {
                setArtistItem(item);
            }
        });
    }, [
        displayItem?.artist,
        displayItem?.artistId,
        displayItem?.contentSourceId,
        displayItem?.source,
    ]);

    const openSpring = reducedMotion ? REDUCED_MOTION_SPRING : PLAYER_OPEN_SPRING;
    const closeSpring = reducedMotion ? REDUCED_MOTION_SPRING : PLAYER_CLOSE_SPRING;
    const settleSpring = reducedMotion ? REDUCED_MOTION_SPRING : OPEN_SPRING;
    const dismissPlayer = useCallback(() => {
        onClose();
    }, [onClose]);

    const openFullscreenContextMenu = useCallback(() => {
        openPlaybackContextMenu(
            contextMenu.openForItem,
            playbackState.status !== 'idle' ? playbackState.item : lastPlayedItem,
            serverConnection,
        );
    }, [contextMenu, lastPlayedItem, playbackState, serverConnection]);

    const {
        closeQueue,
        isQueueInteractive,
        openQueue,
        playerGesture,
        queueBackdropStyle,
        queueProgress,
        queueSheetStyle,
        seekExternalGestures,
    } = usePlayerShellGestures({
        canSkipPlayback,
        closeSpring,
        onCancelGesture,
        onClose,
        onNext,
        onPrevious,
        openSpring,
        playerProgress,
        reducedMotion,
        settleSpring,
        visible,
    });

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

    // Spinner on the primary control while the stream resolves, matching the mini
    // player. A live/radio or freshly-warmed podcast start strobes buffering↔
    // playing for a beat, so the busy decision is debounced through that flicker
    // (see usePlaybackBusy) rather than read straight off the raw status.
    const isBusy = usePlaybackBusy(playbackState.status);
    const isPlaying = playbackState.status === 'playing';
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
    const display = activeItem
        ? getPlaybackDisplayMetadata(playbackState)
        : getPlayableDisplayMetadata(
              displayItem,
              (displayItem.initialPositionSeconds ?? 0) * 1000,
          );
    const displayTitle = display.lines[0] || display.title || displayItem.title || 'Unknown title';
    const isMusicSource = displayItem.source === 'music';
    // What the engine is really decoding, when it has got far enough to know.
    // Undefined while idle (`displayItem` is then the last-played item, whose
    // stream is long closed) and during pre-roll.
    const decodedFormat =
        playbackState.status !== 'idle' ? playbackState.decodedFormat : undefined;
    // Plain derivation, NOT useMemo: it sits below the `!displayItem` early
    // return (a rules-of-hooks violation), and the items are a fresh array
    // every render so memoizing on them could never hit anyway.
    const collapsedPill = getPlayerQualityPill(getPlayerQualityItems(displayItem, decodedFormat));

    const isLongFormSource =
        displayItem.source === 'audiobook' || displayItem.source === 'podcast';
    const showShuffleControl = !isLongFormSource && displayItem.source !== 'radio';
    const showSkipControls = displayItem.source !== 'radio' || isSamoChannel;
    const showLongFormSkip = Boolean(onSkipBySeconds) && isLongFormSource;
    // Music parks Sleep in the bottom bar (like long-form) so the main
    // controls read shuffle | prev | play | next | repeat.
    const showSleepInBottomBar = isLongFormSource || isMusicSource;
    const showCastInMainControls = displayItem.source === 'radio';
    // On a channel these go to the STATION rather than to the queue transport,
    // which knows nothing about programming and has no queue here to step.
    const handlePrevious = isSamoChannel
        ? () => {
              triggerImpact('light');
              void previousSamoChannelProgramme();
          }
        : onPrevious;
    const handleNext = isSamoChannel
        ? () => {
              triggerImpact('light');
              void skipSamoChannelProgramme();
          }
        : onNext;
    // "Not this kind of thing" behind a hold rather than a fourth button: it is
    // the rarer of the two skips, and the transport row is already the widest
    // thing on this screen. Same action, same words, as the one in the Radio
    // tab's own overflow.
    const handleSkipKind = isSamoChannel
        ? () => {
              triggerImpact('medium');
              void skipSamoChannelProgramme('kind');
          }
        : undefined;
    // One line for both halves of a station request: what it is doing, then
    // why it did not work. Both belong under the buttons that asked.
    const channelStatusLine = isSamoChannel
        ? (channelNotice ??
          (channelCommand
              ? channelCommand === 'previous'
                  ? 'Going back…'
                  : channelCommand === 'kind'
                    ? 'Finding something else…'
                    : 'Skipping…'
              : null))
        : null;
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
                sleepTimer.secondsLeft !== null ? sleepTimer.cancel() : setSleepMenuVisible(true)
            }
            style={styles.fullPlayerBottomBarButton}
        >
            <SleepTimerGlyph
                active={sleepTimer.secondsLeft !== null}
                color={sleepTimer.secondsLeft !== null ? colors.accent : colors.text}
            />
        </Pressable>
    );
    // CHAPTER-GRANULAR, not per-second: `playbackState` is the chrome snapshot,
    // whose position only turns over when the active chapter does. The one
    // consumer left down here is the queue sheet's chapter highlight, which is
    // exactly that granularity — it has no second hand to move. Anything that
    // draws a moving playhead subscribes in PlayerProgressBlock instead.
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
                getPlayerPositionMsForPlaybackProgress(
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
            pointerEvents={visible || isShellInteractive ? 'auto' : 'none'}
            style={[
                styles.fullPlayer,
                playerAnimatedStyle,
            ]}
        >
            <FrostedBackdrop artworkUrl={paletteArtworkUrl} reducedMotion={reducedMotion} />
            <PlayerArtwork
                artworkImageId={artworkImageId}
                contentSource={contentSource}
                fallbackStyle={styles.fullPlayerArtworkFallback}
                frame={artworkFrame}
                immersive={artworkMode === 'immersive' && Boolean(artworkUrl || artworkImageId)}
                letter={displayTitle.slice(0, 1)}
                reducedMotion={reducedMotion}
                serverConnection={serverConnection}
                transition={reducedMotion ? 0 : 280}
                uri={artworkUrl}
            />

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
                <Text style={styles.fullPlayerHeaderLabel}>NOW PLAYING</Text>
                {isMusicSource && (displayItem.artistId || artistItem) ? (
                    // Artist avatar — tappable to navigate to artist page.
                    <Pressable
                        accessibilityLabel={
                            onGoToArtist && (displayItem.artistId || artistItem?.id)
                                ? `Go to ${displayItem.artist ?? 'artist'} page`
                                : 'Close player'
                        }
                        accessibilityRole="button"
                        onPress={() => {
                            if (onGoToArtist && (displayItem.artistId || artistItem?.id)) {
                                onGoToArtist(displayItem, artistItem?.id);
                            } else {
                                dismissPlayer();
                            }
                        }}
                        style={styles.fullPlayerArtistAvatarButton}
                    >
                        {artistItem ? (
                            <ArtworkImage
                                artworkImageId={artistItem.artworkImageId}
                                contentSource={artistItem.source}
                                fallbackStyle={styles.fullPlayerArtistAvatarFallback}
                                letter={(displayItem.artist ?? '?').slice(0, 1)}
                                serverConnection={serverConnection}
                                style={styles.fullPlayerArtistAvatar}
                                uri={artistItem.artworkUrl}
                            />
                        ) : (
                            // Fallback while loading or no artwork — show initial.
                            <View style={styles.fullPlayerArtistAvatarFallback}>
                                <Text style={styles.fullPlayerArtistAvatarLetter}>
                                    {(displayItem.artist ?? '?').slice(0, 1).toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </Pressable>
                ) : null}
                <Pressable
                    accessibilityLabel="More options"
                    accessibilityRole="button"
                    onPress={() => openFullscreenContextMenu()}
                    style={styles.fullPlayerHeaderButton}
                >
                    <EllipsisVerticalGlyph color={colors.text} />
                </Pressable>
            </View>

            <Pressable
                accessibilityHint="Tap to switch artwork style. Press and hold to view the artwork."
                accessibilityLabel={artworkMode === 'framed' ? 'Use immersive artwork' : 'Use framed artwork'}
                accessibilityRole="button"
                disabled={!artworkUrl && !artworkImageId}
                onLayout={({ nativeEvent: { layout } }) => setArtworkFrame((previous) =>
                    previous.x === layout.x && previous.y === layout.y &&
                    previous.width === layout.width && previous.height === layout.height
                        ? previous : layout
                )}
                onLongPress={() => setIsArtworkZoomOpen(true)}
                onPress={toggleArtworkMode}
                style={styles.fullPlayerArtworkWrap}
            />

            {/* Bottom stack — revealed by the growing shell clip, fixed layout. */}
            <View
                style={[
                    styles.fullPlayerBottom,
                    !isMusicSource && styles.fullPlayerBottomLifted,
                ]}
            >
                <View style={styles.fullPlayerMetadata}>
                    {/* ONE line + marquee, the industry pattern (Spotify/Apple
                        Music): the old 2-row wrap crowded the metadata block,
                        and a title too long for even two rows was silently
                        unreadable. The ticker only runs when the text
                        overflows, so short titles render static.

                        Keyed by the text, like the subtitle lines below, so a
                        new track restarts the ticker from the beginning of the
                        title. Layout alone cannot carry that: two titles can
                        measure the SAME width, no layout event fires, and the
                        incoming track picks up the outgoing one's scroll
                        position mid-travel. */}
                    <PlayerMarqueeText key={displayTitle} style={styles.fullPlayerTitle}>
                        {displayTitle}
                    </PlayerMarqueeText>
                    {display.lines.slice(1).map((line, index) => (
                        <PlayerMarqueeText key={`${line}-${index}`} style={styles.fullPlayerSubtitle}>
                            {line}
                        </PlayerMarqueeText>
                    ))}
                    {collapsedPill ? (
                        <Pressable
                            accessibilityLabel={
                                qualityPillFlipped
                                    ? 'Show quality format'
                                    : 'Show bitrate and stream path'
                            }
                            accessibilityRole="button"
                            onPress={() => {
                                if (!collapsedPill.canToggle) return;
                                triggerImpact('light');
                                setQualityPillFlipped((v) => !v);
                            }}
                            style={[
                                styles.fullPlayerCollapsedPill,
                                collapsedPill.tone === 'direct' &&
                                    styles.fullPlayerCollapsedPillDirect,
                                collapsedPill.tone === 'transcoded' &&
                                    styles.fullPlayerCollapsedPillTranscoded,
                                collapsedPill.canToggle &&
                                    styles.fullPlayerCollapsedPillTappable,
                            ]}
                        >
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.fullPlayerCollapsedPillText,
                                    collapsedPill.tone === 'direct' &&
                                        styles.fullPlayerCollapsedPillTextDirect,
                                ]}
                            >
                                {qualityPillFlipped && collapsedPill.canToggle
                                    ? collapsedPill.labelB
                                    : collapsedPill.labelA}
                            </Text>

                        </Pressable>
                    ) : null}
                </View>

                <PlayerProgressBlock
                    activeItem={activeItem}
                    durationLabel={
                        activeItem
                            ? getDurationLabel(playbackState)
                            : displayItem.source === 'radio'
                              ? 'RADIO'
                              : formatPlaybackTime(durationMs)
                    }
                    durationMs={durationMs}
                    externalGestures={seekExternalGestures}
                    isLive={isLive}
                    isPlaying={playbackState.status === 'playing'}
                    onSeek={handleTimelineSeek}
                    segments={timelineSegments}
                    sessionKey={
                        activeItem && playbackState.status !== 'idle'
                            ? `${playbackState.sessionId}:${activeItem.id}`
                            : undefined
                    }
                />

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
                            <PlayerIconButton
                                accessibilityLabel={
                                    isSamoChannel ? 'Back to the previous programme' : 'Previous'
                                }
                                onPress={handlePrevious}
                            >
                                <TrackSkipGlyph color={colors.text} direction={-1} size={28} />
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
                            accessibilityLabel={isBusy ? 'Loading' : isPlaying ? 'Pause' : 'Play'}
                            onPress={onTogglePlayback}
                            primary
                            tint="#ffffff"
                        >
                            {isBusy ? (
                                <ActivityIndicator color="#101114" size="small" />
                            ) : (
                                <PlayPauseGlyph
                                    color="#101114"
                                    isPlaying={isPlaying}
                                    size={FULL_PLAYER_PLAY_GLYPH_SIZE}
                                />
                            )}
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
                            <PlayerIconButton
                                accessibilityHint={
                                    isSamoChannel
                                        ? 'Press and hold to skip this kind of thing'
                                        : undefined
                                }
                                accessibilityLabel={
                                    isSamoChannel ? 'Skip what the station is playing' : 'Next'
                                }
                                onLongPress={handleSkipKind}
                                onPress={handleNext}
                            >
                                <TrackSkipGlyph color={colors.text} direction={1} size={28} />
                            </PlayerIconButton>
                        ) : (
                            <View style={styles.playerControlButtonSpacer} />
                        )}
                        {isMusicSource ? (
                            <PlayerIconButton
                                accessibilityLabel={
                                    repeatMode === 'off'
                                        ? 'Repeat off. Tap to repeat all.'
                                        : repeatMode === 'all'
                                          ? 'Repeat all. Tap to repeat one.'
                                          : 'Repeat one. Tap to turn off.'
                                }
                                onPress={onCycleRepeatMode}
                            >
                                <RepeatGlyph color={colors.text} mode={repeatMode} />
                            </PlayerIconButton>
                        ) : !showSleepInBottomBar ? (
                            <PlayerIconButton
                                accessibilityLabel="Sleep Timer"
                                onPress={() =>
                                    sleepTimer.secondsLeft !== null
                                        ? sleepTimer.cancel()
                                        : setSleepMenuVisible(true)
                                }
                            >
                                <SleepTimerGlyph
                                    active={sleepTimer.secondsLeft !== null}
                                    color={
                                        sleepTimer.secondsLeft !== null
                                            ? colors.accent
                                            : colors.text
                                    }
                                />
                            </PlayerIconButton>
                        ) : null}
                    </View>
                </View>

                {channelStatusLine ? (
                    <Text style={styles.fullPlayerChannelNotice}>{channelStatusLine}</Text>
                ) : null}

                {sleepTimer.secondsLeft !== null && sleepTimer.secondsLeft !== -1 && (
                    <Text style={styles.fullPlayerSleepLabel}>
                        Sleeping in {Math.floor(sleepTimer.secondsLeft / 60)}:
                        {String(sleepTimer.secondsLeft % 60).padStart(2, '0')}
                    </Text>
                )}

                {(!showCastInMainControls || castState.isConnected || showSleepInBottomBar) ? (
                    <View style={styles.fullPlayerBottomBar}>
                        {!showCastInMainControls ? castButton : null}
                        <Pressable
                            accessibilityLabel={displayItem.source === 'audiobook' ? 'Open chapters' : 'Open Up Next queue'}
                            accessibilityRole="button"
                            onPress={openQueue}
                            style={styles.fullPlayerQueueButton}
                        >
                            <View style={styles.fullPlayerDragPill} />
                            <Text style={styles.fullPlayerQueueLabel}>
                                {displayItem.source === 'audiobook' ? 'Chapters' : 'Up next'}
                            </Text>
                            {castState.isConnected ? (
                                <Text numberOfLines={1} style={styles.fullPlayerCastStatus}>
                                    Casting to {castState.deviceName ?? 'Chromecast'}
                                </Text>
                            ) : null}
                        </Pressable>
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
            queueProgress={queueProgress}
            serverConnection={serverConnection}
            settleSpring={settleSpring}
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

        <SleepTimerSheet
            onClose={() => setSleepMenuVisible(false)}
            onSelect={sleepTimer.start}
            secondsLeft={sleepTimer.secondsLeft}
            visible={sleepMenuVisible}
        />

        {/* Universal MediaContextMenu (rendered at App root) handles the "..." menu. */}
        </>
    );
});

