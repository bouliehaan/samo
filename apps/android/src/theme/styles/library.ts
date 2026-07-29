import { StyleSheet } from 'react-native';
import { HOME_EDGE_PADDING, PAGE_TOP_INSET, SCROLL_CONTENT_BOTTOM_INSET } from '../layout';
import { colors, fonts, radii, spacing } from '../tokens';

/** Library tab: browse list, filters, alphabet rail. */
export const libraryStyles = StyleSheet.create({
    alphabetSidebar: {
        alignItems: 'center',
        bottom: SCROLL_CONTENT_BOTTOM_INSET,
        justifyContent: 'center',
        position: 'absolute',
        right: 0,
        top: spacing.sm,
        width: 34,
        zIndex: 4,
    },
    alphabetSidebarRail: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    alphabetSidebarLetter: {
        color: 'rgba(255,255,255,0.18)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0,
    },
    alphabetSidebarLetterActive: {
        color: colors.accent,
    },
    alphabetSidebarLetterButton: {
        alignItems: 'center',
        height: 14,
        justifyContent: 'center',
        width: 32,
    },
    libraryArtworkRound: {
        borderRadius: 999,
    },
    libraryEmptyState: {
        alignItems: 'center',
        backgroundColor: colors.panel,
        borderRadius: 8,
        justifyContent: 'center',
        minHeight: 116,
        padding: spacing.lg,
    },
    libraryEyebrow: {
        color: colors.text,
        fontSize: 22,
        fontFamily: fonts.heading,
        letterSpacing: 0,
        lineHeight: 27,
    },
    libraryFilterPill: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 999,
        justifyContent: 'center',
        minHeight: 34,
        paddingHorizontal: spacing.md,
    },
    libraryFilterPillActive: {
        backgroundColor: colors.accent,
    },
    libraryFilterPills: {
        gap: spacing.xs,
        paddingBottom: spacing.sm,
        paddingTop: spacing.md,
    },
    libraryFilterPillText: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '800',
    },
    libraryFilterPillTextActive: {
        color: colors.background,
    },
    libraryBrowseBody: {
        flex: 1,
        minHeight: 360,
        position: 'relative',
    },
    libraryBrowseChrome: {
        paddingHorizontal: HOME_EDGE_PADDING,
        paddingTop: PAGE_TOP_INSET,
    },
    libraryBrowseListContent: {
        paddingBottom: SCROLL_CONTENT_BOTTOM_INSET,
        paddingRight: 28,
    },
    libraryHeaderActions: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: spacing.xs,
        flexShrink: 0,
    },
    libraryHeaderRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    libraryHeaderText: {
        flex: 1,
        minWidth: 0,
        paddingRight: spacing.md,
    },
    libraryList: {
        gap: 4,
        marginTop: spacing.md,
    },
    libraryListContent: {
        paddingBottom: SCROLL_CONTENT_BOTTOM_INSET,
        paddingHorizontal: HOME_EDGE_PADDING,
    },
    libraryRow: {
        alignItems: 'center',
        borderRadius: radii.sm,
        flexDirection: 'row',
        gap: spacing.sm,
        minHeight: 62,
        padding: 6,
        position: 'relative',
    },
    libraryRowAccessory: {
        alignItems: 'center',
        height: 38,
        justifyContent: 'center',
        width: 38,
    },
    libraryRowArtwork: {
        backgroundColor: colors.surface,
        borderRadius: 7,
        height: 50,
        width: 50,
    },
    libraryRowArtworkFallback: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 7,
        height: 50,
        justifyContent: 'center',
        width: 50,
    },
    libraryRowSubtitle: {
        color: colors.muted,
        fontSize: 12,
        fontFamily: fonts.mono,
        fontWeight: '600',
        lineHeight: 16,
    },
    libraryRowText: {
        flex: 1,
        minWidth: 0,
    },
    libraryRowDownloadIndicator: {
        bottom: 13,
        opacity: 0.82,
        position: 'absolute',
        right: 8,
    },
    libraryRowDownloadIndicatorWithAccessory: {
        right: 48,
    },
    libraryRowTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '800',
        lineHeight: 19,
        marginBottom: 2,
    },
    libraryScreen: {
        flex: 1,
    },
    librarySortBadge: {
        alignItems: 'center',
        backgroundColor: colors.panel,
        borderRadius: 999,
        flexDirection: 'row',
        gap: 6,
        minHeight: 32,
        paddingHorizontal: spacing.sm,
    },
    librarySortMenuHeader: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    librarySortMenuLabelActive: {
        color: colors.accent,
    },
    librarySortText: {
        color: colors.muted,
        fontSize: 12,
        fontWeight: '800',
    },
    librarySummary: {
        color: colors.muted,
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 17,
        marginTop: 2,
    },
    libraryStaticContent: {
        paddingBottom: SCROLL_CONTENT_BOTTOM_INSET,
        paddingHorizontal: HOME_EDGE_PADDING,
        paddingTop: PAGE_TOP_INSET,
    },
});
