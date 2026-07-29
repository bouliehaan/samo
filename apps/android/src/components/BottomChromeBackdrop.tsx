import { BlurView } from 'expo-blur';
import { Image, StyleSheet, View } from 'react-native';
import Reanimated, { type useAnimatedStyle } from 'react-native-reanimated';

import chromeFinishBare from '../../assets/chrome-finish-bare.png';
import chromeFinishMini from '../../assets/chrome-finish-mini.png';
import { useIsMiniPlayerVisible } from '../hooks/use-scroll-content-bottom-inset';
import { DOCK_BLUR_TARGET } from '../theme/chrome-blur-targets';
import { styles } from '../theme/styles';
import { chromeGlass } from '../theme/tokens';

/**
 * The ONE frosted-glass pane the whole bottom dock (mini player + tab bar)
 * sits on. A single surface means the two rows read as one piece of hardware
 * and a seam between them is impossible by construction.
 *
 * The glass recipe, bottom-up:
 *   1. Real blur of the content scrolling beneath (RenderEffect-backed on
 *      Android 12+ via expo-blur's dimezis method — GPU, not RenderScript).
 *      The chroma boost rides INSIDE the blur via the patched expo-blur
 *      `saturation` prop: a ColorMatrix chained into the same RenderEffect
 *      the blur renders through (patches/expo-blur@57.0.2.patch,
 *      SaturatingRenderEffectBlur). HARD RULE learned twice on device: no
 *      React-layer compositing may wrap or overlay this BlurView —
 *      mixBlendMode paints its flat color (the magenta box), and a
 *      filter-style wrapper forces an offscreen layer that breaks the
 *      snapshot draw (opaque dock + hard vertical edge at ~80% width).
 *      The DARKNESS of the glass also lives inside the blur, via the same
 *      patched ColorMatrix (`brightness` prop): a multiplicative dim
 *      preserves the contrast and chroma of what shows through — like
 *      sunglasses — where piling alpha onto the smoke tint would veil it.
 *      That split is what makes the pane near-black yet clearly translucent:
 *      brightness carries the darkness, the smoke below stays light.
 *      The tint is `systemChromeMaterialDark` — the ONLY stock tint whose
 *      overlay is pure BLACK. Plain `dark` composites (25,25,25) over the
 *      pane, ~4.5 codes of flat grey veil at this intensity: that was the
 *      "bluish greyish" cast. Black overlays are multiplicative — they
 *      darken without lifting, so translucence survives.
 *   2. A whisper of PURE BLACK smoke so ink stays legible over busy
 *      artwork — black on purpose: zero additive veil, it only dims what is
 *      behind it. Darkening belongs to `brightness` + this, never to a grey.
 *   3. The glass FINISH — a warm gold breath, warm-ivory edge sheen and
 *      FILM grain (two-octave silver halide, the 80's-home-movie ask) — as
 *      ONE pre-dithered PNG baked by
 *      scripts/gen-dock-finish.js. This must NOT go back to live
 *      LinearGradients: washes this faint (alpha 0.055–0.10) only span
 *      ~14–26 framebuffer codes, and where steel-fading-out crosses
 *      gold-fading-in the composite passes through neutral gray, so R/G/B
 *      hit the same 8-bit rounding threshold at the same column — a
 *      coordinated 1-code luminance cliff that reads as a vertical line at
 *      ~70–75% width on an OLED (THE "~75% line"). Paint.DITHER_FLAG is a
 *      no-op on hardware-accelerated Android and the 5% grain is ~10x too
 *      weak to mask it. The bake composites in float and dithers the alpha
 *      channel at authoring time, so no coherent quantization edge can
 *      exist, whatever Skia does. Tune the recipe IN THE SCRIPT, rerun it,
 *      and commit the regenerated PNGs.
 *
 * `sinkStyle` is the tab bar's player-open sink transform: the pane moves with
 * the rows so the dock leaves as one piece (the rising player card covers the
 * bottom of the screen from its first frames, so nothing peeks).
 */
export const BottomChromeBackdrop = ({
    sinkStyle,
}: {
    sinkStyle: ReturnType<typeof useAnimatedStyle>;
}) => {
    const hasMiniPlayer = useIsMiniPlayerVisible();
    return (
        // pointerEvents "auto" ON PURPOSE: the pane is physical glass, so it
        // must swallow any touch that lands on it and doesn't hit a control
        // riding on top (tab bar, mini player — both stack above it). With
        // "none", any moment the rows above go non-interactive (the player
        // dismiss window) let taps pass THROUGH the dock into list content
        // scrolled beneath the glass. A plain View with no handlers absorbs
        // the touch: hit-testing stops at the topmost eligible view and never
        // continues to what's visually behind it.
        <Reanimated.View
            pointerEvents="auto"
            style={[
                styles.bottomChrome,
                hasMiniPlayer ? styles.bottomChromeWithMini : styles.bottomChromeBare,
                sinkStyle,
            ]}
        >
            <BlurView
                {...chromeGlass}
                blurTarget={DOCK_BLUR_TARGET}
                blurMethod="dimezisBlurView"
                style={StyleSheet.absoluteFill}
                tint="systemChromeMaterialDark"
            />
            <View style={[StyleSheet.absoluteFill, styles.chromeSmoke]} />
            {/*
             * The baked finish is stretched corner-to-corner, so on any pane
             * size it is mathematically the same diagonal washes — one asset
             * per dock mode because the two panes have different aspects.
             * fadeDuration must stay 0: Android <Image> otherwise fades the
             * finish in over 300ms every time the dock (re)mounts.

             */}
            <Image
                accessibilityIgnoresInvertColors
                fadeDuration={0}
                resizeMode="stretch"
                source={hasMiniPlayer ? chromeFinishMini : chromeFinishBare}
                style={StyleSheet.absoluteFill}
            />
        </Reanimated.View>
    );
};
