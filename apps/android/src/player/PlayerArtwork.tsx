import { type ComponentProps, memo, useEffect } from 'react';
import { type LayoutRectangle, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Reanimated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import { ArtworkImage } from '../components/ArtworkImage';
import { SCREEN_WIDTH } from '../theme/layout';

const IMMERSIVE_BASE = '#101114';

/** One image changes its frame; the listening controls stay anchored in place. */
export const PlayerArtwork = memo(({
    frame,
    immersive,
    reducedMotion,
    ...artwork
}: Omit<ComponentProps<typeof ArtworkImage>, 'style'> & {
    frame: LayoutRectangle;
    immersive: boolean;
    reducedMotion: boolean;
}) => {
    const progress = useSharedValue(immersive ? 1 : 0);
    useEffect(() => {
        progress.value = withTiming(immersive ? 1 : 0, {
            duration: reducedMotion ? 0 : 360,
            easing: Easing.inOut(Easing.cubic),
        });
    }, [immersive, reducedMotion, progress]);

    const imageStyle = useAnimatedStyle(() => {
        const size = Math.max(0, Math.min(frame.width, frame.height - 24));
        return {
            borderRadius: interpolate(progress.value, [0, 1], [16, 0]),
            height: interpolate(progress.value, [0, 1], [size, frame.y + frame.height + 80]),
            left: interpolate(progress.value, [0, 1], [frame.x + (frame.width - size) / 2, 0]),
            top: interpolate(progress.value, [0, 1], [frame.y + (frame.height - size) / 2, 0]),
            width: interpolate(progress.value, [0, 1], [size, SCREEN_WIDTH]),
        };
    }, [frame]);
    const immersiveStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

    if (frame.height <= 0) return null;
    return (
        <>
            <Reanimated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { backgroundColor: IMMERSIVE_BASE }, immersiveStyle]}
            />
            <Reanimated.View pointerEvents="none" style={[artworkStyles.frame, imageStyle]}>
                <ArtworkImage {...artwork} decodeFormat="argb" style={artworkStyles.image} />
                <Reanimated.View style={[StyleSheet.absoluteFill, immersiveStyle]}>
                    <LinearGradient
                        colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0)', 'rgba(16,17,20,0)', IMMERSIVE_BASE]}
                        locations={[0, 0.22, 0.52, 1]}
                        style={StyleSheet.absoluteFill}
                    />
                </Reanimated.View>
            </Reanimated.View>
        </>
    );
});

const artworkStyles = StyleSheet.create({
    frame: { overflow: 'hidden', position: 'absolute' },
    image: { height: '100%', width: '100%' },
});
