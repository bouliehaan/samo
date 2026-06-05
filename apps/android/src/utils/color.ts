// Frozen "frosted-glass" backdrop palette for the full-screen player.
//
// The player used to extract a dominant color from each album's artwork
// (react-native-image-colors) and repaint the backdrop per track. That made
// the surface flicker between tones on every skip and leaned on a fragile
// native extraction pass that could fail and snap back to a fallback. We
// dropped it in favour of ONE consistent premium surface: a warm charcoal
// wash, lifted by a soft glass sheen and textured with fine frost grain (the
// dither overlay). It never changes with the track, so the player always
// reads as the same gilded panel.
//
// All four arrays below are presentational and intentionally easy to tweak
// on-device — adjust the warmth/lightness here and the whole player follows.

// Warm charcoal base ramp (top -> bottom). Hand-tuned so the long, slow
// gradient stays in one warm family without muddying into grey; the dither
// overlay then dithers away the 8-bit banding a ramp this gradual produces.
export const FROSTED_BACKDROP_STOPS: readonly string[] = [
    '#2b241b', '#292219', '#272018', '#251e17', '#231d16', '#211b15',
    '#1f1a14', '#1d1813', '#1b1712', '#191511', '#171410', '#15130f',
    '#14120e', '#13110e', '#12100d', '#110f0d', '#100e0c', '#0f0d0c',
];

// Soft diagonal highlight — the light "catching" the glass. A warm off-white
// (a whisper of the gold hallmark) sweeps in from the top-left and falls off
// fast, so only the upper corner lifts and the rest stays clean.
export const FROSTED_GLASS_SHEEN: readonly string[] = [
    'rgba(216, 200, 170, 0.07)',
    'rgba(216, 200, 170, 0.018)',
    'rgba(216, 200, 170, 0)',
    'rgba(216, 200, 170, 0)',
];
export const FROSTED_GLASS_SHEEN_LOCATIONS: readonly number[] = [0, 0.16, 0.42, 1];

// Gentle bottom vignette for depth — grounds the panel so the transport
// controls sit on a slightly darker, settled base.
export const FROSTED_GLASS_DEPTH: readonly string[] = [
    'rgba(0, 0, 0, 0)',
    'rgba(0, 0, 0, 0.16)',
    'rgba(0, 0, 0, 0.34)',
];
export const FROSTED_GLASS_DEPTH_LOCATIONS: readonly number[] = [0, 0.62, 1];
