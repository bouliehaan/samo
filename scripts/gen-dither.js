// Generate a 256x256 zero-mean noise PNG for gradient dithering.
//
// Strategy
// --------
// White noise dithering kills banding mathematically but the human eye reads
// low-frequency clumps in white noise as "digital noise". For a *premium*
// feel we want the grain to look like silver halide film grain — fine,
// dense, no clumps. The fix is to high-pass-filter the white noise:
// subtract a blurred copy of the noise from itself, which suppresses
// low-frequency content and leaves only the high-frequency scatter. The
// result is a cheap approximation of blue noise, which is what dithering
// algorithms in printers/photo software use precisely because it looks
// like grain rather than static.
//
// Amplitude is set so soft-light blend yields ~±14/255 perturbation in the
// player's dark gradient zones — enough to break visible bands even for a
// trained eye, while the high-pass character keeps the grain organic.
//
// The PNG is 256x256: large enough that the tile boundary isn't visible
// on a phone screen (~4×9 tiles on a 1080×2400 device) and small enough
// to bundle/decode cheaply.

const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const SIZE = 256;
const CENTER = 128;
const RAW_AMPLITUDE = 64; // pre-filter amplitude (white noise span)
const SEED = 0xc01dface;
const BLUR_RADIUS = 1; // 3x3 box blur for low-frequency removal
const HIGHPASS_STRENGTH = 0.92; // how much of the blur to subtract back out

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

const rand = mulberry32(SEED);

// Step 1: white noise (signed, centered on 0)
const raw = new Float32Array(SIZE * SIZE);
for (let i = 0; i < raw.length; i++) {
    raw[i] = (rand() - 0.5) * 2 * RAW_AMPLITUDE;
}

// Step 2: box-blur the noise to extract low frequencies. Toroidal wrap so
// the resulting noise is tileable (no seams at tile edges).
const blurred = new Float32Array(SIZE * SIZE);
const diameter = BLUR_RADIUS * 2 + 1;
const kernelArea = diameter * diameter;
for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
        let sum = 0;
        for (let dy = -BLUR_RADIUS; dy <= BLUR_RADIUS; dy++) {
            const ny = (y + dy + SIZE) % SIZE;
            for (let dx = -BLUR_RADIUS; dx <= BLUR_RADIUS; dx++) {
                const nx = (x + dx + SIZE) % SIZE;
                sum += raw[ny * SIZE + nx];
            }
        }
        blurred[y * SIZE + x] = sum / kernelArea;
    }
}

// Step 3: high-pass = raw - α * blurred. This kills the patchy
// low-frequency clumps and leaves the fine-grain detail. Compute the
// actual amplitude so we can normalize to the target perturbation range.
const filtered = new Float32Array(SIZE * SIZE);
let maxAbs = 0;
for (let i = 0; i < raw.length; i++) {
    filtered[i] = raw[i] - HIGHPASS_STRENGTH * blurred[i];
    const a = Math.abs(filtered[i]);
    if (a > maxAbs) maxAbs = a;
}

// Step 4: scale to a target peak amplitude. With the native Paint
// dithering now active in react-native-linear-gradient (patched), the JS
// overlay only needs to add a subtle film-grain character on top of the
// already-clean gradient. A target peak of ±18 in 0..255 yields ~±9/255
// of perturbation in dark areas — enough to read as organic grain but
// well short of "noisy". Bump higher if the native dither path turns out
// to be a no-op on your device and bands still poke through.
const TARGET_PEAK = 18;
const scale = TARGET_PEAK / maxAbs;

const png = new PNG({ colorType: 6, height: SIZE, width: SIZE });
for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
        const v = Math.max(0, Math.min(255, Math.round(CENTER + filtered[y * SIZE + x] * scale)));
        const idx = (y * SIZE + x) * 4;
        png.data[idx + 0] = v;
        png.data[idx + 1] = v;
        png.data[idx + 2] = v;
        png.data[idx + 3] = 255;
    }
}

const outPath = path.resolve(process.argv[2]);
png.pack()
    .pipe(fs.createWriteStream(outPath))
    .on('finish', () => {
        console.log(
            `wrote ${outPath} (${SIZE}x${SIZE}, high-pass blue noise, peak ±${TARGET_PEAK} around ${CENTER})`,
        );
    });
