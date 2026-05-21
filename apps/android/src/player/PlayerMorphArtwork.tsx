import { Image as ExpoImage } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, {
    type SharedValue,
    useAnimatedStyle,
} from 'react-native-reanimated';

import { colors } from '../theme/tokens';
import {
    morphArtworkOpacity,
    slabArtworkBorderRadius,
    slabArtworkLeft,
    slabArtworkRimOpacity,
    slabArtworkSize,
    slabArtworkTop,
} from './player-motion';

/** Album relief slab — lives inside the expanding frame, not on a floating overlay. */
export const PlayerMorphArtwork = memo(({
    artworkUrl,
    letter,
    playerProgress,
}: {
    artworkUrl: string | undefined;
    letter: string;
    playerProgress: SharedValue<number>;
}) => {
    const slabStyle = useAnimatedStyle(() => {
        const size = slabArtworkSize(playerProgress.value);
        return {
            borderRadius: slabArtworkBorderRadius(playerProgress.value),
            height: size,
            left: slabArtworkLeft(playerProgress.value),
            opacity: morphArtworkOpacity(playerProgress.value),
            top: slabArtworkTop(playerProgress.value),
            width: size,
        };
    });
    const rimStyle = useAnimatedStyle(() => ({
        borderRadius: slabArtworkBorderRadius(playerProgress.value),
        opacity: slabArtworkRimOpacity(playerProgress.value),
    }));

    return (
        <Reanimated.View pointerEvents="none" style={[styles.slab, slabStyle]}>
            {artworkUrl ? (
                <ExpoImage
                    allowDownscaling={false}
                    cachePolicy="memory-disk"
                    contentFit="cover"
                    priority="high"
                    recyclingKey={artworkUrl}
                    source={{ uri: artworkUrl }}
                    style={styles.slabImage}
                    transition={0}
                />
            ) : (
                <View style={styles.slabFallback}>
                    {letter ? (
                        <Text style={styles.slabFallbackLetter}>{letter}</Text>
                    ) : null}
                </View>
            )}
            <Reanimated.View pointerEvents="none" style={[styles.slabRim, rimStyle]} />
        </Reanimated.View>
    );
});

PlayerMorphArtwork.displayName = 'PlayerMorphArtwork';

const styles = StyleSheet.create({
    slab: {
        backgroundColor: '#141414',
        overflow: 'hidden',
        position: 'absolute',
        zIndex: 5,
    },
    slabFallback: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        flex: 1,
        justifyContent: 'center',
    },
    slabFallbackLetter: {
        color: colors.text,
        fontSize: 23,
        fontWeight: '800',
    },
    slabImage: {
        height: '100%',
        width: '100%',
    },
    slabRim: {
        ...StyleSheet.absoluteFillObject,
        borderColor: 'rgba(0, 0, 0, 0.42)',
        borderWidth: 1,
    },
});
