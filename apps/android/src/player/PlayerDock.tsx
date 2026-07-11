import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { type SharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { ErrorBoundary } from '../components/ErrorBoundary';
import { useReducedMotionPreference } from '../hooks/use-reduced-motion-preference';
import {
    setIsFullPlayerOpen,
    useAppNavigationSelector,
} from '../state/app-navigation';
import { useAppSessionSelector } from '../state/app-session';
import { useAuthSessionSelector } from '../state/auth-session';
import { getPlaybackBridge } from '../state/playback-bridge';
import { getPlaybackQueue, usePlaybackQueue } from '../state/playback-queue-store';
import {
    selectActiveAndroidPlaybackItem,
    useAndroidPlaybackState,
} from '../state/playback-store';
import { REDUCED_MOTION_SPRING } from '../theme/layout';
import { styles } from '../theme/styles';
import { getContentSourceFromPlaybackItem } from '../utils/content-source';
import {
    artworkSourceUri,
    prefetchArtworkSource,
    resolvePlaybackArtworkSourceForDisplay,
} from '../utils/samo-artwork-url';
import { PLAYER_CLOSE_SPRING, PLAYER_OPEN_SPRING } from './player-motion';
import {
    ConnectedFullScreenPlayer,
    ConnectedMiniPlayer,
    OutputPickerModal,
} from './PlayerSurface';

// Transport actions only touch the playback bridge — module fns, stable forever.
const handlePlayerNext = () => void getPlaybackBridge().navigatePlayback(1);
const handlePlayerPrevious = () => void getPlaybackBridge().navigatePlayback(-1);
const handlePlayerSeek = (positionMs: number) => void getPlaybackBridge().seekPlayback(positionMs);
const handlePlayerSkipBySeconds = (offsetSeconds: number) =>
    void getPlaybackBridge().skipPlayback(offsetSeconds);
const handleTogglePlayback = () => void getPlaybackBridge().togglePlayback();
const handleToggleShuffle = () => getPlaybackBridge().toggleShuffle();
const handleCycleRepeatMode = () => getPlaybackBridge().cycleRepeatMode();
const handlePlayerPlayQueueIndex = (index: number) => {
    const currentQueue = getPlaybackQueue();
    if (!currentQueue) {
        return;
    }
    const item = currentQueue.items[index];
    if (!item) {
        return;
    }
    void (async () => {
        // Same native queue step the lock screen uses; full JS restart
        // only as fallback.
        const bridge = getPlaybackBridge();
        if (await bridge.playQueueIndexNatively(index)) {
            return;
        }
        await bridge.playQueuedItem(item, currentQueue.items, index);
    })();
};

/**
 * The player chrome: mini player, fullscreen player, and the output picker.
 * Subscribes to the session/queue/navigation slices the players render from,
 * so a queue change or shuffle toggle re-renders this dock — not App.
 */
export const PlayerDock = memo(function PlayerDock({
    playerProgress,
}: {
    playerProgress: SharedValue<number>;
}) {
    const reducedMotion = useReducedMotionPreference();
    const castState = useAppSessionSelector((state) => state.castState);
    const isShuffled = useAppSessionSelector((state) => state.isShuffled);
    const repeatMode = useAppSessionSelector((state) => state.repeatMode);
    const lastPlayedItem = useAppSessionSelector((state) => state.lastPlayedItem);
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    const isFullPlayerOpen = useAppNavigationSelector((state) => state.isFullPlayerOpen);
    const mediaDetailStatus = useAppNavigationSelector(
        (state) => state.mediaDetailState.status,
    );
    const activePlaybackItem = useAndroidPlaybackState(selectActiveAndroidPlaybackItem);
    const queue = usePlaybackQueue();
    const [outputPickerVisible, setOutputPickerVisible] = useState(false);

    useEffect(() => {
        const openSpring = reducedMotion ? REDUCED_MOTION_SPRING : PLAYER_OPEN_SPRING;
        const closeSpring = reducedMotion ? REDUCED_MOTION_SPRING : PLAYER_CLOSE_SPRING;
        if (isFullPlayerOpen) {
            playerProgress.value = withSpring(1, openSpring);
            return;
        }
        // Gesture dismiss already animates playerProgress to 0 and calls onClose
        // from the spring onFinish callback — avoid restarting the close motion.
        if (playerProgress.value > 0.001) {
            playerProgress.value = reducedMotion
                ? withTiming(0, { duration: 0 })
                : withSpring(0, closeSpring);
        }
    }, [isFullPlayerOpen, playerProgress, reducedMotion]);

    useEffect(() => {
        // Close fullscreen only on the navigation EDGE — when the detail starts
        // loading. Watching just the status (not isFullPlayerOpen) means this
        // doesn't fire when the user opens the fullscreen player on a page
        // that's already showing a loaded detail. That was the bug: tapping
        // the MiniPlayer on an album/artist/playlist page set isFullPlayerOpen
        // true → this effect ran → and immediately set it false.
        if (mediaDetailStatus === 'loading') {
            setIsFullPlayerOpen(false);
        }
    }, [mediaDetailStatus]);

    // Single canonical URL for the currently-playing track's artwork. The
    // MiniPlayer, FullScreenPlayer, and album-essence color extractor all
    // share this exact string so they share a single expo-image cache entry.
    // One URL → one image → one load → never a quality mismatch.
    const playbackItem = activePlaybackItem ?? lastPlayedItem;
    const playbackArtworkSource = useMemo(
        () => resolvePlaybackArtworkSourceForDisplay(playbackItem, serverConnection),
        [playbackItem, serverConnection],
    );
    const currentHighResArtworkUrl = useMemo(
        () => artworkSourceUri(playbackArtworkSource),
        [playbackArtworkSource],
    );
    // Prefetch into both memory + disk so even fast taps after track start
    // hit cache. expo-image dedupes in-flight requests with the same URL,
    // so this races safely against the miniplayer's component-level load.
    useEffect(() => {
        prefetchArtworkSource(playbackArtworkSource);
    }, [playbackArtworkSource]);

    const playbackContentSource = useMemo(
        () =>
            playbackItem
                ? getContentSourceFromPlaybackItem(playbackItem, serverConnection)
                : undefined,
        [playbackItem, serverConnection],
    );

    const handleOpenFullPlayer = useCallback(() => {
        // Kick the expand spring on the UI thread NOW so the card starts
        // moving on the next frame instead of waiting for the re-render the
        // state flip schedules. The open effect above re-targets the same
        // spring once `isFullPlayerOpen` commits, which is a no-op.
        playerProgress.value = withSpring(
            1,
            reducedMotion ? REDUCED_MOTION_SPRING : PLAYER_OPEN_SPRING,
        );
        setIsFullPlayerOpen(true);
    }, [playerProgress, reducedMotion]);
    const handleCloseFullPlayer = useCallback(() => {
        // Mirror of open: begin collapsing immediately rather than after the
        // re-render the state flip schedules.
        playerProgress.value = withSpring(
            0,
            reducedMotion ? REDUCED_MOTION_SPRING : PLAYER_CLOSE_SPRING,
        );
        setIsFullPlayerOpen(false);
    }, [playerProgress, reducedMotion]);
    const handleOpenOutputPicker = useCallback(() => setOutputPickerVisible(true), []);
    const handleCloseOutputPicker = useCallback(() => setOutputPickerVisible(false), []);

    return (
        <>
            <ErrorBoundary label="MiniPlayer">
                <ConnectedMiniPlayer
                    artworkImageId={playbackItem?.artworkImageId}
                    artworkUrl={currentHighResArtworkUrl}
                    contentSource={playbackContentSource}
                    lastPlayedItem={lastPlayedItem}
                    onOpenFullPlayer={handleOpenFullPlayer}
                    onTogglePlayback={handleTogglePlayback}
                    playerProgress={playerProgress}
                    reducedMotion={reducedMotion}
                    serverConnection={serverConnection}
                />
            </ErrorBoundary>
            <ErrorBoundary
                fallback={(error, retry) => (
                    // If the fullscreen player throws, just dismiss it
                    // rather than blocking the whole app. The user can
                    // still see the miniplayer and tap to reopen.
                    <View style={styles.errorBoundaryRoot}>
                        <Text style={styles.errorBoundaryTitle}>Player error</Text>
                        <Text style={styles.errorBoundarySubtitle}>{error.message}</Text>
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                                setIsFullPlayerOpen(false);
                                retry();
                            }}
                            style={styles.errorBoundaryButton}
                        >
                            <Text style={styles.errorBoundaryButtonText}>Dismiss</Text>
                        </Pressable>
                    </View>
                )}
                label="FullScreenPlayer"
            >
                <ConnectedFullScreenPlayer
                    artworkImageId={playbackItem?.artworkImageId}
                    artworkUrl={currentHighResArtworkUrl}
                    castState={castState}
                    contentSource={playbackContentSource}
                    isShuffled={isShuffled}
                    lastPlayedItem={lastPlayedItem}
                    onClose={handleCloseFullPlayer}
                    onCycleRepeatMode={handleCycleRepeatMode}
                    onNext={handlePlayerNext}
                    onOpenOutputPicker={handleOpenOutputPicker}
                    onPlayQueueIndex={handlePlayerPlayQueueIndex}
                    onPrevious={handlePlayerPrevious}
                    onSeek={handlePlayerSeek}
                    onSkipBySeconds={handlePlayerSkipBySeconds}
                    onTogglePlayback={handleTogglePlayback}
                    onToggleShuffle={handleToggleShuffle}
                    playerProgress={playerProgress}
                    queue={queue}
                    reducedMotion={reducedMotion}
                    repeatMode={repeatMode}
                    serverConnection={serverConnection}
                    visible={isFullPlayerOpen}
                />
            </ErrorBoundary>
            <OutputPickerModal
                castState={castState}
                onClose={handleCloseOutputPicker}
                visible={outputPickerVisible}
            />
        </>
    );
});
