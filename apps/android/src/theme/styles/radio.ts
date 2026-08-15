import { StyleSheet } from 'react-native';
import { HOME_EDGE_PADDING, PAGE_TOP_INSET } from '../layout';
import { colors, fonts, spacing } from '../tokens';

/** Radio tab: station grid, hero, add-station sheet. */
export const radioStyles = StyleSheet.create({
    // samo-radio: the server's own audio output, remoted onto the phone. It
    // sits above the station grid because it is a status readout first — you
    // look at it to see what the stereo is doing — and controls second.
    samoRadioPanel: {
        backgroundColor: colors.surface,
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        gap: 6,
        marginBottom: spacing.md,
        // No horizontal margin: radioScrollContent already pads to
        // HOME_EDGE_PADDING, and adding it again inset the panel twice as far
        // as every station tile below it.
        padding: spacing.md,
    },
    samoRadioHead: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    samoRadioEyebrow: {
        color: colors.accent,
        fontFamily: fonts.mono,
        fontSize: 12,
        letterSpacing: 1,
    },
    samoRadioStatus: {
        color: colors.muted,
        fontFamily: fonts.mono,
        fontSize: 11,
        letterSpacing: 1,
    },
    samoRadioTitle: {
        color: colors.text,
        fontSize: 17,
        fontWeight: '700',
    },
    samoRadioSubtitle: {
        color: colors.muted,
        fontSize: 13,
    },
    samoRadioMeta: {
        color: colors.muted,
        fontFamily: fonts.mono,
        fontSize: 12,
    },
    samoRadioControls: {
        alignItems: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
    },
    samoRadioButton: {
        borderColor: 'rgba(255,255,255,0.16)',
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    samoRadioButtonPrimary: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    samoRadioButtonText: {
        color: colors.text,
        fontFamily: fonts.mono,
        fontSize: 12,
        letterSpacing: 1,
    },
    samoRadioButtonTextPrimary: {
        color: colors.background,
    },
    samoRadioVolume: {
        color: colors.text,
        fontFamily: fonts.mono,
        fontSize: 13,
        minWidth: 46,
        textAlign: 'center',
    },
    samoRadioChannelRow: {
        gap: 8,
        paddingVertical: 8,
    },
    samoRadioChannelChip: {
        borderColor: 'rgba(255,255,255,0.16)',
        borderWidth: 1,
        maxWidth: 200,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    samoRadioChannelChipActive: {
        borderColor: colors.accent,
    },
    samoRadioChannelText: {
        color: colors.text,
        fontFamily: fonts.mono,
        fontSize: 12,
    },
    samoRadioError: {
        color: '#ff9a8a',
        fontSize: 12,
        marginTop: 6,
    },
    addRadioActions: {
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    addRadioForm: {
        paddingBottom: spacing.lg,
    },
    addRadioLabel: {
        color: colors.muted,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.4,
        marginTop: spacing.md,
        textTransform: 'uppercase',
    },
    addRadioThumbnailButton: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 8,
        height: 36,
        justifyContent: 'center',
        paddingHorizontal: spacing.sm,
    },
    addRadioThumbnailButtonText: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '800',
    },
    addRadioThumbnailImage: {
        height: '100%',
        width: '100%',
    },
    addRadioThumbnailMeta: {
        flex: 1,
        minWidth: 0,
    },
    addRadioThumbnailPicker: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 8,
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
        minHeight: 64,
        padding: 8,
    },
    addRadioThumbnailPreview: {
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 6,
        height: 48,
        justifyContent: 'center',
        overflow: 'hidden',
        width: 48,
    },
    addRadioThumbnailSubtitle: {
        color: colors.muted,
        fontSize: 12,
        fontFamily: fonts.mono,
        fontWeight: '600',
        lineHeight: 16,
        marginTop: 2,
    },
    addRadioThumbnailTitle: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '800',
    },
    addRadioServerBlock: {
        marginBottom: spacing.xs,
    },
    addRadioServerPill: {
        alignItems: 'center',
        borderColor: 'rgba(255,255,255,0.10)',
        borderRadius: 999,
        borderWidth: 1,
        marginRight: spacing.sm,
        maxWidth: 180,
        paddingHorizontal: spacing.md,
        paddingVertical: 9,
    },
    addRadioServerPillActive: {
        backgroundColor: 'rgba(212,192,138,0.16)',
        borderColor: 'rgba(212,192,138,0.45)',
    },
    addRadioServerPillText: {
        color: colors.muted,
        fontSize: 13,
        fontWeight: '700',
    },
    addRadioServerPillTextActive: {
        color: colors.accent,
    },
    addRadioSheet: {
        backgroundColor: '#000000',
        borderColor: 'rgba(255,255,255,0.06)',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderTopWidth: StyleSheet.hairlineWidth,
        maxHeight: '88%',
        paddingBottom: 24,
        paddingHorizontal: spacing.lg,
        paddingTop: 8,
    },
    addRadioSuccess: {
        color: colors.accent,
        fontSize: 13,
        fontWeight: '700',
        lineHeight: 18,
        marginTop: spacing.md,
    },
    radioCard: {
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderRadius: 0,
        marginBottom: spacing.xs,
        paddingHorizontal: spacing.xs,
        paddingVertical: spacing.xs,
        width: '48.5%',
    },
    radioCardArtwork: {
        aspectRatio: 1,
        borderRadius: 0,
        marginBottom: spacing.sm,
        width: '100%',
    },
    radioCardArtworkFallback: {
        alignItems: 'center',
        aspectRatio: 1,
        backgroundColor: 'rgba(232, 213, 176, 0.12)',
        borderRadius: 0,
        justifyContent: 'center',
        marginBottom: spacing.sm,
        width: '100%',
    },
    radioCardMeta: {
        color: colors.muted,
        fontSize: 11,
        fontFamily: fonts.mono,
        lineHeight: 14,
        marginTop: 2,
        textAlign: 'center',
    },
    radioCardNowPlaying: {
        color: colors.accent,
        fontSize: 11,
        fontFamily: fonts.mono,
        marginTop: 2,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    radioCardTitle: {
        color: colors.text,
        fontSize: 14,
        fontFamily: fonts.mono,
        lineHeight: 18,
        marginBottom: 2,
        textAlign: 'center',
    },
    radioGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 2,
    },
    radioGridHeader: {
        alignItems: 'flex-end',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.xl,
    },
    radioGridHeaderCompact: {
        marginTop: 0,
    },
    /** Title-less Radio header: sort pinned left, add-station pinned right. */
    /** The "+" (and friends) beside the sort chip — same bordered treatment
     *  so the top row reads as one control set on every page. */
    radioAddIconButton: {
        alignItems: 'center',
        borderColor: 'rgba(255, 255, 255, 0.14)',
        borderRadius: 999,
        borderWidth: 1,
        height: 32,
        justifyContent: 'center',
        width: 32,
    },
    radioEmptyText: {
        marginTop: spacing.md,
    },
    radioHero: {
        alignItems: 'center',
        backgroundColor: colors.panel,
        borderRadius: 8,
        flexDirection: 'row',
        gap: spacing.md,
        minHeight: 154,
        padding: spacing.md,
    },
    radioHeroArtwork: {
        borderRadius: 22,
        height: 106,
        width: 106,
    },
    radioHeroArtworkFallback: {
        alignItems: 'center',
        backgroundColor: 'rgba(232, 213, 176, 0.12)',
        borderRadius: 22,
        height: 106,
        justifyContent: 'center',
        width: 106,
    },
    radioHeroArtworkWrap: {
        flexShrink: 0,
    },
    radioHeroEyebrow: {
        color: colors.accent,
        fontSize: 11,
        fontFamily: fonts.mono,
        letterSpacing: 0.5,
        marginBottom: 4,
        textTransform: 'uppercase',
        width: 250,
    },
    radioHeroPlay: {
        alignItems: 'center',
        alignSelf: 'flex-end',
        backgroundColor: colors.accent,
        borderRadius: 999,
        height: 48,
        justifyContent: 'center',
        width: 48,
    },
    radioHeroSubtitle: {
        color: colors.muted,
        fontSize: 13,
        fontFamily: fonts.mono,
        lineHeight: 18,
        marginTop: 4,
    },
    radioHeroText: {
        flex: 1,
        minWidth: 0,
    },
    radioHeroTitle: {
        color: colors.text,
        fontSize: 28,
        fontFamily: fonts.heading,
        lineHeight: 32,
    },
    radioSectionTitle: {
        color: colors.text,
        fontSize: 20,
        fontFamily: fonts.mono,
        marginBottom: 4,
        marginTop: 4,
    },
    /** Bare (empty / error) Radio states. Radio now owns its own scroll host
     *  for the search drawer, so it supplies the horizontal inset the shared
     *  tab ScrollView used to give it. */
    radioScreen: {
        paddingHorizontal: HOME_EDGE_PADDING,
        paddingTop: PAGE_TOP_INSET,
    },
    /** Content container for Radio's ScrollView: status-bar clearance at the
     *  top, and the HOME_EDGE_PADDING inset so its rows sit on the same column
     *  edges Home's list content does. */
    radioScrollContent: {
        paddingHorizontal: HOME_EDGE_PADDING,
        paddingTop: PAGE_TOP_INSET,
    },
    /** THE sort chip every catalog page shares (Playlists, Radio, Books) —
     *  bordered pill, accent label. Do not fork per page. */
    radioSortButton: {
        alignItems: 'center',
        borderColor: 'rgba(255, 255, 255, 0.14)',
        borderRadius: 999,
        borderWidth: 1,
        justifyContent: 'center',
        minHeight: 32,
        paddingHorizontal: 12,
    },
    radioSortText: {
        color: colors.accent,
        fontFamily: fonts.headingMedium,
        fontSize: 12,
        letterSpacing: 0.2,
        lineHeight: 17,
    },
});
