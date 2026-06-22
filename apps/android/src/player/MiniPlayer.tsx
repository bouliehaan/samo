import { memo, useMemo, useState } from 'react';
import { ActivityIndicator, type GestureResponderEvent, Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
    interpolate,
    runOnJS,
    type SharedValue,
    useAnimatedReaction,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { type MobilePlayableAudio, getPlaybackQualityProfile } from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import { ArtworkImage } from '../components/ArtworkImage';
import { usePlaybackBusy } from '../hooks/use-playback-busy';
import { PlayPauseGlyph } from '../components/Glyphs';
import { QualityBadge } from '../components/QualityBadge';
import { type AndroidPlaybackState } from '../types/playback';
import { getPlayableDisplayMetadata, getPlaybackDisplayMetadata } from '../utils/playback-time';
import {
    OPEN_SPRING,
    PLAYER_EXPANSION_DISTANCE,
    REDUCED_MOTION_SPRING,
} from '../theme/layout';
import { PLAYER_OPEN_SPRING } from './player-motion';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';

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
    serverConnection,
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
    serverConnection: ServerAuthenticationResult | null;
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
    // While the stream resolves (token mint → connect → first buffer) the engine
    // sits in 'loading'/'buffering'. Surface that as a spinner ON the play/pause
    // control so tapping a station/episode reads as "starting". A live/radio or
    // freshly-warmed podcast start strobes buffering↔playing for a beat, so the
    // busy decision is debounced through that flicker (see usePlaybackBusy) —
    // otherwise the spinner blinked (podcast) or never showed at all (radio).
    const isBusy = usePlaybackBusy(playbackState.status);
    const isPlaying = playbackState.status === 'playing';

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
    const metadataLines = displayMetadata.lines;
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
                                serverConnection={serverConnection}
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
                        accessibilityLabel={isBusy ? 'Loading' : isPlaying ? 'Pause' : 'Play'}
                        accessibilityRole="button"
                        onPress={handlePlayPress}
                        style={styles.miniPlayerPlayButton}
                    >
                        {isBusy ? (
                            <ActivityIndicator color={colors.text} size="small" />
                        ) : (
                            <PlayPauseGlyph
                                color={colors.text}
                                isPlaying={isPlaying}
                                size={24}
                            />
                        )}
                    </Pressable>
                </Pressable>
            </Reanimated.View>
        </GestureDetector>
    );
});

MiniPlayer.displayName = 'MiniPlayer';
