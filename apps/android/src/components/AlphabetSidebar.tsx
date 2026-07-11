import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';

import { triggerSelection } from '../services/haptics';
import { ALPHABET_SIDEBAR_LETTERS } from '../utils/collection-sort';
import { styles } from '../theme/styles';

const AlphabetSidebarLetter = memo(({
    isActive,
    letter,
    onJumpToLetter,
    onRef,
}: {
    isActive: boolean;
    letter: string;
    onJumpToLetter: (letter: string) => void;
    onRef: (letter: string, node: View | null) => void;
}) => {
    const handlePress = useCallback(() => {
        onJumpToLetter(letter);
    }, [letter, onJumpToLetter]);

    const handleRef = useCallback((node: View | null) => {
        onRef(letter, node);
    }, [letter, onRef]);

    return (
        <Pressable
            disabled={!isActive}
            hitSlop={{ bottom: 0, left: 18, right: 4, top: 0 }}
            onPress={handlePress}
            ref={handleRef}
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
});
AlphabetSidebarLetter.displayName = 'AlphabetSidebarLetter';

/**
 * The A–Z rail on the right edge of the big two-up browse grids. It maps a
 * finger position (drag) or a tap to a letter and hands that letter back to the
 * owner via `onJumpToLetter`. It only knows which letters are jumpable
 * (`activeLetters`); the owner decides what scrolling/sorting a jump triggers.
 */
export const AlphabetSidebar = memo(({
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
                    nextMetrics.push({ bottom: y + height, letter, top: y });
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
                    // Re-measure on touch so a list that grew/shrank since the
                    // last layout still maps the finger to the right letter.
                    measureLetterMetrics(() => jumpToPageY(pageY));
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

    const handleLetterPress = useCallback(
        (letter: string) => {
            lastSelectedLetterRef.current = null;
            jumpToLetter(letter);
            lastSelectedLetterRef.current = null;
        },
        [jumpToLetter],
    );

    const handleLetterRef = useCallback((letter: string, node: View | null) => {
        letterRefs.current[letter] = node;
    }, []);

    return (
        <View pointerEvents="box-none" style={styles.alphabetSidebar}>
            <View
                {...panResponder.panHandlers}
                accessibilityLabel="Alphabet jump index"
                accessibilityRole="adjustable"
                onLayout={() => measureLetterMetrics()}
                style={styles.alphabetSidebarRail}
            >
                {ALPHABET_SIDEBAR_LETTERS.map((letter) => (
                    <AlphabetSidebarLetter
                        isActive={activeLetters.has(letter)}
                        key={letter}
                        letter={letter}
                        onJumpToLetter={handleLetterPress}
                        onRef={handleLetterRef}
                    />
                ))}
            </View>
        </View>
    );
});
AlphabetSidebar.displayName = 'AlphabetSidebar';
