import React, { useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { colors, spacing } from '../theme/tokens';
import { styles } from '../theme/styles';

/**
 * A primitive skeleton block that fades in and out to indicate loading.
 */
export const SkeletonBlock = ({
    style,
    borderRadius = 6,
}: {
    style?: StyleProp<ViewStyle>;
    borderRadius?: number;
}) => {
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.65, { duration: 600 }),
                withTiming(0.3, { duration: 600 })
            ),
            -1,
            true
        );
    }, [opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                {
                    backgroundColor: colors.surface,
                    borderRadius,
                },
                style,
                animatedStyle,
            ]}
        />
    );
};

/**
 * A full track row skeleton matching the layout of `renderTrackRow`.
 */
export const SkeletonTrackRow = () => {
    return (
        <View style={styles.trackRow}>
            {/* Artwork Block */}
            <SkeletonBlock style={{ width: 44, height: 44 }} />
            
            {/* Text Blocks */}
            <View style={styles.trackText}>
                {/* Title */}
                <SkeletonBlock style={{ width: '60%', height: 16, marginBottom: 6 }} borderRadius={4} />
                {/* Subtitle */}
                <SkeletonBlock style={{ width: '40%', height: 12 }} borderRadius={3} />
            </View>

            {/* Time / Actions block */}
            <SkeletonBlock style={{ width: 24, height: 12 }} borderRadius={3} />
        </View>
    );
};

/**
 * A square tile skeleton matching the layout of `ViewAllScreen` tiles.
 */
export const SkeletonTile = () => {
    return (
        <View style={styles.viewAllTilePlaceholder}>
            {/* Main square image */}
            <SkeletonBlock style={{ width: '100%', aspectRatio: 1, marginBottom: 8 }} borderRadius={10} />
            {/* Text lines */}
            <SkeletonBlock style={{ width: '80%', height: 14, marginBottom: 4 }} borderRadius={3} />
            <SkeletonBlock style={{ width: '50%', height: 12 }} borderRadius={3} />
        </View>
    );
};
