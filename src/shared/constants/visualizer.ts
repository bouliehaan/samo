// Shared between the mpv spectrum tap in the main process, which produces the
// band levels, and the renderer that draws them. These two must agree on the
// scale or the curve sits at the wrong height — which is exactly what happened
// when the renderer scaled mpv's band RMS using audioMotion's `minDecibels`.

/** Bands mpv reports per frame. Capped by `acrossover`, which allows 17 outputs. */
export const VISUALIZER_BAND_COUNT = 17;

/**
 * Levels at or below this read as silence. The tap clamps to it, so the
 * renderer must treat it as the bottom of the scale — otherwise silence draws
 * partway up the panel and the whole curve floats.
 */
export const VISUALIZER_FLOOR_DB = -70;

/**
 * Top of the drawn range.
 *
 * These are per-band RMS levels, not FFT bin magnitudes, so audioMotion's
 * -25dB ceiling is the wrong instrument: measured band RMS peaks around -20dB
 * for a tone concentrated in one band and sits near -34dB for pink noise, so a
 * -25dB ceiling clipped ordinary music flat against the top edge.
 */
export const VISUALIZER_CEILING_DB = -12;
