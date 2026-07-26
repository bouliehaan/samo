import { getPlaybackQualityProfile, type MobilePlayableAudio, type MobilePlaybackSegment } from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';
import { memo, useEffect, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
    runOnJS,
    type SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import { ArtworkImage } from '../components/ArtworkImage';
import { DragHandleGlyph } from '../components/Glyphs';
import { QualityBadge } from '../components/QualityBadge';
import { SCREEN_WIDTH } from '../theme/layout';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { getContentSourceFromPlaybackItem } from '../utils/content-source';
import { formatChapterRange } from '../utils/playback-time';

/** Swipe distance past which release commits a removal. */
const REMOVE_COMMIT_PX = 88;
const REMOVE_COMMIT_VELOCITY = -900;
const REMOVE_SPRING = { damping: 20, mass: 0.6, stiffness: 380 } as const;

/** The now-playing bars indicator shared by queue + chapter rows. */
const NowPlayingBars = () => (
    <View style={styles.queueNowPlayingIndicator}>
        <View style={[styles.queueRowPlayingBar, styles.queueRowPlayingBarShort]} />
        <View style={styles.queueRowPlayingBar} />
        <View style={[styles.queueRowPlayingBar, styles.queueRowPlayingBarShort]} />
    </View>
);

/** Row body (artwork + text + badge) shared by the live row and the drag twin. */
export const QueueRowInner = ({
    isActive,
    item,
    serverConnection,
}: {
    isActive: boolean;
    item: MobilePlayableAudio;
    serverConnection: ServerAuthenticationResult | null;
}) => {
    const profile = getPlaybackQualityProfile(item);
    return (
        <>
            <View>
                <ArtworkImage
                    artworkImageId={item.artworkImageId}
                    contentSource={getContentSourceFromPlaybackItem(item, serverConnection)}
                    fallbackStyle={styles.queueRowThumbFallback}
                    letter={(item.title ?? '?').slice(0, 1).toUpperCase()}
                    serverConnection={serverConnection}
                    style={styles.queueRowThumb}
                    uri={item.artworkUrl}
                />
                <QualityBadge thumb profile={profile} />
            </View>
            <View style={styles.queueRowBody}>
                <Text
                    numberOfLines={1}
                    style={[styles.queueRowTitle, isActive && { color: colors.accent }]}
                >
                    {item.title}
                </Text>
                {item.subtitle ? (
                    <Text numberOfLines={1} style={styles.queueRowSubtitle}>
                        {item.subtitle}
                    </Text>
                ) : null}
            </View>
            {isActive ? <NowPlayingBars /> : null}
        </>
    );
};

/** One chapter row: number, title, time range; tap seeks. */
export const QueueChapterRow = ({
    chapter,
    index,
    isActive,
    onPress,
}: {
    chapter: MobilePlaybackSegment;
    index: number;
    isActive: boolean;
    onPress: () => void;
}) => (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.queueRow}>
        <View style={styles.queueChapterNumber}>
            <Text
                style={[styles.queueChapterNumberText, isActive && { color: colors.accent }]}
            >
                {index + 1}
            </Text>
        </View>
        <View style={styles.queueRowBody}>
            <Text
                numberOfLines={1}
                style={[styles.queueRowTitle, isActive && { color: colors.accent }]}
            >
                {chapter.title ?? `Chapter ${index + 1}`}
            </Text>
            <Text numberOfLines={1} style={styles.queueRowSubtitle}>
                {formatChapterRange(chapter)}
            </Text>
        </View>
        {isActive ? <NowPlayingBars /> : null}
    </Pressable>
);

/**
 * One interactive queue row: tap plays, swipe-left removes, and the handle
 * (up-next rows only) starts a drag-to-reorder owned by the parent sheet.
 */
export const QueueTrackRow = memo(
    ({
        canDrag,
        dragTranslateY,
        interactionsEnabled,
        isActive,
        isDragSource,
        onDragBegin,
        onDragEnd,
        onPlay,
        onRemove,
        queueIndex,
        rowItem,
        rowKey,
        serverConnection,
    }: {
        canDrag: boolean;
        dragTranslateY: SharedValue<number>;
        interactionsEnabled: boolean;
        isActive: boolean;
        isDragSource: boolean;
        onDragBegin: (queueIndex: number, rowKey: string, item: MobilePlayableAudio) => void;
        onDragEnd: (commit: boolean) => void;
        onPlay: (queueIndex: number) => void;
        onRemove: (queueIndex: number) => void;
        queueIndex: number;
        rowItem: MobilePlayableAudio;
        rowKey: string;
        serverConnection: ServerAuthenticationResult | null;
    }) => {
        const swipeX = useSharedValue(0);
        // FlashList recycles row instances — a recycled row must never inherit
        // the previous occupant's swipe offset.
        useEffect(() => {
            swipeX.value = 0;
        }, [rowKey, swipeX]);

        const swipeGesture = useMemo(
            () =>
                Gesture.Pan()
                    .enabled(interactionsEnabled && !isActive)
                    .activeOffsetX(-16)
                    .failOffsetY([-14, 14])
                    .onUpdate((event) => {
                        'worklet';
                        swipeX.value = Math.min(0, event.translationX);
                    })
                    .onEnd((event) => {
                        'worklet';
                        const commit =
                            event.translationX < -REMOVE_COMMIT_PX ||
                            (event.velocityX < REMOVE_COMMIT_VELOCITY &&
                                event.translationX < -32);
                        if (commit) {
                            swipeX.value = withTiming(
                                -SCREEN_WIDTH,
                                { duration: 150 },
                                (finished) => {
                                    if (finished) {
                                        runOnJS(onRemove)(queueIndex);
                                    }
                                },
                            );
                            return;
                        }
                        swipeX.value = withSpring(0, REMOVE_SPRING);
                    }),
            [interactionsEnabled, isActive, onRemove, queueIndex, swipeX],
        );

        // Long-press-then-drag on the handle. The brief hold keeps the list's
        // native scroll from fighting the pan for vertical movement.
        const handleGesture = useMemo(
            () =>
                Gesture.Pan()
                    .enabled(interactionsEnabled && canDrag)
                    .activateAfterLongPress(140)
                    .onStart(() => {
                        'worklet';
                        dragTranslateY.value = 0;
                        runOnJS(onDragBegin)(queueIndex, rowKey, rowItem);
                    })
                    .onUpdate((event) => {
                        'worklet';
                        dragTranslateY.value = event.translationY;
                    })
                    .onEnd(() => {
                        'worklet';
                        runOnJS(onDragEnd)(true);
                    })
                    .onFinalize((_event, success) => {
                        'worklet';
                        if (!success) {
                            runOnJS(onDragEnd)(false);
                        }
                    }),
            [
                canDrag,
                dragTranslateY,
                interactionsEnabled,
                onDragBegin,
                onDragEnd,
                queueIndex,
                rowItem,
                rowKey,
            ],
        );

        const contentStyle = useAnimatedStyle(() => ({
            transform: [{ translateX: swipeX.value }],
        }));
        const underlayStyle = useAnimatedStyle(() => ({
            opacity: Math.min(1, -swipeX.value / (REMOVE_COMMIT_PX * 0.8)),
        }));

        return (
            <View style={styles.queueRowShell}>
                <Reanimated.View
                    pointerEvents="none"
                    style={[styles.queueRowRemoveUnderlay, underlayStyle]}
                >
                    <Text style={styles.queueRowRemoveText}>Remove</Text>
                </Reanimated.View>
                <GestureDetector gesture={swipeGesture}>
                    <Reanimated.View
                        style={[
                            styles.queueRowContentWrap,
                            contentStyle,
                            isDragSource && styles.queueRowDragSource,
                        ]}
                    >
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => onPlay(queueIndex)}
                            style={styles.queueRowPressable}
                        >
                            <QueueRowInner
                                isActive={isActive}
                                item={rowItem}
                                serverConnection={serverConnection}
                            />
                        </Pressable>
                        {canDrag ? (
                            <GestureDetector gesture={handleGesture}>
                                <Reanimated.View
                                    accessibilityLabel="Reorder"
                                    style={styles.queueDragHandle}
                                >
                                    <DragHandleGlyph color={colors.faint} />
                                </Reanimated.View>
                            </GestureDetector>
                        ) : null}
                    </Reanimated.View>
                </GestureDetector>
            </View>
        );
    },
);

QueueTrackRow.displayName = 'QueueTrackRow';
