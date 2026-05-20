import { Image as ExpoImage } from 'expo-image';
import { memo, useCallback, useEffect, useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import {
    Gesture,
    GestureDetector,
} from 'react-native-gesture-handler';
import Reanimated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

import { ClearGlyph } from './Glyphs';
import { OPEN_SPRING, SCREEN_WIDTH } from '../theme/layout';
import { styles } from '../theme/styles';
import { colors, spacing } from '../theme/tokens';

const ARTWORK_ZOOM_MAX_SCALE = 4;
const ARTWORK_ZOOM_DOUBLE_TAP_SCALE = 2.35;

export const ArtworkZoomModal = memo(({
    onClose,
    title,
    uri,
    visible,
}: {
    onClose: () => void;
    title: string;
    uri?: string;
    visible: boolean;
}) => {
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const resetZoom = useCallback(() => {
        scale.value = withSpring(1, OPEN_SPRING);
        savedScale.value = 1;
        translateX.value = withSpring(0, OPEN_SPRING);
        translateY.value = withSpring(0, OPEN_SPRING);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
    }, [savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY]);

    useEffect(() => {
        if (visible) {
            resetZoom();
        }
    }, [resetZoom, uri, visible]);

    const close = useCallback(() => {
        resetZoom();
        onClose();
    }, [onClose, resetZoom]);

    const pinchGesture = useMemo(
        () =>
            Gesture.Pinch()
                .onStart(() => {
                    'worklet';
                    savedScale.value = scale.value;
                })
                .onUpdate((event) => {
                    'worklet';
                    const next = savedScale.value * event.scale;
                    scale.value = Math.min(
                        ARTWORK_ZOOM_MAX_SCALE,
                        Math.max(1, next),
                    );
                })
                .onEnd(() => {
                    'worklet';
                    if (scale.value <= 1.04) {
                        scale.value = withSpring(1, OPEN_SPRING);
                        translateX.value = withSpring(0, OPEN_SPRING);
                        translateY.value = withSpring(0, OPEN_SPRING);
                        savedScale.value = 1;
                        savedTranslateX.value = 0;
                        savedTranslateY.value = 0;
                        return;
                    }
                    savedScale.value = scale.value;
                }),
        [savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY],
    );

    const panGesture = useMemo(
        () =>
            Gesture.Pan()
                .onStart(() => {
                    'worklet';
                    savedTranslateX.value = translateX.value;
                    savedTranslateY.value = translateY.value;
                })
                .onUpdate((event) => {
                    'worklet';
                    if (scale.value <= 1.01) return;
                    const maxTravel = ((SCREEN_WIDTH - spacing.lg * 2) * (scale.value - 1)) / 2;
                    translateX.value = Math.min(
                        maxTravel,
                        Math.max(-maxTravel, savedTranslateX.value + event.translationX),
                    );
                    translateY.value = Math.min(
                        maxTravel,
                        Math.max(-maxTravel, savedTranslateY.value + event.translationY),
                    );
                })
                .onEnd(() => {
                    'worklet';
                    savedTranslateX.value = translateX.value;
                    savedTranslateY.value = translateY.value;
                }),
        [savedTranslateX, savedTranslateY, scale, translateX, translateY],
    );

    const doubleTapGesture = useMemo(
        () =>
            Gesture.Tap()
                .numberOfTaps(2)
                .onEnd(() => {
                    'worklet';
                    if (scale.value > 1.05) {
                        scale.value = withSpring(1, OPEN_SPRING);
                        translateX.value = withSpring(0, OPEN_SPRING);
                        translateY.value = withSpring(0, OPEN_SPRING);
                        savedScale.value = 1;
                        savedTranslateX.value = 0;
                        savedTranslateY.value = 0;
                        return;
                    }
                    scale.value = withSpring(ARTWORK_ZOOM_DOUBLE_TAP_SCALE, OPEN_SPRING);
                    savedScale.value = ARTWORK_ZOOM_DOUBLE_TAP_SCALE;
                }),
        [savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY],
    );

    const zoomGesture = useMemo(
        () => Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture),
        [doubleTapGesture, panGesture, pinchGesture],
    );

    const zoomStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    if (!uri) {
        return null;
    }

    return (
        <Modal animationType="fade" onRequestClose={close} transparent visible={visible}>
            <View style={styles.artworkZoomModal}>
                <Pressable
                    accessibilityLabel="Close artwork"
                    onPress={close}
                    style={StyleSheet.absoluteFillObject}
                />
                <GestureDetector gesture={zoomGesture}>
                    <Reanimated.View style={[styles.artworkZoomImageFrame, zoomStyle]}>
                        <ExpoImage
                            allowDownscaling={false}
                            cachePolicy="memory-disk"
                            contentFit="contain"
                            priority="high"
                            recyclingKey={`zoom:${uri}`}
                            source={{ uri }}
                            style={styles.artworkZoomImage}
                        />
                    </Reanimated.View>
                </GestureDetector>
                <Pressable
                    accessibilityLabel={`Close ${title} artwork`}
                    accessibilityRole="button"
                    onPress={close}
                    style={styles.artworkZoomCloseButton}
                >
                    <ClearGlyph color={colors.text} />
                </Pressable>
            </View>
        </Modal>
    );
});

ArtworkZoomModal.displayName = 'ArtworkZoomModal';
