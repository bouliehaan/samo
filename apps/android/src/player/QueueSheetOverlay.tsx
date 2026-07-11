import { getPlaybackQualityProfile, type MobilePlayableAudio, type MobilePlaybackSegment } from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    type LayoutChangeEvent,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
    Pressable,
    ScrollView,
    type ScrollViewProps,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
    runOnJS,
    type SharedValue,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    type WithSpringConfig,
    withTiming,
} from 'react-native-reanimated';

import { ArtworkImage } from '../components/ArtworkImage';
import { DownCaretGlyph, DragHandleGlyph } from '../components/Glyphs';
import { QualityBadge } from '../components/QualityBadge';
import { syncAndroidNativePlaybackQueue } from '../services/audio-playback';
import { triggerImpact } from '../services/haptics';
import { getPlaybackQueue, setPlaybackQueue } from '../state/playback-queue-store';
import { getContentSourceFromPlaybackItem } from '../utils/content-source';
import { getPlayerPositionMsForAbsProgress } from '../utils/abs-progress-math';
import { findActiveChapterIndex, formatChapterRange } from '../utils/playback-time';
import { moveQueueUpNextItem, removeQueueItemAt } from '../utils/queue-edits';
import {
    QUEUE_CLOSE_DISTANCE,
    QUEUE_CLOSE_VELOCITY,
    QUEUE_SHEET_HEADER_ROW_HEIGHT,
    QUEUE_SHEET_HEIGHT,
    QUEUE_SHEET_ROW_HEIGHT as ROW_HEIGHT,
    SCREEN_WIDTH,
} from '../theme/layout';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';

const ReanimatedFlashList = Reanimated.createAnimatedComponent(FlashList) as typeof FlashList;
const FLASH_LIST_MAINTAIN_POSITION_DISABLED = { disabled: true };

export type QueueSheetListItem =
    | { chapter: MobilePlaybackSegment; index: number; kind: 'chapter' }
    | { id: string; kind: 'header'; label: string }
    | { index: number; item: MobilePlayableAudio; kind: 'queue' };

export const QUEUE_SHEET_ROW_HEIGHT = ROW_HEIGHT;
export const QUEUE_SHEET_DRAW_DISTANCE = ROW_HEIGHT * 10;

/** Swipe distance past which release commits a removal. */
const REMOVE_COMMIT_PX = 88;
const REMOVE_COMMIT_VELOCITY = -900;
/** Finger-near-edge zone that drives auto-scroll while dragging. */
const DRAG_EDGE_PX = 64;
const DRAG_SCROLL_STEP_PX = 14;

const REMOVE_SPRING = { damping: 20, mass: 0.6, stiffness: 380 } as const;

type DragMeta = {
    /** Number of up-next items (slots run 0..count). */
    count: number;
    /** Content-space Y of the first up-next row. */
    firstRowTop: number;
    /** Queue index of the first up-next item. */
    firstUpNext: number;
};

/** The now-playing bars indicator shared by queue + chapter rows. */
const NowPlayingBars = () => (
    <View style={styles.queueNowPlayingIndicator}>
        <View style={[styles.queueRowPlayingBar, styles.queueRowPlayingBarShort]} />
        <View style={styles.queueRowPlayingBar} />
        <View style={[styles.queueRowPlayingBar, styles.queueRowPlayingBarShort]} />
    </View>
);

/** Row body (artwork + text + badge) shared by the live row and the drag twin. */
const QueueRowInner = ({
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

/**
 * One interactive queue row: tap plays, swipe-left removes, and the handle
 * (up-next rows only) starts a drag-to-reorder owned by the parent sheet.
 */
const QueueTrackRow = memo(
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
    queueProgress,
    serverConnection,
    settleSpring,
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
    /** Sheet position (0 hidden → 1 open), owned by the player shell. The
     *  sheet's own pull-down gestures drive it directly so the drawer tracks
     *  the finger instead of waiting for a threshold to teleport it. */
    queueProgress: SharedValue<number>;
    serverConnection: ServerAuthenticationResult | null;
    /** The shell's (reduced-motion-aware) settle spring, so sheet snaps here
     *  move exactly like the shell's own open/close motion. */
    settleSpring: WithSpringConfig;
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
    const currentIndex = queue?.index ?? -1;
    // Rows are built (and the FlashList rendered) even while the sheet is
    // CLOSED. The drawer has to read as a physical object that was already
    // sitting under the screen edge — opening it must reveal finished
    // content, never a mount-then-populate flash. The cost is one virtualized
    // viewport (~12 rows) kept warm behind the player; the win is that the
    // swipe-up shows artwork, titles, and the now-playing section instantly.
    const queueSheetRows = useMemo<QueueSheetListItem[]>(
        () => {
            if (showingChapters) {
                return (chapters ?? []).map((chapter, index) => ({
                    chapter,
                    index,
                    kind: 'chapter' as const,
                }));
            }

            // Group the flat queue into Previously played / Now playing / Up next
            // so the sheet reads like a timeline instead of one undifferentiated
            // list, and so the player can scroll straight to the current track.
            const rows: QueueSheetListItem[] = [];
            items.forEach((item, index) => {
                if (index === 0 && currentIndex > 0) {
                    rows.push({ id: 'header-history', kind: 'header', label: 'Previously played' });
                }
                if (index === currentIndex) {
                    rows.push({ id: 'header-now', kind: 'header', label: 'Now playing' });
                }
                if (index === currentIndex + 1) {
                    rows.push({ id: 'header-next', kind: 'header', label: 'Up next' });
                }
                rows.push({ index, item, kind: 'queue' as const });
            });
            return rows;
        },
        [chapters, currentIndex, items, showingChapters],
    );

    // Content-space geometry for the drag machinery. Row heights are FIXED, so
    // insertion slots are pure arithmetic — no measuring of virtualized rows.
    const rowLayout = useMemo(() => {
        const offsets: number[] = [];
        let y = 0;
        for (const row of queueSheetRows) {
            offsets.push(y);
            y += row.kind === 'header' ? QUEUE_SHEET_HEADER_ROW_HEIGHT : ROW_HEIGHT;
        }
        return { offsets, totalHeight: y };
    }, [queueSheetRows]);
    const dragMeta = useMemo<DragMeta | null>(() => {
        if (showingChapters || !queue || currentIndex < 0) {
            return null;
        }
        const firstUpNext = currentIndex + 1;
        const count = items.length - firstUpNext;
        if (count < 1) {
            return null;
        }
        const firstRowPos = queueSheetRows.findIndex(
            (row) => row.kind === 'queue' && row.index === firstUpNext,
        );
        if (firstRowPos < 0) {
            return null;
        }
        return { count, firstRowTop: rowLayout.offsets[firstRowPos]!, firstUpNext };
    }, [currentIndex, items.length, queue, queueSheetRows, rowLayout, showingChapters]);

    const nowPlayingRowIndex = useMemo(() => {
        if (showingChapters) {
            return Math.max(0, activeChapterIndex);
        }
        return queueSheetRows.findIndex(
            (row) =>
                (row.kind === 'header' && row.id === 'header-now') ||
                (row.kind === 'queue' && row.index === currentIndex),
        );
    }, [activeChapterIndex, currentIndex, queueSheetRows, showingChapters]);
    const listRef = useRef<FlashListRef<QueueSheetListItem>>(null);
    // First-layout signal: the park effect below must re-run once FlashList
    // has actually measured rows, or the very first park (app boot) throws
    // into the catch and nothing retries until the queue changes.
    const [listLoaded, setListLoaded] = useState(false);
    const handleListLoad = useCallback(() => setListLoaded(true), []);
    // While the sheet is CLOSED, keep the list parked on the now-playing
    // section (re-parking as playback advances and after the user browsed
    // then closed). The open gesture then reveals a list that is already in
    // position — no post-open jump. While OPEN the user owns the scroll, so
    // a track change never yanks the viewport.
    useEffect(() => {
        if (interactive || nowPlayingRowIndex < 0 || !listLoaded) {
            return;
        }
        // Wait a frame so FlashList has laid out the rows before positioning.
        const handle = setTimeout(() => {
            try {
                listRef.current?.scrollToIndex({
                    animated: false,
                    index: nowPlayingRowIndex,
                    viewPosition: 0.15,
                });
            } catch {
                // FlashList throws if the row isn't measured yet; the next
                // queue/track change retries.
            }
        }, 50);
        return () => clearTimeout(handle);
    }, [interactive, listLoaded, nowPlayingRowIndex]);

    // ---- drag-to-reorder state ----
    const [dragging, setDragging] = useState<null | {
        item: MobilePlayableAudio;
        queueIndex: number;
        rowKey: string;
    }>(null);
    const draggingRef = useRef<typeof dragging>(null);
    const dragTranslateY = useSharedValue(0);
    const dragTwinTop = useSharedValue(0);
    const dragScrollOffset = useSharedValue(0);
    const dragSlot = useSharedValue(0);
    const listViewportHeightRef = useRef(0);
    const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const dragMetaRef = useRef(dragMeta);
    dragMetaRef.current = dragMeta;
    const rowLayoutRef = useRef(rowLayout);
    rowLayoutRef.current = rowLayout;

    const listScrollYRef = useRef(0);
    const handleListScroll = useCallback(
        (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            const offset = Math.max(0, event.nativeEvent.contentOffset.y);
            listScrollYRef.current = offset;
            dragScrollOffset.value = offset;
        },
        [dragScrollOffset],
    );

    const stopAutoScroll = useCallback(() => {
        if (autoScrollTimerRef.current) {
            clearInterval(autoScrollTimerRef.current);
            autoScrollTimerRef.current = null;
        }
    }, []);

    const endDrag = useCallback(
        (commit: boolean) => {
            const drag = draggingRef.current;
            if (!drag) {
                return;
            }
            stopAutoScroll();
            if (commit) {
                const meta = dragMetaRef.current;
                if (meta) {
                    const insertBefore = meta.firstUpNext + dragSlot.value;
                    const finalIndex =
                        insertBefore > drag.queueIndex ? insertBefore - 1 : insertBefore;
                    const next = moveQueueUpNextItem(
                        getPlaybackQueue(),
                        drag.queueIndex,
                        finalIndex,
                    );
                    if (next) {
                        setPlaybackQueue(next);
                        syncAndroidNativePlaybackQueue(next, serverConnection);
                        triggerImpact('light');
                    }
                }
            }
            draggingRef.current = null;
            setDragging(null);
        },
        [dragSlot, serverConnection, stopAutoScroll],
    );

    const beginDrag = useCallback(
        (queueIndex: number, rowKey: string, item: MobilePlayableAudio) => {
            const meta = dragMetaRef.current;
            if (!meta || draggingRef.current) {
                return;
            }
            const slot = queueIndex - meta.firstUpNext;
            const contentTop = meta.firstRowTop + slot * ROW_HEIGHT;
            dragTwinTop.value = contentTop - listScrollYRef.current;
            dragTranslateY.value = 0;
            dragScrollOffset.value = listScrollYRef.current;
            dragSlot.value = slot;
            draggingRef.current = { item, queueIndex, rowKey };
            setDragging(draggingRef.current);
            triggerImpact('light');
            stopAutoScroll();
            autoScrollTimerRef.current = setInterval(() => {
                if (!draggingRef.current) {
                    return;
                }
                const viewportHeight = listViewportHeightRef.current;
                if (viewportHeight <= 0) {
                    return;
                }
                const fingerY =
                    dragTwinTop.value + dragTranslateY.value + ROW_HEIGHT / 2;
                let delta = 0;
                if (fingerY < DRAG_EDGE_PX) {
                    delta = -DRAG_SCROLL_STEP_PX;
                } else if (fingerY > viewportHeight - DRAG_EDGE_PX) {
                    delta = DRAG_SCROLL_STEP_PX;
                }
                if (delta === 0) {
                    return;
                }
                const maxOffset = Math.max(
                    0,
                    rowLayoutRef.current.totalHeight - viewportHeight,
                );
                const nextOffset = Math.min(
                    Math.max(0, listScrollYRef.current + delta),
                    maxOffset,
                );
                if (nextOffset === listScrollYRef.current) {
                    return;
                }
                listRef.current?.scrollToOffset({ animated: false, offset: nextOffset });
            }, 48);
        },
        [dragScrollOffset, dragSlot, dragTranslateY, dragTwinTop, stopAutoScroll],
    );

    // A queue change mid-drag (native auto-advance, an external edit) redraws
    // the rows under the drag — the captured geometry is stale, so abort.
    useEffect(() => {
        if (draggingRef.current) {
            stopAutoScroll();
            draggingRef.current = null;
            setDragging(null);
        }
    }, [queue, stopAutoScroll]);
    useEffect(() => stopAutoScroll, [stopAutoScroll]);

    // Track the drop slot on the UI thread while the finger moves.
    useAnimatedReaction(
        () => {
            const meta = dragMeta;
            if (!meta) {
                return -1;
            }
            const centerContentY =
                dragTwinTop.value +
                dragTranslateY.value +
                dragScrollOffset.value +
                ROW_HEIGHT / 2;
            const raw = Math.round((centerContentY - meta.firstRowTop) / ROW_HEIGHT - 0.5);
            return Math.min(Math.max(raw, 0), meta.count);
        },
        (slot, previous) => {
            if (slot >= 0 && slot !== previous && previous !== null) {
                dragSlot.value = slot;
                runOnJS(triggerImpact)('light');
            }
        },
        [dragMeta],
    );

    const dragTwinStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: dragTwinTop.value + dragTranslateY.value }, { scale: 1.02 }],
    }));
    const dropIndicatorStyle = useAnimatedStyle(() => {
        const meta = dragMeta;
        if (!meta) {
            return { opacity: 0, transform: [{ translateY: 0 }] };
        }
        return {
            opacity: 1,
            transform: [
                {
                    translateY:
                        meta.firstRowTop +
                        dragSlot.value * ROW_HEIGHT -
                        dragScrollOffset.value,
                },
            ],
        };
    }, [dragMeta]);

    const handleRemoveRow = useCallback(
        (queueIndex: number) => {
            const next = removeQueueItemAt(getPlaybackQueue(), queueIndex);
            if (next) {
                setPlaybackQueue(next);
                syncAndroidNativePlaybackQueue(next, serverConnection);
                triggerImpact('light');
            }
        },
        [serverConnection],
    );
    const handlePlayRow = useCallback(
        (queueIndex: number) => {
            onPlayQueueIndex?.(queueIndex);
        },
        [onPlayQueueIndex],
    );

    const handleListLayout = useCallback((event: LayoutChangeEvent) => {
        listViewportHeightRef.current = event.nativeEvent.layout.height;
    }, []);

    // ---- sheet pull-down (header + list-at-top) ----
    // Both gestures drive `queueProgress` directly on the UI thread, so the
    // drawer tracks the finger like a physical object instead of ignoring the
    // pull until a threshold teleports it. Release settles open or closed
    // with the shell's own spring.
    const dragStartProgress = useSharedValue(1);
    const settleSheet = useCallback(
        (event: { translationY: number; velocityY: number }) => {
            'worklet';
            const close =
                event.translationY > QUEUE_CLOSE_DISTANCE ||
                event.velocityY > QUEUE_CLOSE_VELOCITY;
            queueProgress.value = withSpring(close ? 0 : 1, settleSpring);
        },
        [queueProgress, settleSpring],
    );
    const dismissGesture = useMemo(
        () =>
            Gesture.Pan()
                .activeOffsetY(8)
                .failOffsetX([-28, 28])
                .onStart(() => {
                    'worklet';
                    dragStartProgress.value = queueProgress.value;
                })
                .onChange((event) => {
                    'worklet';
                    const next =
                        dragStartProgress.value - event.translationY / QUEUE_SHEET_HEIGHT;
                    queueProgress.value = next > 1 ? 1 : next < 0 ? 0 : next;
                })
                .onEnd((event) => {
                    'worklet';
                    settleSheet(event);
                }),
        [dragStartProgress, queueProgress, settleSheet],
    );
    // The list's own scroll gesture, made explicit so the pull-down pan can
    // declare simultaneity with it — an activating RNGH pan otherwise CANCELS
    // the native scroll, which is exactly the fight the old onTouchStart/End
    // fallback kept losing (scroll or the row gestures always claimed the
    // touch first, so a pull at the top of the queue did nothing).
    const listNativeGesture = useMemo(() => Gesture.Native(), []);
    const listPanStartedAtTop = useSharedValue(false);
    const listDismissGesture = useMemo(
        () =>
            Gesture.Pan()
                .simultaneousWithExternalGesture(listNativeGesture)
                .activeOffsetY(12)
                .failOffsetX([-26, 26])
                .onBegin(() => {
                    'worklet';
                    // Captured at touch-down: only a pull that STARTED with the
                    // list already at the top may move the sheet. A drag that
                    // reaches the top mid-gesture stays a scroll; the next pull
                    // closes — matching the "can't scroll any further, so the
                    // drawer itself gives" expectation.
                    listPanStartedAtTop.value = dragScrollOffset.value <= 2;
                })
                .onStart(() => {
                    'worklet';
                    dragStartProgress.value = queueProgress.value;
                })
                .onChange((event) => {
                    'worklet';
                    if (!listPanStartedAtTop.value || event.translationY <= 0) {
                        return;
                    }
                    const next =
                        dragStartProgress.value - event.translationY / QUEUE_SHEET_HEIGHT;
                    queueProgress.value = next > 1 ? 1 : next < 0 ? 0 : next;
                })
                .onEnd((event) => {
                    'worklet';
                    if (!listPanStartedAtTop.value) {
                        return;
                    }
                    settleSheet(event);
                }),
        [
            dragScrollOffset,
            dragStartProgress,
            listNativeGesture,
            listPanStartedAtTop,
            queueProgress,
            settleSheet,
        ],
    );
    const renderQueueScrollComponent = useCallback(
        (props: ScrollViewProps) => (
            <GestureDetector gesture={listNativeGesture}>
                <ScrollView {...props} />
            </GestureDetector>
        ),
        [listNativeGesture],
    );
    const keyExtractor = useCallback((row: QueueSheetListItem) => {
        if (row.kind === 'header') {
            return row.id;
        }
        if (row.kind === 'chapter') {
            return `${row.chapter.id}-${row.index}`;
        }

        return `${row.item.id}-${row.index}`;
    }, []);
    const getItemType = useCallback((row: QueueSheetListItem) => row.kind, []);
    const renderItem = useCallback(
        ({ item: row }: { item: QueueSheetListItem }) => {
            if (row.kind === 'header') {
                return (
                    <View style={styles.queueSectionHeader}>
                        <Text style={styles.queueSectionHeaderText}>{row.label}</Text>
                    </View>
                );
            }

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
                        {isActive ? <NowPlayingBars /> : null}
                    </Pressable>
                );
            }

            const isActive = currentIndex === row.index;
            const rowKey = `${row.item.id}-${row.index}`;
            return (
                <QueueTrackRow
                    canDrag={row.index > currentIndex && (dragMeta?.count ?? 0) > 1}
                    dragTranslateY={dragTranslateY}
                    interactionsEnabled={!showingChapters}
                    isActive={isActive}
                    isDragSource={dragging?.rowKey === rowKey}
                    onDragBegin={beginDrag}
                    onDragEnd={endDrag}
                    onPlay={handlePlayRow}
                    onRemove={handleRemoveRow}
                    queueIndex={row.index}
                    rowItem={row.item}
                    rowKey={rowKey}
                    serverConnection={serverConnection}
                />
            );
        },
        [
            activeChapterIndex,
            beginDrag,
            currentIndex,
            dragMeta,
            dragTranslateY,
            dragging,
            endDrag,
            handlePlayRow,
            handleRemoveRow,
            onChapterSeek,
            progressOffsetSeconds,
            serverConnection,
            showingChapters,
        ],
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
                <GestureDetector gesture={listDismissGesture}>
                <Reanimated.View onLayout={handleListLayout} style={styles.queueSheetScroll}>
                    <ReanimatedFlashList
                        ref={listRef}
                        contentContainerStyle={styles.queueSheetContent}
                        data={queueSheetRows}
                        drawDistance={QUEUE_SHEET_DRAW_DISTANCE}
                        extraData={`${activeChapterIndex}:${currentIndex}:${dragging?.rowKey ?? ''}`}
                        getItemType={getItemType}
                        keyboardShouldPersistTaps="handled"
                        keyExtractor={keyExtractor}
                        ListEmptyComponent={
                            !showingChapters ? (
                                <Text style={styles.queueSheetEmpty}>The queue is empty.</Text>
                            ) : null
                        }
                        maintainVisibleContentPosition={FLASH_LIST_MAINTAIN_POSITION_DISABLED}
                        nestedScrollEnabled
                        onLoad={handleListLoad}
                        onScroll={handleListScroll}
                        renderItem={renderItem}
                        renderScrollComponent={renderQueueScrollComponent}
                        scrollEnabled={dragging === null}
                        scrollEventThrottle={16}
                        showsVerticalScrollIndicator={false}
                        style={styles.queueSheetScroll}
                    />
                    {dragging ? (
                        <>
                            <Reanimated.View
                                pointerEvents="none"
                                style={[styles.queueDropIndicator, dropIndicatorStyle]}
                            />
                            <Reanimated.View
                                pointerEvents="none"
                                style={[styles.queueDragTwin, dragTwinStyle]}
                            >
                                <View style={styles.queueRowPressable}>
                                    <QueueRowInner
                                        isActive={false}
                                        item={dragging.item}
                                        serverConnection={serverConnection}
                                    />
                                </View>
                            </Reanimated.View>
                        </>
                    ) : null}
                </Reanimated.View>
                </GestureDetector>
            </Reanimated.View>
        </>
    );
});

