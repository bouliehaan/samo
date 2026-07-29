import { Platform, StyleSheet } from 'react-native';
import {
    FULL_PLAYER_ARTWORK_SIZE,
    FULL_PLAYER_EXPANDED_TOP,
    FULL_PLAYER_PADDING_BOTTOM,
    FULL_PLAYER_PADDING_TOP,
    MINI_PLAYER_ARTWORK_SIZE,
    MINI_PLAYER_BOTTOM,
    MINI_PLAYER_HEIGHT,
    MINI_PLAYER_RADIUS,
    MINI_PLAYER_VERTICAL_PADDING,
    QUEUE_SHEET_HEADER_ROW_HEIGHT,
    QUEUE_SHEET_HEIGHT,
    QUEUE_SHEET_ROW_HEIGHT,
    SCREEN_HEIGHT,
    SCREEN_WIDTH,
} from '../layout';
import { colors, elevation, fonts, spacing } from '../tokens';

/** Player surfaces: full player, mini player, queue sheet, output picker, seek. */
export const playerStyles = StyleSheet.create({
    artworkZoomCloseButton: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.10)',
        borderRadius: 999,
        height: 44,
        justifyContent: 'center',
        position: 'absolute',
        right: spacing.lg,
        top: Platform.OS === 'android' ? 42 : 24,
        width: 44,
    },
    artworkZoomImage: {
        height: '100%',
        width: '100%',
    },
    artworkZoomImageFrame: {
        alignSelf: 'center',
        aspectRatio: 1,
        borderRadius: 4,
        overflow: 'hidden',
        width: SCREEN_WIDTH - spacing.lg * 2,
    },
    artworkZoomModal: {
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.94)',
        flex: 1,
        justifyContent: 'center',
    },
    outputPickerEmpty: {
        color: colors.muted,
        fontSize: 14,
        lineHeight: 19,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    outputPickerError: {
        color: '#ff9a8a',
        fontSize: 13,
        lineHeight: 18,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.sm,
    },
    outputPickerIcon: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderColor: 'rgba(255,255,255,0.08)',
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        height: 36,
        justifyContent: 'center',
        width: 36,
    },
    outputPickerIconLabel: {
        color: colors.text,
        fontSize: 11,
        fontWeight: '900',
        lineHeight: 13,
        maxWidth: 28,
        textAlign: 'center',
    },
    outputPickerIconLabelSelected: {
        color: colors.accent,
    },
    outputPickerIconSelected: {
        backgroundColor: 'rgba(212,192,138,0.16)',
        borderColor: 'rgba(212,192,138,0.34)',
    },
    outputPickerList: {
        paddingBottom: spacing.sm,
    },
    outputPickerLoading: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120,
    },
    outputPickerScroll: {
        maxHeight: 430,
    },
    outputPickerRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 12,
        minHeight: 60,
        paddingHorizontal: spacing.lg,
        paddingVertical: 8,
    },
    outputPickerRowBody: {
        flex: 1,
        minWidth: 0,
    },
    outputPickerRowDisabled: {
        opacity: 0.48,
    },
    outputPickerRowPressed: {
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    outputPickerRowSelected: {
        backgroundColor: 'rgba(212,192,138,0.08)',
    },
    outputPickerSectionLabel: {
        color: 'rgba(255,255,255,0.42)',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
        textTransform: 'uppercase',
    },
    outputPickerState: {
        alignItems: 'center',
        height: 28,
        justifyContent: 'center',
        width: 28,
    },
    outputPickerSubtitle: {
        color: colors.muted,
        fontSize: 13,
        fontFamily: fonts.mono,
        marginTop: 2,
    },
    outputPickerTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
    },
    fullPlayer: {
        backgroundColor: '#000000',
        elevation: 999,
        flexDirection: 'column',
        // Spans the full physical screen. The shell's parent starts at
        // physical y=0 (safeArea no longer pads for the status bar — screens
        // self-clear with STATUS_BAR_INSET), so the open player docks at
        // top: 0 and the `translateY: SCREEN_HEIGHT` parking moves it fully
        // off-screen when closed. A negative top here would double-shift:
        // header under the clock, and an inset-tall strip of the parked shell
        // peeking at the bottom edge.
        height: SCREEN_HEIGHT,
        left: 0,
        overflow: 'hidden',
        position: 'absolute',
        right: 0,
        top: FULL_PLAYER_EXPANDED_TOP,
        zIndex: 10000,
    },
    fullPlayerExpandedPanel: {
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
    },
    fullPlayerArtwork: {
        borderRadius: 4,
        height: '100%',
        width: '100%',
    },
    fullPlayerArtworkFallback: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        borderColor: 'rgba(255, 255, 255, 0.12)',
        borderRadius: 4,
        borderWidth: 1,
        height: '100%',
        justifyContent: 'center',
        width: '100%',
    },
    fullPlayerArtworkLetter: {
        color: colors.accent,
        fontSize: 72,
        fontWeight: '900',
    },
    fullPlayerArtworkShadow: {
        aspectRatio: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.08)',
        borderRadius: 4,
        elevation: 12,
        flexShrink: 1,
        height: FULL_PLAYER_ARTWORK_SIZE,
        shadowColor: '#000000',
        shadowOffset: { height: 14, width: 0 },
        shadowOpacity: 0.26,
        shadowRadius: 22,
        transform: [{ translateY: 8 }],
        width: FULL_PLAYER_ARTWORK_SIZE,
    },
    fullPlayerArtworkWrap: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    fullPlayerArtworkHeroSlot: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullPlayerBg: {
        backgroundColor: '#000000',
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
    },
    fullPlayerBottom: {
        flexShrink: 0,
    },
    fullPlayerBottomLifted: {
        marginBottom: 34,
    },
    fullPlayerBottomBar: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 24,
    },
    fullPlayerBottomBarButton: {
        alignItems: 'center',
        height: 40,
        justifyContent: 'center',
        width: 40,
    },
    fullPlayerCastButton: {
        bottom: 0,
        height: 40,
        left: 0,
        opacity: 0.01,
        position: 'absolute',
        right: 0,
        top: 0,
        width: 40,
    },
    fullPlayerBottomBarSpacer: {
        flex: 1,
    },
    fullPlayerCastStatus: {
        color: colors.accent,
        flex: 1,
        fontSize: 12,
        fontWeight: '700',
        marginHorizontal: spacing.sm,
        textAlign: 'center',
    },
    fullPlayerCollapsedSurface: {
        backgroundColor: colors.surface,
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
    },
    fullPlayerDither: {
        // Soft-light blend means the noise PNG (mean grey 128, ±18 spread)
        // perturbs the underlying gradient by ±2-3/255 per pixel without
        // shifting average brightness. That's exactly enough to dither
        // away the 8-bit quantization steps that produce visible banding
        // in long, slow gradients — and below the threshold where the
        // grain itself becomes perceivable.
        mixBlendMode: 'soft-light',
    },
    fullPlayerContent: {
        flex: 1,
        minHeight: 0,
        paddingBottom: FULL_PLAYER_PADDING_BOTTOM,
        paddingHorizontal: spacing.lg,
        paddingTop: FULL_PLAYER_PADDING_TOP,
    },
    fullPlayerControlSide: {
        alignItems: 'center',
        flex: 1,
        flexDirection: 'row',
        gap: 16,
        minWidth: 0,
    },
    fullPlayerControlSideLeft: {
        justifyContent: 'flex-end',
    },
    fullPlayerControlSideRight: {
        justifyContent: 'flex-start',
    },
    fullPlayerControlSideLongForm: {
        gap: 14,
    },
    longFormSkipLabel: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
        fontVariant: ['tabular-nums'],
    },
    fullPlayerControls: {
        alignItems: 'center',
        flexDirection: 'row',
        marginTop: 28,
    },
    fullPlayerDragHandle: {
        alignItems: 'center',
        paddingBottom: 6,
        paddingTop: 4,
    },
    fullPlayerDragPill: {
        backgroundColor: 'rgba(255, 255, 255, 0.32)',
        borderRadius: 999,
        height: 4,
        width: 40,
    },
    fullPlayerErrorText: {
        color: '#ffb1a3',
        fontSize: 12,
        lineHeight: 16,
        marginTop: spacing.md,
        textAlign: 'center',
    },
    fullPlayerHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    fullPlayerHeaderButton: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 999,
        height: 44,
        justifyContent: 'center',
        width: 44,
    },
    fullPlayerHeaderSpacer: {
        flex: 1,
    },
    /** Circular artist photo button that replaces the down-caret on music tracks. */
    fullPlayerArtistAvatarButton: {
        alignItems: 'center',
        borderRadius: 999,
        height: 44,
        justifyContent: 'center',
        overflow: 'hidden',
        width: 44,
    },
    // Avatar visual is smaller than its 44dp Pressable: a photo reads heavier
    // than the icon-in-circle buttons at the same size, so it gets 38dp while
    // the tap target keeps the shared 44dp footprint.
    fullPlayerArtistAvatar: {
        borderRadius: 999,
        height: 38,
        width: 38,
    },
    fullPlayerArtistAvatarFallback: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 999,
        height: 38,
        justifyContent: 'center',
        width: 38,
    },
    fullPlayerArtistAvatarLetter: {
        color: 'rgba(245, 245, 245, 0.7)',
        fontFamily: fonts.heading,
        fontSize: 18,
        letterSpacing: 0.2,
    },
    fullPlayerMetadata: {
        alignItems: 'stretch',
        marginTop: spacing.lg,
        paddingHorizontal: 0,
    },
    fullPlayerProgress: {
        marginTop: 22,
    },
    fullPlayerQualityRow: {
        marginTop: spacing.sm,
    },
    /** Single tappable pill that collapses the quality badges into one togglable element. */
    fullPlayerCollapsedPill: {
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 6,
        borderWidth: 1,
        flexDirection: 'row',
        marginTop: spacing.sm,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    fullPlayerCollapsedPillDirect: {
        backgroundColor: 'rgba(232, 213, 176, 0.08)',
        borderColor: 'rgba(232, 213, 176, 0.22)',
    },
    fullPlayerCollapsedPillTranscoded: {
        backgroundColor: 'rgba(180, 160, 120, 0.06)',
        borderColor: 'rgba(180, 160, 120, 0.16)',
    },
    fullPlayerCollapsedPillTappable: {
        paddingRight: 7,
    },
    fullPlayerCollapsedPillText: {
        color: 'rgba(245, 245, 245, 0.72)',
        fontFamily: fonts.monoBold,
        fontSize: 12,
        letterSpacing: 0.4,
    },
    fullPlayerCollapsedPillTextDirect: {
        color: 'rgba(232, 213, 176, 0.92)',
    },
    fullPlayerCollapsedPillChevron: {
        color: 'rgba(245, 245, 245, 0.38)',
        fontFamily: fonts.headingMedium,
        fontSize: 14,
        marginLeft: 4,
    },
    /** Overflow-clipping wrapper for the marquee subtitle. */
    fullPlayerMarqueeContainer: {
        flexDirection: 'row',
        overflow: 'hidden',
    },
    /**
     * The track the text is actually MEASURED in, and the whole reason the
     * ticker works.
     *
     * Android does not size a text node by its content — it sizes it by the
     * space it is offered. Yoga measures the node with a MeasureMode of AtMost
     * and the parent's inner width, and RN's measureText clamps its result to
     * that bound (`numberOfLines={1}` also ellipsizes the line to fit). Put the
     * text straight in the clipping container above and it therefore measures
     * EXACTLY the container's width on every title, however long: overflow
     * comes back as zero and the ticker never starts. `flexDirection: row` and
     * `flexShrink: 0` do not help — they govern how a box is resized after
     * measurement, not the width the measurement was handed.
     *
     * So hand it a width no title will reach. The bound is then never the
     * binding constraint, the node reports its true intrinsic width, and the
     * difference against the container is a real overflow to scroll. The track
     * spills far past the container and is clipped by it, which is exactly the
     * window the marquee scrolls text through.
     */
    fullPlayerMarqueeTrack: {
        flexDirection: 'row',
        flexShrink: 0,
        // ~285 characters at the 24pt title size — an order of magnitude past
        // the longest real audiobook or podcast title. Cheap: the view is
        // clipped, so nothing off-window is ever drawn.
        width: 4000,
    },
    fullPlayerMarqueeText: {
        flexShrink: 0,
    },
    fullPlayerSleepLabel: {
        color: colors.accent,
        fontSize: 12,
        fontWeight: '600',
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    fullPlayerSubtitle: {
        color: 'rgba(245, 245, 245, 0.58)',
        fontSize: 18,
        fontFamily: fonts.mono,
        fontWeight: '500',
        lineHeight: 23,
        marginTop: 4,
        textAlign: 'left',
    },
    fullPlayerTime: {
        color: 'rgba(245, 245, 245, 0.58)',
        fontSize: 13,
        fontWeight: '600',
    },
    fullPlayerTimeRight: {
        textAlign: 'right',
    },
    fullPlayerTimeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.xs,
    },
    fullPlayerTitle: {
        color: '#ffffff',
        fontSize: 24,
        fontFamily: fonts.mono,
        fontWeight: '700',
        letterSpacing: 0,
        lineHeight: 30,
        textAlign: 'left',
    },
    miniPlayer: {
        // The mini player is CONTENT riding on the shared frosted dock pane
        // (BottomChromeBackdrop) — it paints no surface of its own, so there is
        // no boundary (and no seam) between it and the tab bar below.
        backgroundColor: 'transparent',
        borderTopLeftRadius: MINI_PLAYER_RADIUS,
        borderTopRightRadius: MINI_PLAYER_RADIUS,
        bottom: MINI_PLAYER_BOTTOM,
        // Pinned to the SAME constant the glass pane (bottomChromeWithMini) is
        // sized with. Without this the row is intrinsically sized, and a
        // 3-line track (radio/audiobook) used to grow it past the pane so the
        // title crowded the glass's top edge. Content is budgeted to fit: see
        // miniPlayerTitle/miniPlayerSubtitle line metrics.
        height: MINI_PLAYER_HEIGHT,
        left: 0,
        overflow: 'hidden',
        position: 'absolute',
        right: 0,
        // Above the expanding shell and scroll content; no elevation — that
        // draws an Android drop shadow which broke the seam with the tab bar.
        zIndex: 10001,
    },
    miniPlayerArtwork: {
        borderRadius: 10,
        height: MINI_PLAYER_ARTWORK_SIZE,
        width: MINI_PLAYER_ARTWORK_SIZE,
    },
    miniPlayerArtworkContainer: {
        height: MINI_PLAYER_ARTWORK_SIZE,
        position: 'relative',
        width: MINI_PLAYER_ARTWORK_SIZE,
    },
    miniPlayerArtworkSlot: {
        ...StyleSheet.absoluteFill,
    },
    miniPlayerArtworkFallback: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        height: MINI_PLAYER_ARTWORK_SIZE,
        justifyContent: 'center',
        width: MINI_PLAYER_ARTWORK_SIZE,
    },
    miniPlayerArtworkLetter: {
        color: colors.text,
        fontSize: 23,
        fontWeight: '800',
    },
    miniPlayerPlayButton: {
        alignItems: 'center',
        height: 50,
        justifyContent: 'center',
        width: 50,
    },
    miniPlayerSubtitle: {
        color: colors.muted,
        fontSize: 14,
        fontFamily: fonts.mono,
        includeFontPadding: false,
        lineHeight: 18,
    },
    miniPlayerText: {
        flex: 1,
    },
    // Line metrics are LOAD-BEARING: playback metadata is up to three lines
    // (radio/audiobook), and 20 + 2 + 18 + 18 must equal
    // MINI_PLAYER_ARTWORK_SIZE (58) so the tallest text block never outgrows
    // the row the glass pane budgets for. Android's default line box for
    // 16px bold (~24 with font padding) is what pushed 3-line tracks past
    // the pane's top edge.
    miniPlayerTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '700',
        includeFontPadding: false,
        lineHeight: 20,
        marginBottom: 2,
    },
    miniPlayerTitleRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 7,
        minWidth: 0,
    },
    miniPlayerTouchable: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 13,
        paddingHorizontal: 18,
        paddingVertical: MINI_PLAYER_VERTICAL_PADDING,
    },
    playerControlButton: {
        alignItems: 'center',
        borderRadius: 999,
        height: 56,
        justifyContent: 'center',
        width: 56,
    },
    playerControlButtonCompact: {
        height: 52,
        width: 52,
    },
    playerControlButtonPrimary: {
        height: 88,
        width: 88,
    },
    playerControlButtonSpacer: {
        height: 56,
        width: 56,
    },
    /** Fixed center slot for the morphing play button at progress=1. */
    playerControlPrimarySlot: {
        alignItems: 'center',
        height: 88,
        justifyContent: 'center',
        marginHorizontal: 12,
        width: 88,
    },
    /** Thin dimming layer over the home content while the player rises —
     *  the desk going dim under the card lifting off it. Sits below the
     *  player shell, above the page + tab bar. */
    playerWorldDim: {
        backgroundColor: '#000000',
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
        // Above page + tab bar (zIndex 10), below mini (10000) and full (9999).
        zIndex: 9000,
    },
    queueChapterNumber: {
        alignItems: 'center',
        height: 44,
        justifyContent: 'center',
        width: 44,
    },
    queueChapterNumberText: {
        color: colors.muted,
        fontSize: 14,
        fontWeight: '700',
    },
    queueNowPlayingIndicator: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 2,
        height: 18,
        width: 18,
    },
    queueRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 12,
        height: QUEUE_SHEET_ROW_HEIGHT,
        paddingHorizontal: spacing.lg,
    },
    /** Fixed-height shell so drag slot math can be pure arithmetic. */
    queueRowShell: {
        height: QUEUE_SHEET_ROW_HEIGHT,
    },
    queueRowContentWrap: {
        flex: 1,
        flexDirection: 'row',
    },
    queueRowPressable: {
        alignItems: 'center',
        flex: 1,
        flexDirection: 'row',
        gap: 12,
        height: QUEUE_SHEET_ROW_HEIGHT,
        paddingLeft: spacing.lg,
    },
    queueRowRemoveUnderlay: {
        ...StyleSheet.absoluteFill,
        alignItems: 'flex-end',
        backgroundColor: '#58251f',
        justifyContent: 'center',
        paddingRight: spacing.lg,
    },
    queueRowRemoveText: {
        color: '#ffb1a3',
        fontFamily: fonts.monoMedium,
        fontSize: 12,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
    queueDragHandle: {
        alignItems: 'center',
        height: QUEUE_SHEET_ROW_HEIGHT,
        justifyContent: 'center',
        width: 52,
    },
    queueRowDragSource: {
        opacity: 0.3,
    },
    /** Floating copy of the dragged row, rendered above the list viewport. */
    queueDragTwin: {
        backgroundColor: colors.surfaceHigh,
        borderColor: colors.borderStrong,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        elevation: 12,
        height: QUEUE_SHEET_ROW_HEIGHT,
        left: spacing.xs,
        position: 'absolute',
        right: spacing.xs,
        shadowColor: '#000',
        shadowOffset: { height: 6, width: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        top: 0,
        zIndex: 30,
    },
    /** Accent insertion line marking the drop slot while dragging. */
    queueDropIndicator: {
        backgroundColor: colors.accent,
        borderRadius: 1,
        height: 2,
        left: spacing.lg,
        position: 'absolute',
        right: spacing.lg,
        top: 0,
        zIndex: 20,
    },
    queueRowBody: {
        flex: 1,
        minWidth: 0,
    },
    queueRowPlayingBar: {
        backgroundColor: colors.accent,
        borderRadius: 1.5,
        height: 14,
        width: 3,
    },
    queueRowPlayingBarShort: {
        height: 9,
    },
    queueRowSubtitle: {
        color: colors.muted,
        fontSize: 13,
        fontFamily: fonts.mono,
        marginTop: 2,
    },
    queueRowThumb: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 6,
        height: 44,
        width: 44,
    },
    queueRowThumbFallback: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 6,
        height: 44,
        justifyContent: 'center',
        width: 44,
    },
    queueRowThumbLetter: {
        color: colors.muted,
        fontSize: 18,
        fontWeight: '700',
    },
    queueRowTitle: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '600',
    },
    queueSectionHeader: {
        height: QUEUE_SHEET_HEADER_ROW_HEIGHT,
        justifyContent: 'flex-end',
        paddingBottom: 6,
        paddingHorizontal: spacing.lg,
    },
    queueSectionHeaderText: {
        color: colors.muted,
        fontFamily: fonts.mono,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    queueSheet: {
        backgroundColor: 'rgba(12, 10, 8, 0.96)',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        bottom: 0,
        elevation: 1001,
        height: QUEUE_SHEET_HEIGHT,
        left: 0,
        position: 'absolute',
        right: 0,
        zIndex: 10001,
    },
    queueSheetBackdrop: {
        backgroundColor: '#000000',
        bottom: 0,
        elevation: 1000,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 10000,
    },
    queueSheetCloseButton: {
        alignItems: 'center',
        borderRadius: 999,
        height: 42,
        justifyContent: 'center',
        width: 42,
    },
    queueSheetContent: {
        paddingBottom: spacing.xl,
    },
    queueSheetEmpty: {
        color: colors.muted,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    queueSheetHandle: {
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.24)',
        borderRadius: 999,
        height: 4,
        marginBottom: 10,
        marginTop: 10,
        width: 38,
    },
    queueSheetHeader: {
        paddingTop: 2,
    },
    queueSheetScroll: {
        flex: 1,
    },
    queueSheetTitle: {
        color: colors.text,
        flex: 1,
        fontSize: 18,
        fontWeight: '800',
    },
    queueSheetTitleRow: {
        alignItems: 'center',
        flexDirection: 'row',
        paddingBottom: spacing.sm,
        paddingLeft: spacing.lg,
        paddingRight: spacing.sm,
    },
    seekSegment: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        borderRadius: 999,
        flexBasis: 0,
        height: 6,
        overflow: 'hidden',
    },
    seekSegmentFill: {
        borderRadius: 999,
        height: '100%',
        // Full width, then scaled about its LEFT edge by the animated style —
        // see SeekSegmentFill for why progress is a transform and not a width.
        // Without the origin the fill would grow from its centre, spilling out
        // of both ends of the segment instead of filling it left-to-right.
        transformOrigin: 'left center',
        width: '100%',
    },
    seekSegmentLive: {
        flex: 1,
    },
    seekSegmentLiveFill: {
        height: '100%',
        opacity: 0.95,
        width: '100%',
    },
    seekThumb: {
        borderRadius: 999,
        bottom: -3,
        // Anchored at 0 and moved with translateX, so the thumb never dirties
        // layout as it travels. See thumbAnimatedStyle in SegmentedSeekBar.
        left: 0,
        position: 'absolute',
        top: -3,
        width: 5,
    },
    segment: {
        alignItems: 'center',
        borderRadius: 7,
        justifyContent: 'center',
        minHeight: 38,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
    },
    segmentFlexible: {
        flexBasis: '48%',
        flexGrow: 0,
        flexShrink: 0,
        maxWidth: '48%',
    },
    segmentActive: {
        backgroundColor: colors.accentSoft,
    },
    segmentedControl: {
        backgroundColor: colors.background,
        borderRadius: 8,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        padding: 4,
    },
    segmentedSeekTrack: {
        alignItems: 'stretch',
        flexDirection: 'row',
        height: 14,
        paddingVertical: 4,
    },
    segmentLabel: {
        color: colors.muted,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    segmentLabelActive: {
        color: colors.accent,
    },
    sleepPill: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 999,
        flexBasis: '30%',
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 14,
    },
    sleepPillActive: {
        backgroundColor: 'rgba(232, 213, 176, 0.18)',
        borderColor: colors.accent,
        borderWidth: 1,
    },
    sleepPillGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        paddingBottom: 12,
        paddingHorizontal: spacing.lg,
        paddingTop: 4,
    },
    sleepPillText: {
        color: colors.text,
        fontSize: 15,
        fontWeight: '600',
    },
    sleepPillTextActive: {
        color: colors.accent,
    },
    sleepPillWide: {
        flexBasis: '100%',
    },
    streamInfoLabel: {
        color: colors.accent,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.4,
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    streamInfoRow: {
        paddingVertical: spacing.xs,
    },
    streamInfoValue: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 18,
    },
});
