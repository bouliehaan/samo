import { MINI_PLAYER_RADIUS } from '../theme/layout';
import { Extrapolation, interpolate } from 'react-native-reanimated';

/** Shared mini ↔ full player motion — one card sliding up over the app. */

export const PLAYER_OPEN_SPRING = { damping: 24, mass: 1, stiffness: 260 } as const;
export const PLAYER_CLOSE_SPRING = { damping: 28, mass: 1, stiffness: 300 } as const;

/** Top corners round while the card is mid-slide, squaring off as it docks full. */
export function shellTopRadius(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 1], [MINI_PLAYER_RADIUS, 0], Extrapolation.CLAMP);
}

export function tabBarSinkTranslateY(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 1], [0, 12], Extrapolation.CLAMP);
}

export function worldDimOpacity(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 1], [0, 0.35], Extrapolation.CLAMP);
}
