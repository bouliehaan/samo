import { memo, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, TextInput, View } from 'react-native';
import Reanimated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import { ClearGlyph, SearchGlyph } from '../components/Glyphs';
import { SCREEN_HEIGHT } from '../theme/layout';
import { styles } from '../theme/styles';
import { colors, spacing } from '../theme/tokens';

const PLAYLIST_SEARCH_FLOATING_HEIGHT = 54;

/**
 * The floating "search this playlist" bubble. Owns the keyboard-frame
 * tracking and its own show/hide animation, so keyboard events and the
 * per-frame repositioning re-render this bubble — not the whole detail
 * surface. The query itself lives in the parent (it filters the track list).
 */
export const PlaylistFloatingSearch = memo(function PlaylistFloatingSearch({
    onChangeQuery,
    query,
    rootRef,
    visible,
}: {
    onChangeQuery: (query: string) => void;
    query: string;
    /** The detail screen's root view — the bubble positions inside its frame. */
    rootRef: RefObject<null | View>;
    visible: boolean;
}) {
    const inputRef = useRef<TextInput>(null);
    const [rootFrame, setRootFrame] = useState({ height: SCREEN_HEIGHT, y: 0 });
    const [keyboardScreenY, setKeyboardScreenY] = useState<null | number>(null);
    const layoutProgress = useSharedValue(0);
    const bubbleProgress = useSharedValue(0);

    const measureRoot = useCallback(() => {
        rootRef.current?.measureInWindow((_x, y, _width, height) => {
            setRootFrame({ height, y });
        });
    }, [rootRef]);

    useEffect(() => {
        const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
            measureRoot();
            setKeyboardScreenY(event.endCoordinates.screenY);
        });
        // Also fires on rotation/foldable posture changes, so the root frame
        // stays fresh whenever the bubble's anchor could have moved.
        const frameSubscription = Keyboard.addListener('keyboardDidChangeFrame', (event) => {
            measureRoot();
            setKeyboardScreenY(event.endCoordinates.screenY);
        });
        const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardScreenY(null);
        });

        return () => {
            showSubscription.remove();
            frameSubscription.remove();
            hideSubscription.remove();
        };
    }, [measureRoot]);

    useEffect(() => {
        if (visible) {
            measureRoot();
        }
    }, [measureRoot, visible]);

    useEffect(() => {
        if (!visible) return;
        const id = setTimeout(() => inputRef.current?.focus(), 80);
        return () => clearTimeout(id);
    }, [visible]);

    useEffect(() => {
        if (visible) {
            layoutProgress.value = withTiming(1, { duration: 200 });
            bubbleProgress.value = withSpring(1, {
                damping: 12,
                mass: 0.55,
                stiffness: 180,
            });
        } else {
            bubbleProgress.value = withTiming(0, { duration: 160 });
            layoutProgress.value = withTiming(0, { duration: 200 });
            inputRef.current?.blur();
            Keyboard.dismiss();
        }
    }, [bubbleProgress, layoutProgress, visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: interpolate(layoutProgress.value, [0, 0.5, 1], [0, 1, 1]),
        transform: [
            { translateY: interpolate(bubbleProgress.value, [0, 1], [32, 0]) },
            { scale: bubbleProgress.value },
        ],
        transformOrigin: ['65%', '100%', 0],
    }));

    const floatingTop = useMemo(() => {
        const fallbackTop = rootFrame.height - PLAYLIST_SEARCH_FLOATING_HEIGHT - spacing.lg;
        if (!keyboardScreenY) {
            return Math.max(spacing.md, fallbackTop);
        }
        return Math.max(
            spacing.md,
            keyboardScreenY - rootFrame.y - PLAYLIST_SEARCH_FLOATING_HEIGHT - spacing.md,
        );
    }, [keyboardScreenY, rootFrame.height, rootFrame.y]);

    return (
        <Reanimated.View
            pointerEvents={visible ? 'auto' : 'none'}
            style={[
                styles.playlistFloatingSearchWrapper,
                { top: floatingTop },
                animatedStyle,
            ]}
        >
            <View
                style={[
                    styles.inlineSearchBar,
                    styles.inlineSearchBarElevated,
                    styles.playlistFloatingSearchBar,
                ]}
            >
                <SearchGlyph color={colors.muted} />
                <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={onChangeQuery}
                    placeholder="Search this playlist"
                    placeholderTextColor={colors.muted}
                    ref={inputRef}
                    returnKeyType="search"
                    style={styles.inlineSearchInput}
                    value={query}
                />
                {query.length > 0 ? (
                    <Pressable
                        accessibilityLabel="Clear playlist search"
                        accessibilityRole="button"
                        onPress={() => onChangeQuery('')}
                        style={styles.inlineSearchIconButton}
                    >
                        <ClearGlyph color={colors.muted} />
                    </Pressable>
                ) : null}
            </View>
        </Reanimated.View>
    );
});
