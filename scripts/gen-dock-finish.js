// Generate the pre-dithered "glass finish" overlays for the bottom dock
// (BottomChromeBackdrop): a warm gold breath + warm-ivory edge sheen + film
// grain, baked into one RGBA PNG per dock mode.
//
// Why baked instead of live LinearGradients
// -----------------------------------------
// The dock's washes are ultra-low-alpha ramps (peak 0.055–0.10) stretched
// across the whole pane. An 8-bit framebuffer only has ~14–26 discrete codes
// for ramps that shallow, so the GPU renders them as flat bands with hard
// 1-code step edges. Worse, the original steel wash faded OUT left-to-right
// while the gold faded IN, and where the composite crossed NEUTRAL GRAY
// (~70–75% of the pane width) R, G and B shared the same fractional part —
// all three channels stepped down at the SAME pixel column. That coordinated 1-code
// luminance cliff is a visible vertical line on an OLED near black (the
// "~75% line"). Paint.DITHER_FLAG (patched into react-native-linear-gradient)
// is a no-op on modern hardware-accelerated Android, and the 5%-opacity
// grain overlay delivers only ~±0.45 code — an order of magnitude too weak
// to break a coherent edge. No live-gradient geometry can fix this; the
// quantization has to be noise-shaped at authoring time.
//
// Strategy
// --------
// Compose the washes + film grain in float (straight math, no 8-bit
// intermediates), then quantize with TWO sub-perceptual dithers: ±0.5-code
// noise on alpha (randomizes the background-transmission rounding) and a
// shared ±0.5-code luma offset on the premul targets (randomizes the
// decode-premultiply rounding of the pane's own emission), with the straight
// color re-solved against the chosen alpha so the delivered contribution
// stays mean-exact. Android premultiplies on decode, which rounds those
// jittered products to spatially-noisy integer codes — proper dithering,
// living in the pixels, independent of anything Skia does and independent
// of how strong the VISIBLE film grain is tuned.
//
// The washes span corner-to-corner (0,0 → 1,1) of each pane, so stretching
// the PNG over a different device width is mathematically identical to
// re-running a corner-to-corner gradient on that pane.
//
// Outputs (1080 wide = 360dp @3x, the LG V600 target; other densities
// stretch, which is fine for noise + diagonal washes). One PNG per chrome
// pane geometry — the bottom dock's two modes plus the Home top bar:
//   apps/android/assets/chrome-finish-mini.png  1080x504 (tab bar + mini, 168dp)
//   apps/android/assets/chrome-finish-bare.png  1080x258 (tab bar only, 86dp)
//   apps/android/assets/chrome-finish-top.png   1080x276 (Home top bar, 92dp)

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const WIDTH = 1080;
const PANES = [
    { file: 'chrome-finish-mini.png', height: 504 }, // (86 + 82)dp * 3
    { file: 'chrome-finish-bare.png', height: 258 }, // 86dp * 3
    { file: 'chrome-finish-top.png', height: 276 }, // TOP_CHROME_HEIGHT 92dp * 3
];

// Keep these in lockstep with the recipe documented in BottomChromeBackdrop.
// BLACK GLASS pass (2026-07-03): the steel wash is GONE — a cool blue-grey
// lift is exactly the cast Jacob vetoed on near-black lacquer. What remains
// is a faint warm breath (gold, bottom-right) and a warm-ivory edge light
// (tungsten, not studio-white) — felt, not seen.
const GOLD = { a: 0.04, b: 138, g: 192, r: 212 }; // alpha 0 -> 0.04 along t
// Sheen: warm ivory 0.022 @t=0, 0.006 @t=0.35, 0 @t=1 (piecewise linear).
const SHEEN = { b: 236, g: 248, r: 255 };
const SHEEN_HEAD = 0.022;
const SHEEN_KNEE = 0.006;
const SHEEN_KNEE_T = 0.35;
// FILM GRAIN (the 80's-home-movie / quality-60's-print ask): visible silver
// halide texture, not digital static. Structure: a faint warm FOG floor —
// the lifted black of projected film base, and the emission the grain
// modulates — plus ZERO-MEAN signed grain added straight to the composited
// premul. The old approach (mid-grey texture at N% opacity) is banned: its
// mean is a flat grey veil (+19 codes at 15% — greyer, LESS translucent),
// the exact cast this pass removes. Grain must redistribute light, not add
// it. Two octaves: fine 1dp cells (the halide) under a coarser clump octave
// (grains cluster on real film). Neutral luma only; color noise reads VHS.
const FILM_FOG = { a: 0.035, b: 118, g: 124, r: 128 }; // warm-neutral base fog
// Pure-taste knob, no floor: banding safety does NOT ride on the grain —
// the quantizer below carries its own sub-perceptual luma dither. Delivered
// film texture sd ≈ source sd (~4.5 after octave mix) × gain. History:
// 0.35 read as "a glitch" on device, 0.18 still "way too much", 0.06 still
// a notch loud — the spec is SUBTLE, a whisper of halide you only resolve
// when you look for it.
const GRAIN_GAIN = 0.03;
// Fine octave: 3 physical px per grain cell @3x (1dp — same cell size the
// old repeat-tiled overlay had).
const GRAIN_SCALE = 3;
// Clump octave: coarser + weighted under the fine grain, sampled from an
// offset region of the same texture so the octaves decorrelate. Tileable
// source, so its mid-pane wrap is seamless. Keep the weight modest: at high
// contrast the 7px clusters are exactly what reads as "glitch" instead of
// halide.
const GRAIN_CLUMP_SCALE = 7;
const GRAIN_CLUMP_WEIGHT = 0.4;
const GRAIN_CLUMP_OFFSET_X = 97;
const GRAIN_CLUMP_OFFSET_Y = 53;

const mulberry32 = (seed) => {
    let a = seed | 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const grainPng = PNG.sync.read(
    fs.readFileSync(path.resolve(__dirname, '../apps/android/assets/dither.png')),
);

const noiseAt = (x, y, scale, offsetX, offsetY) => {
    const gx = (Math.floor(x / scale) + offsetX) % grainPng.width;
    const gy = (Math.floor(y / scale) + offsetY) % grainPng.height;
    // Signed: the source texture is zero-mean noise centered on 128.
    return grainPng.data[(gy * grainPng.width + gx) * 4] - 128;
};

// Signed, zero-mean film grain in framebuffer-code units.
const grainAt = (x, y) => {
    const fine = noiseAt(x, y, GRAIN_SCALE, 0, 0);
    const clump = noiseAt(
        x,
        y,
        GRAIN_CLUMP_SCALE,
        GRAIN_CLUMP_OFFSET_X,
        GRAIN_CLUMP_OFFSET_Y,
    );
    // Octave sum normalized back to the source's amplitude, so GRAIN_GAIN
    // stays the single strength knob.
    return (GRAIN_GAIN * (fine + clump * GRAIN_CLUMP_WEIGHT)) / (1 + GRAIN_CLUMP_WEIGHT);
};

// Straight-alpha src-over of layer (r,g,b,a) onto premultiplied accumulator.
const over = (acc, r, g, b, a) => {
    acc.r = r * a + acc.r * (1 - a);
    acc.g = g * a + acc.g * (1 - a);
    acc.b = b * a + acc.b * (1 - a);
    acc.a = a + acc.a * (1 - a);
};

for (const pane of PANES) {
    const { file, height } = pane;
    const png = new PNG({ colorType: 6, height, width: WIDTH });
    const rand = mulberry32(0x0d0cf1a5 ^ height);
    const v2 = WIDTH * WIDTH + height * height;
    let maxErr = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const t = Math.min(1, Math.max(0, (x * WIDTH + y * height) / v2));

            const acc = { a: 0, b: 0, g: 0, r: 0 };
            over(acc, GOLD.r, GOLD.g, GOLD.b, GOLD.a * t);
            const sheenAlpha =
                t < SHEEN_KNEE_T
                    ? SHEEN_HEAD + (SHEEN_KNEE - SHEEN_HEAD) * (t / SHEEN_KNEE_T)
                    : SHEEN_KNEE * (1 - (t - SHEEN_KNEE_T) / (1 - SHEEN_KNEE_T));
            over(acc, SHEEN.r, SHEEN.g, SHEEN.b, sheenAlpha);
            over(acc, FILM_FOG.r, FILM_FOG.g, FILM_FOG.b, FILM_FOG.a);
            // Grain modulates the pane's own emission: a signed premultiplied
            // add with alpha untouched — grain redistributes light, it does
            // not occlude what is behind the glass.
            const grain = grainAt(x, y);
            const ceiling = acc.a * 255;
            acc.r = Math.min(ceiling, Math.max(0, acc.r + grain));
            acc.g = Math.min(ceiling, Math.max(0, acc.g + grain));
            acc.b = Math.min(ceiling, Math.max(0, acc.b + grain));

            // Two independent dithers make the whole quantization noise-shaped
            // WITHOUT the visible grain's help (GRAIN_GAIN is free to be
            // taste-only): alpha jitters ±0.5 code, randomizing the rounding
            // of the background-transmission ramp; and a shared per-pixel
            // luma offset jitters the premul targets ±0.5 code, randomizing
            // the decode-premultiply rounding of the pane's own emission.
            // Shared across R/G/B so the dither is colorless — independent
            // streams would add chroma speckle. At 1px/±0.5 code this is the
            // display's noise floor, not texture.
            const lumaDither = rand() - 0.5;
            // Floor: alpha8 may never quantize below the premul peak (incl.
            // dither headroom), or the straight color clamps at 255.
            const minAlpha8 = Math.ceil(Math.max(acc.r, acc.g, acc.b) + 0.5);
            const alpha8 = Math.min(
                255,
                Math.max(1, minAlpha8, Math.round(acc.a * 255 + (rand() - 0.5))),
            );
            const idx = (y * WIDTH + x) * 4;
            png.data[idx + 3] = alpha8;
            for (const [channel, offset] of [
                [acc.r, 0],
                [acc.g, 1],
                [acc.b, 2],
            ]) {
                const target = Math.max(0, channel + lumaDither);
                const c8 = Math.min(255, Math.max(0, Math.round((target * 255) / alpha8)));
                png.data[idx + offset] = c8;
                const delivered = (c8 * alpha8) / 255;
                const err = Math.abs(delivered - target);
                if (err > maxErr) maxErr = err;
            }
        }
    }

    const outPath = path.resolve(__dirname, '../apps/android/assets', file);
    fs.writeFileSync(outPath, PNG.sync.write(png));
    const kb = Math.round(fs.statSync(outPath).size / 1024);
    console.log(
        `wrote ${outPath} (${WIDTH}x${height}, ${kb} KB, max premul error ${maxErr.toFixed(3)} codes)`,
    );
}
