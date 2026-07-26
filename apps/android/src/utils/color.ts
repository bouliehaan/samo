// Frosted-glass backdrop palette for the full-screen player.
//
// The surface is a long, slow charcoal ramp lifted by a soft glass sheen and
// textured with fine frost grain (the dither overlay). The ramp's TINT is
// dynamic: `buildFrostedBackdropStops` re-derives the whole 18-stop ramp from
// a single seed color extracted from the current album artwork, keeping the
// exact lightness curve of the hand-tuned neutral ramp below — so every album
// gets its own cast of the SAME premium surface instead of a loud repaint.
// When no artwork color is available (radio, extraction failure, cold start)
// the neutral cool-charcoal ramp stands in. Transitions between ramps are the
// backdrop's job (it crossfades); this module is pure color math.

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const hexToRgb = (hex: string): [number, number, number] => {
    const raw = hex.replace('#', '');
    const full =
        raw.length === 3
            ? raw
                  .split('')
                  .map((char) => char + char)
                  .join('')
            : raw;
    const value = Number.parseInt(full, 16);
    if (Number.isNaN(value) || full.length !== 6) {
        return [18, 18, 20];
    }
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const rgbToHex = (r: number, g: number, b: number): string =>
    '#' +
    [r, g, b]
        .map((channel) =>
            Math.round(Math.min(255, Math.max(0, channel)))
                .toString(16)
                .padStart(2, '0'),
        )
        .join('');

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const lightness = (max + min) / 2;
    if (max === min) {
        return [0, 0, lightness];
    }
    const delta = max - min;
    const saturation =
        lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    let hue: number;
    if (max === rn) {
        hue = (gn - bn) / delta + (gn < bn ? 6 : 0);
    } else if (max === gn) {
        hue = (bn - rn) / delta + 2;
    } else {
        hue = (rn - gn) / delta + 4;
    }
    return [hue / 6, saturation, lightness];
};

const hueToChannel = (p: number, q: number, t: number): number => {
    let tn = t;
    if (tn < 0) tn += 1;
    if (tn > 1) tn -= 1;
    if (tn < 1 / 6) return p + (q - p) * 6 * tn;
    if (tn < 1 / 2) return q;
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
    return p;
};

const hslToHex = (h: number, s: number, l: number): string => {
    if (s === 0) {
        const grey = l * 255;
        return rgbToHex(grey, grey, grey);
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return rgbToHex(
        hueToChannel(p, q, h + 1 / 3) * 255,
        hueToChannel(p, q, h) * 255,
        hueToChannel(p, q, h - 1 / 3) * 255,
    );
};

const FROSTED_STOP_COUNT = 18;
// Lightness curve of the original hand-tuned ramp: a slightly brighter crown
// that settles fast, then a long slow tail into near-black — kept so the
// generated ramps read as the same "physical panel" the frozen one did.
const FROSTED_TOP_LIGHTNESS = 0.19;
const FROSTED_BOTTOM_LIGHTNESS = 0.052;

/**
 * Build the full 18-stop backdrop ramp from one seed color. Saturation is
 * capped so loud artwork stays a tasteful cast (never a neon wall), and the
 * ramp desaturates as it darkens — dark paint loses chroma like real paint.
 */
export const buildFrostedBackdropStops = (seedHex: string): string[] => {
    const [h, rawSaturation] = rgbToHsl(...hexToRgb(seedHex));
    const saturation = clamp01(Math.min(rawSaturation, 0.52) * (0.65 + rawSaturation * 0.35));
    const stops: string[] = [];
    for (let index = 0; index < FROSTED_STOP_COUNT; index += 1) {
        const t = index / (FROSTED_STOP_COUNT - 1);
        // Ease-out: most of the tonal travel happens in the top half, matching
        // the original ramp's fast settle + slow tail.
        const eased = 1 - Math.pow(1 - t, 1.6);
        const lightness =
            FROSTED_TOP_LIGHTNESS +
            (FROSTED_BOTTOM_LIGHTNESS - FROSTED_TOP_LIGHTNESS) * eased;
        stops.push(hslToHex(h, saturation * (1 - eased * 0.45), lightness));
    }
    return stops;
};

// Neutral cool-charcoal ramp — the resting/fallback surface (no artwork
// color: radio fallback, extraction failure, cold start). Same curve as the
// generated ramps, seeded with the app's cool monochrome cast.
export const FROSTED_BACKDROP_STOPS: readonly string[] =
    buildFrostedBackdropStops('#3a414c');

// Soft diagonal highlight — the light "catching" the glass. A cool off-white
// (a whisper of the silver hallmark) sweeps in from the top-left and falls off
// fast, so only the upper corner lifts and the rest stays clean.
export const FROSTED_GLASS_SHEEN: readonly string[] = [
    'rgba(214, 224, 236, 0.07)',
    'rgba(214, 224, 236, 0.018)',
    'rgba(214, 224, 236, 0)',
    'rgba(214, 224, 236, 0)',
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
