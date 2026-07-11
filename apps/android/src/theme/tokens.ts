/**
 * Samo design tokens.
 *
 * Premium-dark system: a considered near-black BASE with a ladder of elevated
 * surfaces stacked above it, so the UI reads as physical layers instead of a
 * flat OLED void. The luxe gold accent is the identity — "you got your hands on
 * something genuinely nice, no subscription required" — used sparingly as a
 * hallmark, never as wallpaper.
 */
export const colors = {
    // Creamy worn-gold accent — the soul of the product. Aged ivory with a
    // touch of gold (think well-worn piano keys), not a brassy rapper chain.
    // Classy-expensive, used sparingly as a hallmark.
    accent: '#d4c08a',
    /** Lighter creamy gold for hero / active states. */
    accentBright: '#ecdcb2',
    /** Faint gold wash for tinted fills. */
    accentSoft: 'rgba(212, 192, 138, 0.13)',
    /** Gold hairline / outline. */
    accentLine: 'rgba(212, 192, 138, 0.4)',

    // Elevation ladder (darkest → lightest). Each step is a physical surface.
    /** App base — super-dark neutral grey, not pure black. */
    background: '#0f0f12',
    /** Subtle raise (sticky headers, scrims). */
    backgroundElevated: '#16161a',
    /** Cards, list rows, tiles. */
    panel: '#1a1a1f',
    /** Raised chrome — sheets, the player/tab blob, segmented controls. */
    surface: '#242429',
    /** Highest — popovers, menus, active chips. */
    surfaceHigh: '#2e2e35',

    // Hairlines.
    border: 'rgba(255, 255, 255, 0.07)',
    borderStrong: 'rgba(255, 255, 255, 0.12)',

    // Ink.
    text: '#f6f6f8',
    muted: '#9a9aa3',
    /** Tertiary / disabled ink. */
    faint: '#6c6c75',
};

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

/** Gradients for hero moments (gold hallmark, artwork scrims). */
export const gradients = {
    gold: ['#ecdcb2', '#d4c08a', '#a8946a'] as const,
    goldSheen: ['#f3e8c8', '#d4c08a'] as const,
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
