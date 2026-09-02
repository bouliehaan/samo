import { StyleSheet } from 'react-native';
import { colors, elevation, fonts, radii, spacing } from '../tokens';

/** Cross-surface primitives: buttons, inputs, sheets, context menus, badges, text. */
export const sharedStyles = StyleSheet.create({
    actionSheet: {
        backgroundColor: '#000000',
        borderColor: 'rgba(255,255,255,0.06)',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingBottom: 36,
        paddingTop: 8,
    },
    actionSheetCancelRow: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        height: 52,
        justifyContent: 'center',
        marginHorizontal: spacing.lg,
        marginTop: 12,
    },
    actionSheetCancelText: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    actionSheetHandle: {
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.22)',
        borderRadius: 999,
        height: 4,
        marginTop: 8,
        width: 38,
    },
    actionSheetRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 16,
        minHeight: 56,
        paddingHorizontal: spacing.lg,
    },
    actionSheetRowIcon: {
        alignItems: 'center',
        height: 28,
        justifyContent: 'center',
        width: 28,
    },
    actionSheetRowText: {
        color: colors.text,
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    actionSheetSeparator: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        height: StyleSheet.hairlineWidth,
        marginHorizontal: spacing.lg,
    },
    actionSheetSongSubtitle: {
        color: colors.muted,
        fontSize: 13,
        fontFamily: fonts.mono,
        paddingBottom: 16,
        paddingHorizontal: spacing.lg,
        textAlign: 'center',
    },
    actionSheetSongTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '700',
        paddingBottom: 4,
        paddingHorizontal: spacing.lg,
        paddingTop: 12,
        textAlign: 'center',
    },
    actionSheetTitle: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.6,
        paddingBottom: 10,
        paddingHorizontal: spacing.lg,
        paddingTop: 18,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    appIcon: {
        height: 54,
        resizeMode: 'contain',
        width: 54,
    },
    appIconButton: {
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderRadius: 8,
        height: 54,
        justifyContent: 'center',
        width: 54,
    },
    artworkImageFallback: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        justifyContent: 'center',
    },
    /** The add-to-playlist sheet. A FLEX child of contextMenuBackdrop, not an
     *  absolutely-positioned one — which is what made its playlist list
     *  unscrollable. Yoga lays an absolute child out with an UNDEFINED height
     *  constraint when only `bottom` is pinned and no height is given, so
     *  nothing inside can be shrunk to fit and `maxHeight` degrades from a
     *  constraint into a crop: the list was measured at full content height
     *  (contentSize === frame, so the scroller had nothing to scroll) and
     *  every row past 62% was simply cut off. Bottom-anchored by the
     *  backdrop's justifyContent instead, the cap is a real bound the list
     *  shrinks into. Same shape as mediaContextSheet, which is why the
     *  long-press menu has never had this. */
    contextMenu: {
        backgroundColor: 'rgba(18, 18, 18, 0.96)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 26,
        marginHorizontal: spacing.lg,
        maxHeight: '62%',
        padding: spacing.md,
    },
    contextMenuBackdrop: {
        backgroundColor: 'rgba(0, 0, 0, 0.42)',
        bottom: 0,
        justifyContent: 'flex-end',
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
    },
    contextMenuError: {
        color: '#ffb1a3',
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 16,
        marginTop: spacing.sm,
    },
    contextMenuEyebrow: {
        color: colors.accent,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    /** Grow is off and shrink is on deliberately: the sheet hugs a short list,
     *  and a long one shrinks into the 62% cap rather than overflowing it. */
    contextMenuList: {
        flexGrow: 0,
        flexShrink: 1,
        marginTop: spacing.sm,
    },
    contextMenuRow: {
        alignItems: 'center',
        borderColor: colors.border,
        borderTopWidth: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        minHeight: 48,
        paddingVertical: spacing.sm,
    },
    contextMenuRowText: {
        color: colors.text,
        flex: 1,
        fontSize: 15,
        fontWeight: '800',
        lineHeight: 19,
        marginRight: spacing.sm,
    },
    contextMenuSuccess: {
        color: colors.accent,
        fontSize: 12,
        fontWeight: '800',
        lineHeight: 16,
        marginTop: spacing.sm,
    },
    contextMenuTitle: {
        color: colors.text,
        fontSize: 19,
        fontWeight: '900',
        lineHeight: 24,
    },
    contextMenuPrimaryButton: {
        alignSelf: 'stretch',
        marginTop: 0,
    },
    disabledButton: {
        opacity: 0.45,
    },
    errorBoundaryButton: {
        backgroundColor: colors.accent,
        borderRadius: 999,
        marginTop: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
    },
    errorBoundaryButtonText: {
        color: '#050505',
        fontSize: 15,
        fontWeight: '800',
    },
    errorBoundaryRoot: {
        alignItems: 'center',
        backgroundColor: colors.background,
        flex: 1,
        justifyContent: 'center',
        padding: spacing.lg,
    },
    errorBoundarySubtitle: {
        color: colors.muted,
        fontSize: 14,
        fontFamily: fonts.mono,
        lineHeight: 20,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    errorBoundaryTitle: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
    },
    errorText: {
        color: '#ffb1a3',
        fontSize: 14,
        marginTop: spacing.sm,
    },
    formatBadge: {
        height: 44,
        resizeMode: 'contain',
        width: 44,
    },
    formatBadgeMeta: {
        // Standalone "16-bit / 44.1 kHz Lossless" text line on the album
        // detail. Sits in the metaLines block so it lines up with the
        // artist/year/label entries already there.
        color: colors.accent,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.4,
        marginTop: spacing.xs,
        textTransform: 'uppercase',
    },
    formatBadgeMini: {
        // Mini-player artwork is only 58x58, so the badge needs to shrink to
        // stay readable without smothering the cover art. Same top-left
        // placement as formatBadgeOverlay for visual consistency with tiles.
        height: 22,
        left: 3,
        position: 'absolute',
        top: 3,
        width: 22,
    },
    formatBadgeOverlay: {
        // Corner overlay on artwork. Top-left mirrors how Tidal and Apple
        // Music position their lossless marks — bottom corners draw the eye
        // away from the title beneath the tile.
        height: 38,
        left: 6,
        position: 'absolute',
        top: 6,
        width: 38,
    },
    formatBadgePlayer: {
        height: 36,
        marginRight: -2,
        width: 36,
    },
    formatBadgeThumb: {
        bottom: 2,
        height: 18,
        position: 'absolute',
        right: 2,
        width: 18,
    },
    formatBadgeTile: {
        // The hi-fi mark in a tile's metadata row (beneath the cover, sat to
        // the right of the title/subtitle, Qobuz-style). Smaller than the base
        // 44px so it never out-grows a fixed-height grid tile's text band.
        height: 32,
        width: 32,
    },
    input: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        color: colors.text,
        fontSize: 16,
        marginTop: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: 13,
    },
    inputActionButton: {
        alignItems: 'center',
        height: 44,
        justifyContent: 'center',
        width: 44,
    },
    inputWithAction: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 8,
        flexDirection: 'row',
        marginTop: spacing.sm,
        paddingRight: 4,
    },
    inputWithActionField: {
        backgroundColor: 'transparent',
        flex: 1,
        marginTop: 0,
        minWidth: 0,
        paddingRight: spacing.xs,
    },
    mediaContextActionDestructive: {
        color: '#ff7a6e',
    },
    mediaContextActionIcon: {
        alignItems: 'center',
        height: 22,
        justifyContent: 'center',
        marginRight: 14,
        width: 22,
    },
    mediaContextActionLabel: {
        color: colors.text,
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.1,
        lineHeight: 18,
    },
    mediaContextActionRow: {
        alignItems: 'center',
        borderBottomColor: 'rgba(255, 255, 255, 0.045)',
        borderBottomWidth: 1,
        flexDirection: 'row',
        height: 50,
        paddingHorizontal: 16,
    },
    mediaContextActionRowLast: {
        borderBottomWidth: 0,
    },
    mediaContextActions: {
        marginTop: 4,
        paddingBottom: 4,
    },
    mediaContextArtwork: {
        backgroundColor: '#2a2a2c',
        borderRadius: 6,
        height: 44,
        width: 44,
    },
    mediaContextArtworkFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    mediaContextArtworkRound: {
        borderRadius: 22,
    },
    mediaContextBackdrop: {
        backgroundColor: 'rgba(0, 0, 0, 0.62)',
        bottom: 0,
        flex: 1,
        justifyContent: 'flex-end',
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
    },
    /** The one layer every sheet and menu is drawn into (SheetPortalHost).
     *  zIndex 12000 clears the whole stack — status-bar scrim 9500, tab bar and
     *  player dock 10000, search 11000/11100 — because a sheet is the topmost
     *  thing in the app while it is open. This number is what replaced giving
     *  each sheet its own Android window to climb out of the tree with. */
    sheetLayer: {
        bottom: 0,
        // Paired with the zIndex, because Android has TWO stacking orders and
        // the layer only had one of them. RN's `zIndex` reorders drawing and
        // RN's own touch dispatch; native `elevation` reorders the framework's
        // — including which sibling a ViewGroup offers a MotionEvent to first.
        // The full player carries elevation 999 (its dock and queue sheet
        // 1000/1001), so with no elevation here a sheet drawn over the open
        // player still lost native touch dispatch to it: taps worked, because
        // those are routed by zIndex, while any drag on a native scroller
        // inside the sheet was dead — the add-to-playlist list would not
        // scroll while the player was up. It has no background, so raising it
        // costs no shadow.
        elevation: 1200,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 12000,
    },
    /** Full-bleed tap-to-dismiss target behind any sheet (see MotionSheet).
     *  Absolute rather than flex:1 so it fills the scrim WITHOUT participating
     *  in its layout — the sheet stays wherever the backdrop's justifyContent
     *  puts it. */
    sheetScrimPress: {
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
    },
    mediaContextDivider: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        height: 1,
        marginTop: 12,
    },
    mediaContextEmpty: {
        color: colors.muted,
        fontSize: 13,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    mediaContextEyebrow: {
        color: colors.accent,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    mediaContextFeedback: {
        color: colors.accent,
        fontSize: 12,
        fontWeight: '700',
        paddingBottom: 14,
        paddingHorizontal: 16,
    },
    mediaContextHeaderRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 14,
        paddingTop: 14,
    },
    mediaContextHeaderText: {
        flex: 1,
    },
    mediaContextSheet: {
        backgroundColor: 'rgba(22, 22, 24, 0.985)',
        borderColor: 'rgba(255, 255, 255, 0.07)',
        borderRadius: 18,
        borderWidth: 0.5,
        elevation: 18,
        marginBottom: 28,
        marginHorizontal: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { height: 12, width: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
    },
    mediaContextSubtitle: {
        color: colors.muted,
        fontSize: 13,
        fontFamily: fonts.mono,
        fontWeight: '500',
        lineHeight: 16,
    },
    mediaContextTitle: {
        color: colors.text,
        fontSize: 17,
        fontWeight: '800',
        letterSpacing: 0.1,
        lineHeight: 21,
    },
    modalBackdrop: {
        backgroundColor: 'rgba(0,0,0,0.55)',
        flex: 1,
        justifyContent: 'flex-end',
    },
    mutedText: {
        color: colors.muted,
        fontSize: 14,
        fontFamily: fonts.mono,
        lineHeight: 20,
    },
    primaryButton: {
        alignItems: 'center',
        backgroundColor: colors.accent,
        borderRadius: 8,
        height: 48,
        justifyContent: 'center',
        marginTop: spacing.md,
    },
    primaryButtonText: {
        color: '#050505',
        fontSize: 16,
        fontWeight: '800',
    },
    qualityBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: colors.border,
        borderRadius: radii.xs,
        borderWidth: 1,
        flexShrink: 1,
        maxWidth: 160,
        minWidth: 0,
        paddingHorizontal: 9,
        paddingVertical: 4,
    },
    qualityBadgeDirect: {
        backgroundColor: 'rgba(212, 192, 138, 0.15)',
        borderColor: colors.accentLine,
    },
    qualityBadgeRow: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        gap: 6,
        justifyContent: 'center',
        marginTop: spacing.md,
        width: '100%',
    },
    qualityBadgeText: {
        color: colors.text,
        flexShrink: 1,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.6,
        lineHeight: 14,
    },
    qualityBadgeTextDirect: {
        color: colors.accentBright,
    },
    qualityBadgeTextTranscoded: {
        color: '#e0a06d',
    },
    qualityBadgeTextUnknown: {
        color: colors.muted,
    },
    qualityBadgeTranscoded: {
        backgroundColor: 'rgba(220, 110, 40, 0.18)',
        borderColor: 'rgba(220, 110, 40, 0.34)',
    },
    qualityBadgeUnknown: {
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        borderColor: 'rgba(255, 255, 255, 0.14)',
    },
    qualityMetaRow: {
        // Shared layout for the inline quality marker on tiles/rows: keeps the
        // subtitle and the chip/spec on one line so nothing on top of the
        // artwork — and no extra height that would clip a fixed-size tile.
        alignItems: 'center',
        flexDirection: 'row',
        gap: 6,
        minWidth: 0,
    },
    qualityMetaSubtitle: {
        flexShrink: 1,
        minWidth: 0,
    },
    qualitySpec: {
        color: colors.accent,
        flexShrink: 0,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
    },
    row: {
        borderColor: colors.border,
        borderTopWidth: 1,
        paddingVertical: spacing.md,
    },
    rowTitle: {
        color: colors.text,
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 4,
    },
    secondaryButton: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 8,
        height: 40,
        justifyContent: 'center',
        marginTop: spacing.md,
    },
    secondaryButtonText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '800',
    },
    title: {
        color: colors.text,
        fontSize: 34,
        fontFamily: fonts.heading,
        letterSpacing: 0,
    },
    warningText: {
        color: colors.accent,
    },
});
