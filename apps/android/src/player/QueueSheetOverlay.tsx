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
import { FlashList, type FlashListRef } from '@shopify/flash-list';
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

export type QueueSheetListItem =
    | { chapter: MobilePlaybackSegment; index: number; kind: 'chapter' }
    | { id: string; kind: 'header'; label: string }
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
    serverConnection,
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
    serverConnection: ServerAuthenticationResult | null;
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
    const queueSheetRows = useMemo<QueueSheetListItem[]>(
        () => {
            if (!interactive) {
                return EMPTY_QUEUE_SHEET_ROWS;
            }

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
        [chapters, currentIndex, interactive, items, showingChapters],
    );
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
    const wasInteractiveRef = useRef(false);
    useEffect(() => {
        const justOpened = interactive && !wasInteractiveRef.current;
        wasInteractiveRef.current = interactive;
        if (!justOpened || nowPlayingRowIndex < 0) {
            return;
        }
        // Wait a frame so FlashList has laid out the rows before scrolling to the
        // currently-playing section when the sheet opens.
        const handle = setTimeout(() => {
            try {
                listRef.current?.scrollToIndex({
                    animated: false,
                    index: nowPlayingRowIndex,
                    viewPosition: 0.15,
                });
            } catch {
                // FlashList throws if the row isn't measured yet; the next open retries.
            }
        }, 50);
        return () => clearTimeout(handle);
    }, [interactive, nowPlayingRowIndex]);
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
                                serverConnection,
                            )}
                            fallbackStyle={styles.queueRowThumbFallback}
                            letter={(row.item.title ?? '?').slice(0, 1).toUpperCase()}
                            serverConnection={serverConnection}
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
                        ref={listRef}
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
