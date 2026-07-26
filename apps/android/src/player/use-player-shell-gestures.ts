import { useCallback, useMemo, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
    interpolate,
    runOnJS,
    type SharedValue,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    type WithSpringConfig,
} from 'react-native-reanimated';

import {
    DISMISS_DISTANCE,
    DISMISS_VELOCITY,
    PLAYER_EXPANSION_DISTANCE,
    QUEUE_CLOSE_DISTANCE,
    QUEUE_CLOSE_VELOCITY,
    QUEUE_SHEET_HEIGHT,
} from '../theme/layout';
import { logSeekGesture, SEEK_GESTURE_DEBUG } from '../utils/seek-debug';

/**
 * The full player's shell gesture system: one vertical pan that opens/dismisses
 * the player or raises/lowers the queue sheet (mode-switched per drag), plus a
 * horizontal swipe for track skip, composed to run simultaneously. Owns the
 * queue sheet's progress value and its derived styles/interactivity.
 */
export function usePlayerShellGestures({
    canSkipPlayback,
    closeSpring,
    onClose,
    onNext,
    onPrevious,
    openSpring,
    playerProgress,
    reducedMotion,
    settleSpring,
}: {
    canSkipPlayback: boolean;
    closeSpring: WithSpringConfig;
    onClose: () => void;
    onNext: () => void;
    onPrevious: () => void;
    openSpring: WithSpringConfig;
    playerProgress: SharedValue<number>;
    reducedMotion: boolean;
    settleSpring: WithSpringConfig;
}) {
    // Queue sheet position: 0 = hidden below the screen, 1 = fully expanded.
    // Driven by the same vertical-drag gesture that handles player dismiss,
    // mode-switched per drag based on direction and current state.
    const queueProgress = useSharedValue(0);
    const dragMode = useSharedValue<'player' | 'queue'>('player');
    const dragStartQueue = useSharedValue(0);

    // One vertical pan on the shell: drag up from the dock opens the panel;
    // drag down dismisses; upward while open can raise the queue sheet.
    const dragGesture = useMemo(
        () =>
            Gesture.Pan()
                .activeOffsetY([-8, 10])
                .failOffsetX([-28, 28])
                .onStart(() => {
                    'worklet';
                    if (SEEK_GESTURE_DEBUG) {
                        runOnJS(logSeekGesture)('player:drag:activate');
                    }
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
                        const fraction = -event.translationY / QUEUE_SHEET_HEIGHT;
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
                        const opening = queueProgress.value > 0.5 || event.velocityY < -700;
                        queueProgress.value = withSpring(opening ? 1 : 0, settleSpring);
                        return;
                    }
                    const shouldDismiss =
                        event.translationY > DISMISS_DISTANCE ||
                        (event.velocityY > DISMISS_VELOCITY && event.translationY > 40);
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
                                      velocity: -event.velocityY / PLAYER_EXPANSION_DISTANCE,
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

    // Horizontal swipe-to-skip. Separated so it can fail cleanly when the gesture
    // is clearly vertical — composing with Simultaneous lets the user
    // start a swipe in either direction without one stealing the other.
    const skipGesture = useMemo(
        () =>
            Gesture.Pan()
                .enabled(canSkipPlayback)
                .activeOffsetX([-30, 30])
                .failOffsetY([-30, 30])
                .onStart(() => {
                    'worklet';
                    if (SEEK_GESTURE_DEBUG) {
                        runOnJS(logSeekGesture)('player:skip:activate');
                    }
                })
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

    // Handed to the seek bar so its tap/pan can `blocksExternalGesture` these
    // shell pans — a touch that lands on the bar gives the seek gesture first
    // claim instead of racing the dismiss/skip pans with no tiebreaker (the
    // nested-GestureDetector conflict that made drags on the bar flaky after
    // the PanResponder→RNGH migration).
    const seekExternalGestures = useMemo(
        () => [dragGesture, skipGesture],
        [dragGesture, skipGesture],
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

    return {
        closeQueue,
        isQueueInteractive,
        playerGesture,
        queueBackdropStyle,
        queueProgress,
        queueSheetStyle,
        seekExternalGestures,
    };
}
