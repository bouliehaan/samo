import {
    FULL_PLAYER_ARTWORK_SIZE,
    FULL_PLAYER_HERO_LEFT,
    FULL_PLAYER_HERO_TOP,
    MINI_PLAYER_ARTWORK_LEFT,
    MINI_PLAYER_ARTWORK_RADIUS,
    MINI_PLAYER_ARTWORK_SIZE,
    MINI_PLAYER_VERTICAL_PADDING,
} from '../theme/layout';
import { Extrapolation, interpolate } from 'react-native-reanimated';

/**
 * Physical player motion — stacked slabs revealed by an expanding frame.
 * No floating lift or rubber-band scale on the shell.
 */
export const PLAYER_OPEN_SPRING = { damping: 22, mass: 1.14, stiffness: 172 } as const;
export const PLAYER_CLOSE_SPRING = { damping: 26, mass: 1.08, stiffness: 198 } as const;

export function shellMaterialOpacity(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 0.06], [0, 1], Extrapolation.CLAMP);
}

export function shellElevation(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 0.22, 1], [0, 14, 22], Extrapolation.CLAMP);
}

export function miniHandoffOpacity(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 0.13, 0.24], [1, 1, 0], Extrapolation.CLAMP);
}

/** Bottom mini "lid" stone — holds until the frame has grown past it. */
export function collapsedLidOpacity(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 0.42, 0.62], [1, 1, 0], Extrapolation.CLAMP);
}

/** Color wash slab rises into place under the artwork. */
export function washLayerOpacity(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 0.14, 0.5, 1], [0, 0.4, 0.9, 1], Extrapolation.CLAMP);
}

export function washLayerTranslateY(progress: number): number {
    'worklet';
    return interpolate(progress, [0.1, 0.55], [56, 0], Extrapolation.CLAMP);
}

/** Carving slab lags the frame — the hole grows before the relief moves. */
export function artworkSlabProgress(progress: number): number {
    'worklet';
    return interpolate(
        progress,
        [0, 0.18, 0.72, 1],
        [0, 0.05, 0.92, 1],
        Extrapolation.CLAMP,
    );
}

export function morphArtworkOpacity(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 0.05, 0.88, 1], [0, 1, 1, 0], Extrapolation.CLAMP);
}

export function miniStaticArtworkOpacity(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 0.06], [1, 0], Extrapolation.CLAMP);
}

export function staticHeroArtworkOpacity(progress: number): number {
    'worklet';
    return interpolate(progress, [0.84, 1], [0, 1], Extrapolation.CLAMP);
}

export function slabArtworkLeft(progress: number): number {
    'worklet';
    const t = artworkSlabProgress(progress);
    return interpolate(t, [0, 1], [MINI_PLAYER_ARTWORK_LEFT, FULL_PLAYER_HERO_LEFT]);
}

export function slabArtworkTop(progress: number): number {
    'worklet';
    const t = artworkSlabProgress(progress);
    return interpolate(t, [0, 1], [MINI_PLAYER_VERTICAL_PADDING, FULL_PLAYER_HERO_TOP]);
}

/** Stays mini-sized until the frame is tall enough, then the relief grows in place. */
export function slabArtworkSize(progress: number): number {
    'worklet';
    const t = artworkSlabProgress(progress);
    return interpolate(
        t,
        [0, 0.55, 1],
        [MINI_PLAYER_ARTWORK_SIZE, MINI_PLAYER_ARTWORK_SIZE, FULL_PLAYER_ARTWORK_SIZE],
    );
}

export function slabArtworkBorderRadius(progress: number): number {
    'worklet';
    const t = artworkSlabProgress(progress);
    return interpolate(t, [0, 0.55, 1], [MINI_PLAYER_ARTWORK_RADIUS, 10, 4]);
}

export function slabArtworkRimOpacity(progress: number): number {
    'worklet';
    return interpolate(progress, [0.08, 0.45, 0.9], [0.55, 0.35, 0], Extrapolation.CLAMP);
}

/** Control slab slides up into the carved cavity — no scale. */
export function contentRevealProgress(progress: number): number {
    'worklet';
    return interpolate(
        progress,
        [0, 0.28, 0.58, 0.9, 1],
        [0, 0.04, 0.28, 0.78, 1],
        Extrapolation.CLAMP,
    );
}

export function contentRevealOpacity(reveal: number): number {
    'worklet';
    return interpolate(reveal, [0, 0.45, 1], [0, 0.94, 1], Extrapolation.CLAMP);
}

export function contentRevealTranslateY(
    reveal: number,
    paddingCompensationY: number,
): number {
    'worklet';
    return (
        interpolate(reveal, [0, 1], [72, 0], Extrapolation.CLAMP) + paddingCompensationY
    );
}

export function tabBarSinkOpacity(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 0.2], [1, 0], Extrapolation.CLAMP);
}

export function tabBarSinkTranslateY(progress: number): number {
    'worklet';
    return interpolate(progress, [0, 0.2], [0, 18], Extrapolation.CLAMP);
}
