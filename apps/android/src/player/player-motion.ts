import { MINI_PLAYER_RADIUS } from '../theme/layout';
import { Extrapolation, interpolate } from 'react-native-reanimated';

/**
 * One rigid panel — the Sheikah Slate mental model.
 *
 * The shell grows and clips a full-size layout inside it. Artwork and controls
 * stay in normal flex positions; nothing flies or morphs in screen space.
 */

export const PLAYER_OPEN_SPRING = { damping: 17, mass: 1.05, stiffness: 175 } as const;
export const PLAYER_CLOSE_SPRING = { damping: 26, mass: 1.0, stiffness: 220 } as const;

export function shellOpacity(_progress: number): number {
    'worklet';
    return 1;
}

export function shellElevation(progress: number): number {
    'worklet';
    return interpolate(
        progress,
        [0, 0.06, 0.22, 0.55, 1],
        [0, 8, 22, 18, 14],
        Extrapolation.CLAMP,
    );
}

export function washLayerOpacity(progress: number): number {
    'worklet';
    return interpolate(progress, [0.14, 0.42, 1], [0, 0.55, 1], Extrapolation.CLAMP);
}

/** The expanding shell stays invisible at rest — MiniPlayer owns progress=0. */
export function shellRevealOpacity(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 0.035], [0, 1], Extrapolation.CLAMP);
}

/** Rounded dock at rest; corners square off as the panel reaches fullscreen. */
export function shellTopRadius(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 1], [MINI_PLAYER_RADIUS, 0], Extrapolation.CLAMP);
}

/** Full chrome lays out only once the shell has taken over from the mini. */
export function expandedPanelFlex(progress: number): number {
    'worklet';
    return progress > 0.035 ? 1 : 0;
}

export function tabBarSinkTranslateY(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 0.32], [0, 36], Extrapolation.CLAMP);
}

export function tabBarSinkScale(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 0.32], [1, 0.9], Extrapolation.CLAMP);
}

export function worldDimOpacity(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 0.38], [0, 0.45], Extrapolation.CLAMP);
}
