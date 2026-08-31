import { StyleSheet } from 'react-native';
import {
    HOME_EDGE_PADDING,
    HOME_TILE_GAP,
    SCROLL_CONTENT_BOTTOM_INSET,
    VIEW_ALL_SIDEBAR_GUTTER,
    VIEW_ALL_TILE_HEIGHT,
    VIEW_ALL_TILE_SIZE,
    PAGE_TOP_INSET,
} from '../layout';
import { colors, fonts, spacing } from '../tokens';

/** View All grid screen. */
export const viewAllStyles = StyleSheet.create({
    viewAllBackArrow: {
        color: colors.text,
        fontSize: 28,
        fontWeight: '300',
        lineHeight: 28,
    },
    viewAllBackButton: {
        alignItems: 'center',
        height: 36,
        justifyContent: 'center',
        width: 36,
    },
    viewAllBody: {
        flex: 1,
        position: 'relative',
    },
    viewAllRow: {
        flexDirection: 'row',
        gap: HOME_TILE_GAP,
        paddingHorizontal: HOME_EDGE_PADDING,
    },
    viewAllTilePlaceholder: {
        height: VIEW_ALL_TILE_HEIGHT,
        width: VIEW_ALL_TILE_SIZE,
    },
    viewAllEmpty: {
        color: colors.muted,
        padding: spacing.lg,
    },
    viewAllHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.sm,
        paddingBottom: spacing.sm,
        paddingTop: PAGE_TOP_INSET,
    },
    viewAllJumpOverlay: {
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: 'rgba(24, 24, 24, 0.88)',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 24,
        borderWidth: StyleSheet.hairlineWidth,
        height: 96,
        justifyContent: 'center',
        position: 'absolute',
        top: '36%',
        width: 96,
    },
    viewAllJumpOverlayText: {
        color: colors.text,
        fontSize: 48,
        fontWeight: '900',
        includeFontPadding: false,
        lineHeight: 56,
        textAlign: 'center',
    },
    viewAllListContent: {
        gap: HOME_TILE_GAP,
        paddingBottom: SCROLL_CONTENT_BOTTOM_INSET,
        paddingRight: VIEW_ALL_SIDEBAR_GUTTER,
    },
    viewAllScreen: {
        flex: 1,
    },
    viewAllTile: {
        height: VIEW_ALL_TILE_HEIGHT,
        position: 'relative',
        width: VIEW_ALL_TILE_SIZE,
    },
    viewAllTileArtwork: {
        aspectRatio: 1,
        borderRadius: 2,
        marginBottom: 6,
        width: '100%',
    },
    viewAllTileArtworkFallback: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        justifyContent: 'center',
    },
    viewAllTileMetaRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 4,
        minWidth: 0,
        // The inset the subtitle used to carry itself, moved out to the row so
        // the badge lines up with the title above it.
        paddingLeft: 2,
    },
    viewAllTileSubtitle: {
        color: colors.muted,
        fontSize: 12,
        fontFamily: fonts.mono,
        lineHeight: 16,
        paddingHorizontal: 2,
    },
    viewAllTileSubtitleInline: {
        flexShrink: 1,
        minWidth: 0,
        paddingLeft: 0,
    },
    viewAllTileTitle: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '700',
        lineHeight: 18,
        paddingHorizontal: 2,
    },
    viewAllTitle: {
        color: colors.text,
        flex: 1,
        fontSize: 17,
        fontWeight: '800',
        textAlign: 'center',
    },
});
