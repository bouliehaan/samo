/**
 * samo design tokens.
 *
 * Premium-dark system: a considered near-black BASE with a ladder of elevated
 * surfaces stacked above it, so the UI reads as physical layers instead of a
 * flat OLED void. The accent is cool monochrome — brushed-steel silver with a
 * faint blue cast — used sparingly as a hallmark, never as wallpaper.
 */
export const colors = {
    // Cool silver accent — moonlit brushed aluminum, not warm gold. A step
    // deeper than white so it reads as a TONE, not a blown highlight;
    // classy-expensive, used sparingly as a hallmark.
    accent: '#c6d0dd',
    /** Brighter ice-silver for hero / active states. */
    accentBright: '#e9eef5',
    /** Faint silver wash for tinted fills. */
    accentSoft: 'rgba(198, 208, 221, 0.12)',
    /** Silver hairline / outline. */
    accentLine: 'rgba(198, 208, 221, 0.36)',

    // Elevation ladder (darkest → lightest), each step a physical surface.
    // The whole ladder carries a faint cool blue-grey cast — monochrome with
    // GREY in it, not flat black-and-white — so depth reads as atmosphere.
    /** App base — super-dark cool grey, not pure black. */
    background: '#0e0f13',
    /** Subtle raise (sticky headers, scrims). */
    backgroundElevated: '#15171c',
    /** Cards, list rows, tiles. */
    panel: '#191b21',
    /** Raised chrome — sheets, the player/tab blob, segmented controls. */
    surface: '#23262e',
    /** Highest — popovers, menus, active chips. */
    surfaceHigh: '#2d3039',

    // Hairlines.
    border: 'rgba(255, 255, 255, 0.07)',
    borderStrong: 'rgba(255, 255, 255, 0.12)',

    // Ink — cool-cast to match the ladder.
    text: '#f4f6f9',
    muted: '#98a1ad',
    /** Tertiary / disabled ink. */
    faint: '#69707c',
};

/**
 * Type families — the ONE place a typeface name is spelled out.
 *
 * Every `fontFamily:` in the app must reference this object, never a bare
 * string: swapping a face has already cost two full 12-file literal sweeps
 * (Young Serif → Space Grotesk → Bricolage Grotesque), and each sweep is a
 * chance to miss a file and ship mixed type.
 *
 * The values are the REGISTERED family names — they must stay identical to the
 * `useFonts` keys in App.tsx, which is why App.tsx builds that map from these
 * tokens with computed keys rather than repeating the strings.
 */
export const fonts = {
    /** Display / headings — Bricolage Grotesque, the brand voice. */
    heading: 'BricolageGrotesque-Bold',
    /** Lighter display weight for secondary headings. */
    headingMedium: 'BricolageGrotesque-Medium',
    /** Body copy — the app-wide Text/TextInput default. */
    body: 'Archivo',
    /** Monospace — labels, metadata, timecodes, pills. */
    mono: 'OfficeCodePro-Regular',
    /** Monospace, bold. */
    monoBold: 'OfficeCodePro-Bold',
    /**
     * Monospace, medium. NOTE: this face is NOT registered in App.tsx's
     * useFonts (no officecodepro-medium asset ships), so the one style using
     * it falls back to the system face. Kept as a token to preserve the
     * existing rendering exactly; drop it or add the asset deliberately.
     */
    monoMedium: 'OfficeCodePro-Medium',
} as const;

export const spacing = {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
};

/** Corner radii — generous, consistent rounding reads as considered hardware. */
export const radii = {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    pill: 999,
};

/**
 * Elevation presets — soft, low, downward shadows (light from above) for depth
 * without muddiness. Spread into a StyleSheet entry: `...elevation.card`.
 */
export const elevation = {
    card: {
        elevation: 8,
        shadowColor: '#000000',
        shadowOffset: { height: 10, width: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 18,
    },
    raised: {
        elevation: 20,
        shadowColor: '#000000',
        shadowOffset: { height: 18, width: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
    },
};

/** Gradients for hero moments (silver hallmark, artwork scrims). */
export const gradients = {
    gold: ['#eef2f7', '#cfd8e3', '#98a3b1'] as const,
    goldSheen: ['#f6f9fc', '#cfd8e3'] as const,
    artworkScrim: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.85)'] as const,
};

/**
 * The chrome glass material — BlurView props shared by the bottom dock and
 * the Home top bar so both panes are the same piece of hardware and tuning
 * happens in ONE place. brightness/saturation live INSIDE the blur via the
 * patched expo-blur ColorMatrix (see BottomChromeBackdrop's doc for why
 * darkness must be multiplicative, never smoke alpha).
 */
export const chromeGlass = {
    brightness: 0.35,
    intensity: 26,
    saturation: 1.7,
} as const;
