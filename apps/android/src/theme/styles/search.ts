import { StyleSheet } from 'react-native';
import {
    HOME_EDGE_PADDING,
    HOME_SCENE_TOP_INSET,
    HOME_SEARCH_FIELD_HEIGHT,
    SCROLL_CONTENT_BOTTOM_INSET,
    SEARCH_BROWSE_CARD_WIDTH,
} from '../layout';
import { colors, fonts, radii, spacing } from '../tokens';

/** Search tab + search overlay + inline search bars. */
export const searchStyles = StyleSheet.create({
    inlineSearchBar: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 999,
        flexDirection: 'row',
        gap: spacing.sm,
        minHeight: 50,
        paddingHorizontal: spacing.md,
    },
    inlineSearchBarElevated: {
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderColor: 'rgba(255,255,255,0.13)',
        borderRadius: 999,
        borderWidth: 1,
        minHeight: 52,
        paddingHorizontal: spacing.lg,
    },
    inlineSearchIconButton: {
        alignItems: 'center',
        borderRadius: 8,
        height: 34,
        justifyContent: 'center',
        width: 34,
    },
    inlineSearchInput: {
        color: colors.text,
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        minWidth: 0,
        paddingVertical: 10,
    },
    searchArtwork: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        height: 52,
        width: 52,
    },
    searchArtworkFallback: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 8,
        height: 52,
        justifyContent: 'center',
        width: 52,
    },
    searchArtworkLetter: {
        color: colors.accent,
        fontSize: 20,
        fontWeight: '900',
    },
    searchArtworkRound: {
        borderRadius: 26,
    },
    searchBrowseTitle: {
        color: colors.text,
        fontFamily: fonts.heading,
        fontSize: 20,
        letterSpacing: -0.4,
        lineHeight: 26,
        marginBottom: spacing.sm,
    },
    /**
     * Full-bleed seamless search: the screen darkens in place and the field
     * occupies the Home drawer's exact row (shared homeSearchDrawer/-Field
     * styles) — no card, no sheet, results right there under the pills.
     */
    searchOverlay: {
        ...StyleSheet.absoluteFill,
        // DELIBERATELY translucent — the page ghosting through the dim is a
        // feature Jacob explicitly approved ("that was so good"), not a bug.
        // The one real bug here was the recycled FlashList scattering result
        // rows (fixed with a plain ScrollView); keep the translucence, and do
        // NOT add elevation — it changes how Android composites this layer.
        backgroundColor: 'rgba(13, 14, 18, 0.86)',
        paddingHorizontal: HOME_EDGE_PADDING,
        paddingTop: HOME_SCENE_TOP_INSET,
        zIndex: 11000,
    },
    /** Reserves the field row's height on the overlay. The field itself lives on
     *  the pull surface — see SearchPullSurface. */
    searchOverlayFieldSpacer: {
        height: HOME_SEARCH_FIELD_HEIGHT,
    },
    searchOverlayInput: {
        color: colors.text,
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        paddingVertical: 0,
    },
    searchOverlayResults: {
        flex: 1,
        marginTop: spacing.md,
    },
    searchOverlayResultsContent: {
        paddingBottom: 64,
    },
    searchRecentSection: {
        marginTop: spacing.lg,
    },
    searchResultSection: {
        marginTop: spacing.lg,
    },
    searchRow: {
        alignItems: 'center',
        borderColor: colors.border,
        borderTopWidth: 1,
        flexDirection: 'row',
        gap: spacing.sm,
        paddingVertical: spacing.sm,
    },
    searchRowText: {
        flex: 1,
    },
    searchScopePill: {
        alignItems: 'center',
        backgroundColor: colors.panel,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 999,
        borderWidth: 1,
        justifyContent: 'center',
        minHeight: 34,
        paddingHorizontal: spacing.md,
    },
    // Matches Home's filter pills — the two pill rows sit one gesture apart,
    // so an active pill has to mean the same thing (and look the same) in both.
    searchScopePillActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    searchScopePills: {
        alignItems: 'center',
        gap: spacing.xs,
        paddingTop: spacing.md,
    },
    searchScopePillsBar: {
        flexGrow: 0,
    },
    searchScopePillText: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '800',
    },
    searchScopePillTextActive: {
        color: colors.background,
    },
    searchSourceAccent: {
        borderRadius: 999,
        height: 4,
        marginBottom: spacing.sm,
        width: 28,
    },
    /**
     * The browse categories. They used to be a horizontal rail of 164pt cards,
     * which put the fourth one half off the screen and left the whole surface
     * looking like an unfinished shelf. A two-up grid fills the page instead —
     * every category visible at once, on the same column edges as Home.
     */
    searchSourceCard: {
        backgroundColor: colors.panel,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: radii.sm,
        borderWidth: 1,
        // FIXED, not minHeight: a two-line subtitle ("Songs, albums, artists")
        // would otherwise make its card taller than the one beside it and the
        // grid would step down the page in ragged pairs. Sized for the
        // two-line case so nothing clips.
        height: 104,
        padding: spacing.md,
        width: SEARCH_BROWSE_CARD_WIDTH,
    },
    searchSourceGrid: {
        columnGap: spacing.sm,
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: spacing.sm,
    },
    searchSourcePressed: {
        backgroundColor: colors.surface,
    },
    searchSourceSubtitle: {
        color: colors.muted,
        fontFamily: fonts.mono,
        fontSize: 12,
        lineHeight: 16,
        marginTop: 3,
    },
    searchSourceTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '900',
        lineHeight: 20,
    },
    searchTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 2,
    },
});
