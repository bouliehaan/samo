import { StyleSheet } from 'react-native';
import { HOME_EDGE_PADDING, PAGE_TOP_INSET } from '../layout';
import { colors, elevation, spacing } from '../tokens';

/** Playlists tab + playlist editing/search chrome. */
export const playlistStyles = StyleSheet.create({
    editPlaylistSheet: {
        backgroundColor: 'rgba(20, 20, 22, 0.985)',
        borderColor: 'rgba(255, 255, 255, 0.07)',
        borderRadius: 22,
        borderWidth: 0.5,
        elevation: 22,
        marginTop: 'auto',
        maxHeight: '78%',
        padding: spacing.lg,
        width: '100%',
    },
    editPlaylistTitle: {
        color: colors.text,
        fontSize: 20,
        fontWeight: '800',
        marginBottom: spacing.md,
    },
    editPlaylistLabel: {
        color: colors.muted,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: spacing.xs,
        textTransform: 'uppercase',
    },
    editPlaylistInput: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        borderWidth: 1,
        color: colors.text,
        fontSize: 16,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    editPlaylistTextArea: {
        minHeight: 88,
        textAlignVertical: 'top',
    },
    editPlaylistSwitchRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    editPlaylistSecondaryAction: {
        alignItems: 'center',
        borderColor: 'rgba(255,255,255,0.12)',
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: spacing.md,
        paddingVertical: spacing.sm,
    },
    editPlaylistSecondaryActionText: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '700',
    },
    editPlaylistActions: {
        gap: spacing.sm,
    },
    editPlaylistFooterRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    editPlaylistGhostButton: {
        borderRadius: 12,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    editPlaylistGhostButtonText: {
        color: colors.muted,
        fontSize: 15,
        fontWeight: '700',
    },
    editPlaylistSaveButton: {
        alignItems: 'center',
        backgroundColor: colors.accent,
        borderRadius: 12,
        minWidth: 88,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    editPlaylistSaveButtonText: {
        color: colors.background,
        fontSize: 15,
        fontWeight: '800',
    },
    editPlaylistDangerButton: {
        alignItems: 'center',
        marginBottom: spacing.xs,
        paddingVertical: spacing.xs,
    },
    editPlaylistDangerButtonText: {
        color: '#ff6b6b',
        fontSize: 15,
        fontWeight: '700',
    },
    editPlaylistHint: {
        color: colors.muted,
        fontSize: 12,
        lineHeight: 17,
        marginTop: spacing.md,
        textAlign: 'center',
    },
    playlistManageBar: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: 14,
        borderWidth: 1,
        flexDirection: 'row',
        gap: spacing.sm,
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    playlistManageBarText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '700',
    },
    playlistTrackSelect: {
        alignItems: 'center',
        borderColor: 'rgba(255,255,255,0.25)',
        borderRadius: 6,
        borderWidth: 1.5,
        height: 20,
        justifyContent: 'center',
        marginRight: spacing.sm,
        width: 20,
    },
    playlistTrackSelectChecked: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    playlistCreateSection: {
        gap: spacing.sm,
        marginBottom: spacing.sm,
        marginTop: spacing.sm,
    },
    playlistControlDirectionPill: {
        // The arrow pill stands a bit apart — it's a TOGGLE, not a member of
        // the sort-axis exclusive group.
        marginLeft: spacing.sm,
        minWidth: 36,
    },
    playlistControlGroup: {
        alignItems: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    playlistControlLabel: {
        color: colors.muted,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    playlistControlPill: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
    },
    playlistControlPillActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    playlistControlPillRow: {
        alignItems: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    playlistControlPillText: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '700',
    },
    playlistControlPillTextActive: {
        color: '#050505',
    },
    playlistControlsBlock: {
        // Two stacked label+pill rows above the playlist track list. Block
        // (not row) so even on narrow phones the sort axis never wraps under
        // an active filter pill and lose its breathing room.
        gap: spacing.sm,
        marginBottom: spacing.sm,
        marginTop: spacing.xs,
    },
    playlistListEmpty: {
        color: colors.muted,
        fontSize: 14,
        lineHeight: 20,
        paddingVertical: spacing.md,
    },
    playlistSearchAnimatedWrapper: {
        overflow: 'hidden',
    },
    playlistHeroSearchBar: {
        marginTop: spacing.xs,
    },
    playlistHeroSearchWrapper: {
        alignSelf: 'stretch',
        width: '100%',
    },
    playlistSearchBar: {
        marginBottom: spacing.sm,
        marginTop: spacing.xs,
    },
    playlistFloatingSearchBar: {
        borderColor: 'rgba(255,255,255,0.15)',
        shadowColor: '#000000',
        shadowOffset: { height: 10, width: 0 },
        shadowOpacity: 0.28,
        shadowRadius: 18,
    },
    playlistFloatingSearchWrapper: {
        elevation: 24,
        left: spacing.lg,
        position: 'absolute',
        right: spacing.lg,
        zIndex: 24,
    },
    playlistPillButton: {
        alignItems: 'center',
        backgroundColor: colors.accent,
        borderRadius: 999,
        flexDirection: 'row',
        gap: 8,
        height: 40,
        justifyContent: 'center',
        paddingHorizontal: 18,
    },
    playlistPillButtonText: {
        color: colors.background,
        fontSize: 14,
        fontWeight: '900',
    },
    /** Fills the absolute-fill tab scene — the FlashList inside needs the
     *  bounded height (an auto-height parent renders it 0-tall and blank).
     *  NO paddingTop here: a padded container clips the scrolling rows at an
     *  opaque line below the status bar. The clearance is playlistListContent,
     *  inside the scroll content, so rows run edge-to-edge under the bar. */
    playlistScreen: {
        flex: 1,
    },
    /** Page-top clearance INSIDE the list content (and on the no-playlists
     *  empty state, which has no list). */
    playlistListContent: {
        paddingTop: PAGE_TOP_INSET,
    },
    playlistStackIcon: {
        height: 52,
        position: 'relative',
        width: 52,
    },
    playlistStackLayer: {
        backgroundColor: colors.accentSoft,
        borderRadius: 8,
        height: 42,
        left: 2,
        position: 'absolute',
        top: 8,
        width: 42,
    },
    playlistStackLayerOffset: {
        backgroundColor: colors.surface,
        left: 8,
        top: 2,
    },
    /**
     * Playlists header: no page title, just one quiet controls row — sort on
     * the left, shuffle + create grouped on the right.
     */
    playlistTopPanel: {
        flexDirection: 'column',
        marginBottom: spacing.xs,
        // The controls row's x-origin contract: every page's pageControlsRow
        // starts HOME_EDGE_PADDING from the screen edge. Radio's row inherits
        // it from the shared tab ScrollView's padded container; Playlists owns
        // a bare FlashList, so this panel supplies the same inset itself.
        paddingHorizontal: HOME_EDGE_PADDING,
    },

    playlistControlsGroup: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: spacing.sm,
    },
});
