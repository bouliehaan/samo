import { MINI_PLAYER_RADIUS } from '../theme/layout';
import { Extrapolation, interpolate } from 'react-native-reanimated';

/** Shared mini ↔ full player motion — one card sliding up over the app. */

export const PLAYER_OPEN_SPRING = { damping: 24, mass: 1, stiffness: 260 } as const;
export const PLAYER_CLOSE_SPRING = { damping: 28, mass: 1, stiffness: 300 } as const;

export function shellElevation(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 1], [0, 12], Extrapolation.CLAMP);
}

export function washLayerOpacity(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 0.35, 1], [0, 0.4, 1], Extrapolation.CLAMP);
}

/** Fullscreen shell visible only while the card is opening (mini owns progress=0). */
export function shellRevealOpacity(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 0.08], [0, 1], Extrapolation.CLAMP);
}

export function shellTopRadius(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 1], [MINI_PLAYER_RADIUS, 0], Extrapolation.CLAMP);
}

/** Full layout is always mounted inside the shell; the shell clip does the reveal. */
export function expandedPanelFlex(progress: number): number {
    'worklet';
    return progress > 0 ? 1 : 0;
}

export function tabBarSinkTranslateY(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 1], [0, 12], Extrapolation.CLAMP);
}

export function worldDimOpacity(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 1], [0, 0.35], Extrapolation.CLAMP);
}
