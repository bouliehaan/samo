import { AppThemeConfiguration } from '/@/shared/themes/app-theme-types';

/**
 * samo dark — the monochrome flagship, mirroring the Android design tokens
 * (`apps/android/src/theme/tokens.ts`): a considered near-black cool blue-grey
 * base with an elevation ladder stacked above it, and a cool brushed-silver
 * accent used sparingly as a hallmark — never warm gold.
 */
export const defaultDark: AppThemeConfiguration = {
    app: {},
    colors: {
        // App base — super-dark cool grey with a faint blue cast, not pure black.
        background: '#0e0f13',
        'background-alternate': '#0a0b0e',
        // Cool-cast ink to match the ladder.
        foreground: '#f4f6f9',
        'foreground-muted': '#98a1ad',
        // Cool silver accent (moonlit brushed aluminium), a step deeper than
        // white so it reads as a tone, not a blown highlight.
        primary: '#c6d0dd',
        'state-info': '#c6d0dd',
        // Cards, list rows, tiles.
        surface: '#191b21',
        'surface-foreground': '#f4f6f9',
    },
    mantineOverride: {
        colors: {
            // Cool blue-grey elevation ladder matching the Android surfaces,
            // kept local to this theme so the other dark themes (Dracula, Nord,
            // …) keep their own neutral palettes. Mantine reads dark[] as
            // lightest → darkest, so text tones lead and surfaces trail.
            dark: [
                '#e9eef5', // 0 - brightest ice-silver text
                '#c6d0dd', // 1 - silver
                '#98a1ad', // 2 - muted
                '#69707c', // 3 - faint
                '#2d3039', // 4 - surfaceHigh (popovers, menus, active chips)
                '#23262e', // 5 - surface (sheets, segmented controls)
                '#191b21', // 6 - panel (cards, rows, tiles)
                '#15171c', // 7 - elevated (sticky headers, scrims)
                '#0e0f13', // 8 - app base
                '#0a0b0e', // 9 - deepest
            ],
        },
    },
    mode: 'dark',
};
