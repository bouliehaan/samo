import type { ImageColorsResult } from 'react-native-image-colors/build/types';

export const darkenColor = (hex: string, factor: number): string => {
    const clean = hex.replace('#', '').replace(/^(..)(..)(..).*/, '$1$2$3');
    if (clean.length !== 6) return '#000000';
    const r = Math.round(parseInt(clean.slice(0, 2), 16) * factor);
    const g = Math.round(parseInt(clean.slice(2, 4), 16) * factor);
    const b = Math.round(parseInt(clean.slice(4, 6), 16) * factor);
    return `rgb(${r}, ${g}, ${b})`;
};

const parseHex = (hex: string): [number, number, number] | null => {
    const match = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
    if (!match) return null;
    const value = parseInt(match[1], 16);
    return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
};

const srgbChannelToLinear = (c: number): number => {
    const n = c / 255;
    return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
};

const linearChannelToSrgb = (c: number): number => {
    const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(v * 255)));
};

const rgbToOklab = (
    r: number,
    g: number,
    b: number,
): [number, number, number] => {
    const lr = srgbChannelToLinear(r);
    const lg = srgbChannelToLinear(g);
    const lb = srgbChannelToLinear(b);
    const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
    const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
    const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;
    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);
    return [
        0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
    ];
};

const oklabToHex = (L: number, a: number, b: number): string => {
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;
    const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    const r = linearChannelToSrgb(lr);
    const g = linearChannelToSrgb(lg);
    const bch = linearChannelToSrgb(lb);
    const out = (r << 16) | (g << 8) | bch;
    return `#${out.toString(16).padStart(6, '0')}`;
};

export const pickAlbumEssenceColor = (result: ImageColorsResult): null | string => {
    const candidates: string[] = [];
    const push = (hex: null | string | undefined): void => {
        if (typeof hex === 'string' && /^#?[0-9a-fA-F]{6}$/.test(hex.trim())) {
            candidates.push(hex.trim().startsWith('#') ? hex.trim() : `#${hex.trim()}`);
        }
    };

    if (result.platform === 'android') {
        push(result.dominant);
        push(result.vibrant);
        push(result.darkVibrant);
        push(result.lightVibrant);
        push(result.muted);
        push(result.darkMuted);
        push(result.lightMuted);
        push(result.average);
    } else if (result.platform === 'ios') {
        push(result.background);
        push(result.primary);
        push(result.secondary);
        push(result.detail);
    } else {
        push(result.dominant);
        push(result.vibrant);
        push(result.muted);
        push(result.darkVibrant);
        push(result.darkMuted);
    }

    interface LabCandidate {
        L: number;
        a: number;
        b: number;
        chroma: number;
        hex: string;
    }

    const usable: LabCandidate[] = [];
    for (const hex of candidates) {
        const rgb = parseHex(hex);
        if (!rgb) continue;
        const [L, a, b] = rgbToOklab(rgb[0], rgb[1], rgb[2]);
        const chroma = Math.sqrt(a * a + b * b);
        if (L < 0.06 || L > 0.96) continue;
        if (chroma < 0.012) continue;
        usable.push({ L, a, b, chroma, hex });
    }

    if (usable.length === 0) {
        return candidates[0] ?? null;
    }

    const dominant = usable[0];
    const minDistance = 0.14;
    const minAccentChroma = 0.06;
    let bestAccent: LabCandidate | null = null;
    let bestScore = 0;

    for (let i = 1; i < usable.length; i++) {
        const c = usable[i];
        const dL = c.L - dominant.L;
        const da = c.a - dominant.a;
        const db = c.b - dominant.b;
        const distance = Math.sqrt(dL * dL + da * da + db * db);
        if (distance < minDistance) continue;
        if (c.chroma < minAccentChroma) continue;
        const score = c.chroma * 1.4 + distance;
        if (score > bestScore) {
            bestScore = score;
            bestAccent = c;
        }
    }

    return (bestAccent ?? dominant).hex;
};

export const buildBackdropStops = (essence: null | string): readonly string[] => {
    const fallback: readonly string[] = [
        '#2b241b', '#292219', '#272018', '#251e17', '#231d16', '#211b15',
        '#1f1a14', '#1d1813', '#1b1712', '#191511', '#171410', '#15130f',
        '#14120e', '#13110e', '#12100d', '#110f0d', '#100e0c', '#0f0d0c',
    ];
    if (!essence) return fallback;
    const rgb = parseHex(essence);
    if (!rgb) return fallback;
    const [L0, a, b] = rgbToOklab(rgb[0], rgb[1], rgb[2]);
    const chroma = Math.sqrt(a * a + b * b);
    const chromaBoost = chroma < 0.07 ? 1.34 : chroma < 0.12 ? 1.18 : 1.06;
    const topL = Math.max(0.36, Math.min(0.64, L0 + 0.08));
    const midL = Math.max(0.25, Math.min(0.42, L0 * 0.72));
    const bottomL = Math.max(0.17, Math.min(0.30, L0 * 0.5));
    const stopCount = 64;
    const stops: string[] = [];
    for (let i = 0; i < stopCount; i++) {
        const t = i / (stopCount - 1);
        const eased = t * t * (3 - 2 * t);
        const L =
            t < 0.42
                ? topL + (midL - topL) * (t / 0.42)
                : midL + (bottomL - midL) * ((t - 0.42) / 0.58);
        const cScale = chromaBoost * (1 - eased * 0.24);
        stops.push(oklabToHex(L, a * cScale, b * cScale));
    }
    return stops;
};
