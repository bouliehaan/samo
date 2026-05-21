import {
    getItemQualityProfile,
    type MobileHomeItem,
    MobileHomeItemType,
} from '@samo/core/mobile';
import {
    FlashList,
    type FlashListRef,
} from '@shopify/flash-list';
import {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    PanResponder,
    Pressable,
    Text,
    View,
} from 'react-native';

import { ArtworkImage } from '../components/ArtworkImage';
import { QualityBadge } from '../components/QualityBadge';
import { useMediaContextMenu } from '../contexts/media-context-menu';
import { type AndroidFullCollectionState } from '../services/full-collection';
import {
    type AndroidRecentContentSourceItem,
    getRecentContentItemKey,
} from '../services/recent-content';
import { triggerSelection } from '../services/haptics';
import { VIEW_ALL_ROW_HEIGHT } from '../theme/layout';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';
import { type ViewAllRoute } from '../types/view-all';

const FLASH_LIST_MAINTAIN_POSITION_DISABLED = { disabled: true };

// Letters that anchor the alphabet sidebar. '#' catches anything starting with
// a digit or non-Latin character so every item maps somewhere.
const ALPHABET_SIDEBAR_LETTERS = [
    '#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K',
    'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W',
    'X', 'Y', 'Z',
] as const;

/**
 * Build a map of sidebar letter to row index for ViewAll's two-column layout.
 * The value is the row the letter falls into, so the sidebar can hand the list
 * a row index directly for scrollToIndex.
 */
const buildAlphabetLetterIndex = (
    items: MobileHomeItem[],
): Map<string, number> => {
    const map = new Map<string, number>();
    items.forEach((item, index) => {
        const first = item.title.charAt(0).toUpperCase();
        const letter = first >= 'A' && first <= 'Z' ? first : '#';
        if (!map.has(letter)) {
            map.set(letter, Math.floor(index / 2));
        }
    });
    return map;
};

type ViewAllRow = {
    key: string;
    left: MobileHomeItem;
    right: MobileHomeItem | undefined;
};

const chunkIntoViewAllRows = (items: MobileHomeItem[]): ViewAllRow[] => {
    const rows: ViewAllRow[] = [];
    for (let index = 0; index < items.length; index += 2) {
        const left = items[index];
        const right = items[index + 1];
        rows.push({
            // Row identity is its left item. Adding/removing items below this
            // row won't shift the key, so React keeps the row mounted.
            key: `row:${getRecentContentItemKey(left)}`,
            left,
            right,
        });
    }
    return rows;
};

const getViewAllSortKey = (item: MobileHomeItem): string =>
    item.title.trim().toLocaleLowerCase();

const VIEW_ALL_SORT_COLLATOR = new Intl.Collator(undefined, {
    numeric: true,
    sensitivity: 'base',
});

type ViewAllTileProps = {
    item: MobileHomeItem;
    onOpenContextMenu: (item: MobileHomeItem) => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
};

const ViewAllTile = memo(({ item, onOpenContextMenu, onSelectItem }: ViewAllTileProps) => {
    const isArtist = item.type === MobileHomeItemType.ARTIST;
    // Playlists are mixed format, so never show a collection-level badge.
    const tileBadgeProfile =
        item.type === MobileHomeItemType.PLAYLIST ? undefined : getItemQualityProfile(item);

    return (
        <Pressable
            accessibilityRole="button"
            onLongPress={() => onOpenContextMenu(item)}
            onPress={() => onSelectItem(item)}
            style={styles.viewAllTile}
        >
            <ArtworkImage
                fallbackStyle={[
                    styles.viewAllTileArtworkFallback,
                    isArtist && styles.libraryArtworkRound,
                ]}
                letter={item.title.slice(0, 1).toUpperCase()}
                style={[
                    styles.viewAllTileArtwork,
                    isArtist && styles.libraryArtworkRound,
                ]}
                uri={item.artworkUrl}
            />
            <QualityBadge overlay profile={tileBadgeProfile} />
            <Text numberOfLines={1} style={styles.viewAllTileTitle}>
                {item.title}
            </Text>
            {item.subtitle ? (
                <Text numberOfLines={1} style={styles.viewAllTileSubtitle}>
                    {item.subtitle}
                </Text>
            ) : null}
        </Pressable>
    );
});
ViewAllTile.displayName = 'ViewAllTile';

interface ViewAllScreenProps {
    fullState: AndroidFullCollectionState;
    onBack: () => void;
    onSelectItem: (item: AndroidRecentContentSourceItem) => void;
    route: ViewAllRoute;
}

export const ViewAllScreen = memo(({
    fullState,
    onBack,
    onSelectItem,
    route,
}: ViewAllScreenProps) => {
    const contextMenu = useMediaContextMenu();
    // FlashList is single-column over pre-chunked row records. Keeping each
    // two-up visual row as one recycled item avoids the old numColumns cell
    // stacking bug while moving the heavy library grid onto native recycling.
    const listRef = useRef<FlashListRef<ViewAllRow>>(null);
    const jumpFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [jumpFeedbackLetter, setJumpFeedbackLetter] = useState<string | null>(null);
    const isLoading = fullState.status === 'loading';
    const isError = fullState.status === 'error';
    const sortedItems = useMemo(() => {
        // Prefer the exhaustive list once it lands; until then show the
        // home-content slice the route was opened with so the grid isn't empty
        // during the fetch. Merge the cached items either way so a brief stale
        // state can't drop favorites that the full fetch missed.
        const fullItems = fullState.status === 'loaded' ? fullState.items : [];
        const sourceItems = fullState.status === 'loaded'
            ? [...fullItems, ...route.items]
            : route.items;
        const merged: MobileHomeItem[] = [];
        const seen = new Set<string>();
        for (const item of sourceItems) {
            if (!item || typeof item.id !== 'string' || typeof item.title !== 'string') {
                continue;
            }
            const key = getRecentContentItemKey(item);
            if (seen.has(key)) continue;
            seen.add(key);
            merged.push(item);
        }
        return merged
            .map((item) => ({ item, sortKey: getViewAllSortKey(item) }))
            .sort((left, right) => VIEW_ALL_SORT_COLLATOR.compare(left.sortKey, right.sortKey))
            .map(({ item }) => item);
    }, [fullState, route.items]);
    const rows = useMemo(() => chunkIntoViewAllRows(sortedItems), [sortedItems]);
    const letterIndex = useMemo(
        () => buildAlphabetLetterIndex(sortedItems),
        [sortedItems],
    );

    useEffect(() => {
        return () => {
            if (jumpFeedbackTimeoutRef.current) {
                clearTimeout(jumpFeedbackTimeoutRef.current);
            }
        };
    }, []);

    const showJumpFeedback = useCallback((letter: string) => {
        if (jumpFeedbackTimeoutRef.current) {
            clearTimeout(jumpFeedbackTimeoutRef.current);
        }
        setJumpFeedbackLetter(letter);
        jumpFeedbackTimeoutRef.current = setTimeout(() => {
            setJumpFeedbackLetter(null);
            jumpFeedbackTimeoutRef.current = null;
        }, 420);
    }, []);

    const handleJumpToLetter = useCallback(
        (letter: string) => {
            const rowIndex = letterIndex.get(letter);
            if (typeof rowIndex !== 'number') return;
            showJumpFeedback(letter);
            try {
                const scroll = listRef.current?.scrollToIndex({
                    animated: false,
                    index: rowIndex,
                });
                void scroll?.catch(() => {
                    listRef.current?.scrollToOffset({
                        animated: false,
                        offset: rowIndex * VIEW_ALL_ROW_HEIGHT,
                    });
                });
            } catch (error) {
                console.warn('[ViewAllScreen] scrollToIndex threw', error);
            }
        },
        [letterIndex, showJumpFeedback],
    );

    const handleOpenContextMenu = useCallback(
        (item: MobileHomeItem) => contextMenu.openForItem(item),
        [contextMenu],
    );

    const renderRow = useCallback(
        ({ item: row }: { item: ViewAllRow }) => (
            <View style={styles.viewAllRow}>
                <ViewAllTile
                    item={row.left}
                    onOpenContextMenu={handleOpenContextMenu}
                    onSelectItem={onSelectItem}
                />
                {row.right ? (
                    <ViewAllTile
                        item={row.right}
                        onOpenContextMenu={handleOpenContextMenu}
                        onSelectItem={onSelectItem}
                    />
                ) : (
                    <View style={styles.viewAllTilePlaceholder} />
                )}
            </View>
        ),
        [handleOpenContextMenu, onSelectItem],
    );

    const keyExtractor = useCallback((row: ViewAllRow) => row.key, []);

    return (
        <View style={styles.viewAllScreen}>
            <View style={styles.viewAllHeader}>
                <Pressable
                    accessibilityLabel="Back"
                    accessibilityRole="button"
                    hitSlop={12}
                    onPress={onBack}
                    style={styles.viewAllBackButton}
                >
                    <Text style={styles.viewAllBackArrow}>‹</Text>
                </Pressable>
                <Text numberOfLines={1} style={styles.viewAllTitle}>
                    {route.title}
                </Text>
                <View style={styles.viewAllBackButton} />
            </View>
            <View style={styles.viewAllBody}>
                {rows.length === 0 ? (
                    isLoading ? (
                        <ActivityIndicator color={colors.accent} />
                    ) : (
                        <Text style={styles.viewAllEmpty}>
                            {isError ? 'Couldn’t load every item.' : 'Nothing to show here yet.'}
                        </Text>
                    )
                ) : (
                    <FlashList
                        contentContainerStyle={styles.viewAllListContent}
                        data={rows}
                        drawDistance={VIEW_ALL_ROW_HEIGHT * 8}
                        keyExtractor={keyExtractor}
                        maintainVisibleContentPosition={FLASH_LIST_MAINTAIN_POSITION_DISABLED}
                        ref={listRef}
                        renderItem={renderRow}
                        showsVerticalScrollIndicator={false}
                    />
                )}
                <AlphabetSidebar
                    activeLetters={letterIndex}
                    onJumpToLetter={handleJumpToLetter}
                />
                {jumpFeedbackLetter ? (
                    <View pointerEvents="none" style={styles.viewAllJumpOverlay}>
                        <Text style={styles.viewAllJumpOverlayText}>
                            {jumpFeedbackLetter}
                        </Text>
                    </View>
                ) : null}
            </View>
        </View>
    );
});

ViewAllScreen.displayName = 'ViewAllScreen';

const AlphabetSidebar = ({
    activeLetters,
    onJumpToLetter,
}: {
    activeLetters: Map<string, number>;
    onJumpToLetter: (letter: string) => void;
}) => {
    const letterRefs = useRef<Record<string, View | null>>({});
    const letterMetricsRef = useRef<Array<{ bottom: number; letter: string; top: number }>>([]);
    const lastSelectedLetterRef = useRef<string | null>(null);

    const measureLetterMetrics = useCallback((onMeasured?: () => void) => {
        const nextMetrics: Array<{ bottom: number; letter: string; top: number }> = [];
        let pending = ALPHABET_SIDEBAR_LETTERS.length;

        const finishOne = () => {
            pending -= 1;
            if (pending === 0) {
                letterMetricsRef.current = nextMetrics.sort((left, right) => left.top - right.top);
                onMeasured?.();
            }
        };

        ALPHABET_SIDEBAR_LETTERS.forEach((letter) => {
            const node = letterRefs.current[letter];
            if (!node) {
                finishOne();
                return;
            }

            node.measureInWindow((_x, y, _width, height) => {
                if (height > 0) {
                    nextMetrics.push({
                        bottom: y + height,
                        letter,
                        top: y,
                    });
                }
                finishOne();
            });
        });
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => measureLetterMetrics(), 0);
        return () => clearTimeout(timer);
    }, [activeLetters, measureLetterMetrics]);

    const getLetterFromPageY = useCallback((pageY: number) => {
        const metrics = letterMetricsRef.current;
        if (metrics.length === 0) {
            return null;
        }

        const containing = metrics.find((metric) => pageY >= metric.top && pageY <= metric.bottom);
        if (containing) {
            return containing.letter;
        }

        let nearest = metrics[0];
        let nearestDistance = Math.abs(pageY - (nearest.top + nearest.bottom) / 2);
        for (let index = 1; index < metrics.length; index += 1) {
            const candidate = metrics[index];
            const distance = Math.abs(pageY - (candidate.top + candidate.bottom) / 2);
            if (distance < nearestDistance) {
                nearest = candidate;
                nearestDistance = distance;
            }
        }

        return nearest.letter;
    }, []);

    const jumpToLetter = useCallback(
        (letter: string) => {
            if (!activeLetters.has(letter)) return;
            if (lastSelectedLetterRef.current === letter) return;

            lastSelectedLetterRef.current = letter;
            triggerSelection();
            onJumpToLetter(letter);
        },
        [activeLetters, onJumpToLetter],
    );

    const jumpToPageY = useCallback(
        (pageY: number) => {
            const letter = getLetterFromPageY(pageY);
            if (letter) {
                jumpToLetter(letter);
            }
        },
        [getLetterFromPageY, jumpToLetter],
    );

    const resetDragLetter = useCallback(() => {
        lastSelectedLetterRef.current = null;
    }, []);

    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponder: (_event, gestureState) =>
                    Math.abs(gestureState.dy) > 2 &&
                    Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
                onPanResponderGrant: (event) => {
                    const { pageY } = event.nativeEvent;
                    measureLetterMetrics(() => {
                        jumpToPageY(pageY);
                    });
                },
                onPanResponderMove: (event) => {
                    jumpToPageY(event.nativeEvent.pageY);
                },
                onPanResponderRelease: resetDragLetter,
                onPanResponderTerminate: resetDragLetter,
                onStartShouldSetPanResponder: () => false,
            }),
        [jumpToPageY, measureLetterMetrics, resetDragLetter],
    );

    return (
        <View pointerEvents="box-none" style={styles.alphabetSidebar}>
            <View
                {...panResponder.panHandlers}
                accessibilityLabel="Alphabet jump index"
                accessibilityRole="adjustable"
                onLayout={() => measureLetterMetrics()}
                style={styles.alphabetSidebarRail}
            >
                {ALPHABET_SIDEBAR_LETTERS.map((letter) => {
                    const isActive = activeLetters.has(letter);
                    return (
                        <Pressable
                            disabled={!isActive}
                            hitSlop={{ bottom: 0, left: 18, right: 4, top: 0 }}
                            key={letter}
                            onPress={() => {
                                lastSelectedLetterRef.current = null;
                                jumpToLetter(letter);
                                lastSelectedLetterRef.current = null;
                            }}
                            ref={(node) => {
                                letterRefs.current[letter] = node;
                            }}
                            style={styles.alphabetSidebarLetterButton}
                        >
                            <Text
                                style={[
                                    styles.alphabetSidebarLetter,
                                    isActive && styles.alphabetSidebarLetterActive,
                                ]}
                            >
                                {letter}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
};
