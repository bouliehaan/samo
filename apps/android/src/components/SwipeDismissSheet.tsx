import { type ReactNode, useMemo, useRef } from 'react';
import { Animated, PanResponder, type ViewStyle } from 'react-native';

import { SCREEN_HEIGHT } from '../theme/layout';

export const SwipeDismissSheet = ({
    children,
    onDismiss,
    style,
}: {
    children: ReactNode;
    onDismiss: () => void;
    style?: ViewStyle | ViewStyle[];
}) => {
    const translateY = useRef(new Animated.Value(0)).current;
    const responder = useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponder: (_event, gs) =>
                    gs.dy > 6 && gs.dy > Math.abs(gs.dx) * 1.4,
                onPanResponderGrant: () => {
                    translateY.stopAnimation();
                },
                onPanResponderMove: (_event, gs) => {
                    if (gs.dy > 0) translateY.setValue(gs.dy);
                },
                onPanResponderRelease: (_event, gs) => {
                    if (gs.dy > 90 || (gs.vy > 0.45 && gs.dy > 24)) {
                        Animated.timing(translateY, {
                            duration: 180,
                            toValue: SCREEN_HEIGHT,
                            useNativeDriver: true,
                        }).start(() => {
                            translateY.setValue(0);
                            onDismiss();
                        });
                        return;
                    }
                    Animated.spring(translateY, {
                        friction: 9,
                        tension: 80,
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                },
                onPanResponderTerminationRequest: () => false,
            }),
        [onDismiss, translateY],
    );

    return (
        <Animated.View
            {...responder.panHandlers}
            style={[style, { transform: [{ translateY }] }]}
        >
            {children}
        </Animated.View>
    );
};
