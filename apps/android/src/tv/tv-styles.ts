import { StyleSheet } from 'react-native';

import { colors, fonts, radii } from '../theme/tokens';

/**
 * The TV in the phone's own materials — the same tokens, faces and cover
 * treatment — sized for a screen read from across a room.
 *
 * TV dp are already density-scaled by Android: a 1080p panel is a 960×540dp
 * canvas. Essential chrome stays inside the 5% overscan-safe area.
 */
export const TV_SAFE_Y = 27;
export const TV_SAFE_RIGHT = 48;
/** The rail: the phone's tab icons, standing on the left edge. */
export const TV_RAIL_WIDTH = 78;
/** Where content starts: the rail plus the seam the focus guide lives on. */
export const TV_CONTENT_LEFT = 104;
export const TV_TILE = 144;
export const TV_TILE_GAP = 16;
/** Room around a row for a focused tile's lift, so it is never clipped. */
export const TV_FOCUS_BLEED = 10;
export const TV_GRID_COLUMNS = 5;
/**
 * How far from a list's edges a scroll keeps the focused control. Android's
 * scroll views leave their fading edge clear of it, so this is also the fade:
 * focus never sits flush against an edge (or in a TV's overscan), and what is
 * cut off below fades instead of ending in a hard line.
 */
export const TV_SCROLL_EDGE = 64;
/** The same for shelves, whose edge is the screen's own, past the safe area. */
export const TV_SHELF_EDGE = 48;
export const TV_QUEUE_ROW_HEIGHT = 56;

const FOCUS_INK = colors.background;
const FOCUS_FILL = colors.accentBright;
const QUIET_FILL = 'rgba(255, 255, 255, 0.08)';

export const tvStyles = StyleSheet.create({
    root: { backgroundColor: colors.background, flex: 1 },
    homeChrome: {
        backgroundColor: colors.background,
        paddingLeft: TV_FOCUS_BLEED,
        paddingRight: TV_SAFE_RIGHT,
        paddingTop: 30,
        zIndex: 2,
    },
    homeHeader: {
        alignItems: 'baseline',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    homeTitle: {
        color: colors.text,
        fontFamily: fonts.heading,
        fontSize: 34,
        letterSpacing: -0.8,
    },
    homeKicker: {
        color: colors.faint,
        fontFamily: fonts.monoBold,
        fontSize: 11,
        letterSpacing: 1.8,
        textTransform: 'uppercase',
    },
    homeFilters: {
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
        paddingBottom: 2,
    },
    homeMessage: { marginLeft: TV_FOCUS_BLEED },
    homeScroll: {
        paddingTop: 6,
        paddingLeft: TV_FOCUS_BLEED,
        paddingRight: TV_SAFE_RIGHT,
        paddingBottom: TV_SCROLL_EDGE,
    },
    trackListHeading: { marginBottom: 10, marginTop: 28 },
    transportSelected: {
        backgroundColor: colors.accentSoft,
    },
    hidden: { display: 'none' },
    fill: { ...StyleSheet.absoluteFill },

    // ── Sign in ──────────────────────────────────────────────────────────
    setupFrame: { flex: 1, paddingHorizontal: '5%', paddingVertical: '5%' },
    brand: { color: colors.text, fontFamily: fonts.heading, fontSize: 38, marginBottom: 16 },
    // Sign-in is laid out across the screen, not down it: stacked, the brand
    // alone took a third of the height and pushed the code screen's buttons to
    // the bottom edge.
    setup: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 48 },
    setupIntro: { width: 280 },
    setupLogo: { height: 44, marginBottom: 14, width: 44 },
    // Room past the panel's edges for a focused control's outline, which a
    // scroll view would otherwise clip.
    setupPanel: { alignSelf: 'stretch', flex: 1, marginHorizontal: -TV_FOCUS_BLEED },
    setupContent: {
        flexGrow: 1,
        gap: 18,
        justifyContent: 'center',
        paddingHorizontal: TV_FOCUS_BLEED,
        paddingVertical: 8,
    },
    pairing: { alignItems: 'center', flexDirection: 'row', gap: 24 },
    pairingCopy: { flex: 1, gap: 8 },
    pairingCode: { color: colors.text, fontFamily: fonts.monoBold, fontSize: 38, letterSpacing: 5 },
    pairingUrl: { color: colors.text, fontFamily: fonts.mono },

    // ── Type ─────────────────────────────────────────────────────────────
    sectionTitle: {
        color: colors.muted,
        fontFamily: fonts.monoBold,
        fontSize: 12,
        letterSpacing: 1.4,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    text: { color: colors.text, fontFamily: fonts.body, fontSize: 17 },
    muted: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
    error: { color: '#ffb4ab', fontFamily: fonts.body, fontSize: 16 },
    eyebrow: {
        color: colors.accent,
        fontFamily: fonts.monoBold,
        fontSize: 11,
        letterSpacing: 1.4,
        textTransform: 'uppercase',
    },
    scroll: { gap: 18, paddingBottom: 24 },
    row: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

    // ── Buttons ──────────────────────────────────────────────────────────
    button: {
        alignItems: 'center',
        backgroundColor: QUIET_FILL,
        borderRadius: 10,
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'center',
        minHeight: 44,
        paddingHorizontal: 22,
    },
    buttonPrimary: { backgroundColor: 'rgba(255, 255, 255, 0.16)' },
    buttonSelected: { backgroundColor: colors.surfaceHigh },
    buttonFocused: {
        backgroundColor: FOCUS_FILL,
        outlineColor: FOCUS_FILL,
        outlineWidth: 2,
        outlineOffset: 2,
    },
    quietButton: { backgroundColor: 'transparent', minHeight: 38, paddingHorizontal: 16 },
    buttonText: { color: colors.text, fontFamily: fonts.body, fontSize: 16, fontWeight: '700' },
    buttonTextPrimary: { color: colors.text },
    buttonTextFocused: { color: FOCUS_INK },
    iconButton: { minHeight: 48, paddingHorizontal: 0, width: 48 },
    disabled: { opacity: 0.4 },

    // ── Fields ───────────────────────────────────────────────────────────
    field: { gap: 6 },
    input: {
        backgroundColor: colors.panel,
        borderColor: colors.borderStrong,
        borderRadius: 10,
        borderWidth: 3,
        color: colors.text,
        fontFamily: fonts.body,
        fontSize: 20,
        minHeight: 50,
        padding: 10,
    },
    inputFocused: { backgroundColor: colors.surfaceHigh, borderColor: FOCUS_FILL },
    placeholder: { color: colors.faint },

    // ── Rail ─────────────────────────────────────────────────────────────
    rail: {
        bottom: 0,
        left: 0,
        paddingBottom: TV_SAFE_Y,
        paddingLeft: 24,
        paddingRight: 16,
        paddingTop: 60,
        gap: 6,
        position: 'absolute',
        top: 0,
        width: TV_RAIL_WIDTH,
        zIndex: 20,
    },
    /** The samo mark, heading the rail rather than floating over content. */
    railLogo: {
        height: 26,
        left: 24 + 11,
        opacity: 0.85,
        position: 'absolute',
        top: 20,
        width: 26,
    },
    railItem: {
        alignItems: 'center',
        height: 46,
        justifyContent: 'center',
        width: 48,
    },
    /** The highlight behind an item, drawn behind its glyph. */
    railPill: {
        borderRadius: radii.md,
        bottom: 0,
        left: 0,
        position: 'absolute',
        top: 0,
        width: 48,
    },
    railPillFocused: { backgroundColor: colors.surfaceHigh, borderRadius: 14 },
    railPillSelected: {
        backgroundColor: 'transparent',
        borderLeftColor: colors.accent,
        borderLeftWidth: 3,
    },
    railNowArt: { backgroundColor: colors.surface, borderRadius: 4, height: 28, width: 28 },
    /** Playing, not paused: a dot on the cover. */
    railNowDot: {
        backgroundColor: colors.accentBright,
        borderColor: colors.background,
        borderRadius: 5,
        borderWidth: 2,
        height: 10,
        position: 'absolute',
        right: -4,
        top: -4,
        width: 10,
    },
    guide: {
        bottom: 0,
        left: TV_RAIL_WIDTH + 4,
        position: 'absolute',
        top: 0,
        width: 2,
    },

    // ── Pages ────────────────────────────────────────────────────────────
    content: { bottom: 0, left: TV_CONTENT_LEFT, position: 'absolute', right: 0, top: 0 },
    page: { ...StyleSheet.absoluteFill },
    pageScroll: {
        paddingBottom: TV_SCROLL_EDGE,
        paddingLeft: TV_FOCUS_BLEED,
        paddingRight: TV_SAFE_RIGHT,
        paddingTop: 48,
    },
    pageHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 14,
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    pageTitle: {
        color: colors.text,
        fontFamily: fonts.heading,
        fontSize: 30,
        letterSpacing: -0.6,
    },
    emptyText: {
        color: colors.muted,
        fontFamily: fonts.body,
        fontSize: 16,
        lineHeight: 23,
        marginTop: 8,
        maxWidth: 560,
    },
    emptyTitle: {
        color: colors.text,
        fontFamily: fonts.heading,
        fontSize: 22,
    },
    searchEmpty: {
        backgroundColor: colors.panel,
        borderRadius: 12,
        marginTop: 10,
        maxWidth: 680,
        paddingHorizontal: 24,
        paddingVertical: 22,
    },
    pills: { flexDirection: 'row', gap: 4, marginBottom: 0 },
    searchResults: { marginTop: 24 },
    pill: {
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderRadius: 0,
        justifyContent: 'center',
        minHeight: 40,
        paddingHorizontal: 14,
    },
    pillActive: {
        backgroundColor: 'transparent',
        borderBottomColor: colors.accent,
        borderBottomWidth: 2,
    },
    pillFocused: {
        backgroundColor: colors.surfaceHigh,
        borderRadius: 6,
        outlineColor: colors.accentLine,
        outlineWidth: 1,
        outlineOffset: 2,
    },
    pillText: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, fontWeight: '600' },
    pillTextActive: { color: colors.text },

    // ── Shelves and tiles ────────────────────────────────────────────────
    shelf: { marginBottom: 34 },
    /** Out to the screen's right edge, so covers pass under it (fading)
     *  rather than stopping at an invisible line inside the safe area. */
    shelfScroll: { marginLeft: -TV_FOCUS_BLEED, marginRight: -TV_SAFE_RIGHT },
    shelfRow: {
        gap: TV_TILE_GAP,
        paddingLeft: TV_FOCUS_BLEED,
        paddingRight: TV_SAFE_RIGHT,
        paddingVertical: 12,
    },
    pendingRow: { flexDirection: 'row', overflow: 'hidden' },
    pendingTile: { opacity: 0.5 },
    pendingTileWide: {
        backgroundColor: colors.surface,
        borderRadius: 10,
        height: 120,
        width: 330,
    },
    tile: { width: TV_TILE },
    tileWide: {
        alignItems: 'center',
        backgroundColor: colors.panel,
        borderRadius: 10,
        flexDirection: 'row',
        gap: 14,
        padding: 12,
        width: 330,
    },
    tileArt: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        height: TV_TILE,
        width: TV_TILE,
    },
    tileArtWide: { height: 96, width: 96 },
    tileArtRound: { borderRadius: TV_TILE / 2 },
    /** Focus is drawn on the cover itself: the border follows its radius
     *  (round for artists) and, inside the box, never moves the art beside it. */
    tileArtFocused: { borderColor: colors.accent, borderWidth: 2 },
    tileWideFocused: { backgroundColor: colors.surfaceHigh },
    tileMeta: { alignItems: 'flex-start', flexDirection: 'row', gap: 6 },
    tileMetaText: { flex: 1, minWidth: 0 },
    tileText: { marginTop: 9 },
    tileTextWide: { flex: 1, marginTop: 0 },
    tileTitle: {
        color: colors.text,
        fontFamily: fonts.body,
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 19,
    },
    tileTitleFocused: { color: colors.accentBright },
    tileSubtitle: {
        color: colors.muted,
        fontFamily: fonts.body,
        fontSize: 13,
        lineHeight: 17,
        marginTop: 3,
    },
    centered: { textAlign: 'center' },
    tileProgressTrack: {
        backgroundColor: colors.surfaceHigh,
        borderRadius: 2,
        height: 3,
        marginTop: 7,
        overflow: 'hidden',
    },
    tileProgressFill: { backgroundColor: colors.accent, height: 3 },
    viewAllArt: {
        alignItems: 'center',
        backgroundColor: colors.panel,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        height: TV_TILE,
        justifyContent: 'center',
        width: TV_TILE,
    },
    viewAllArtFocused: { borderColor: colors.accent, borderWidth: 2 },
    viewAllText: { color: colors.text, fontFamily: fonts.body, fontSize: 16, fontWeight: '800' },
    gridRow: { flexDirection: 'row', gap: TV_TILE_GAP, paddingVertical: 10 },

    // ── Home hero ────────────────────────────────────────────────────────
    hero: {
        alignItems: 'center',
        backgroundColor: colors.background,
        flexDirection: 'row',
        gap: 28,
        marginBottom: 28,
        minHeight: 220,
        overflow: 'hidden',
        paddingBottom: 30,
        paddingTop: 18,
    },
    heroArt: { backgroundColor: colors.surface, borderRadius: 8, height: 176, width: 176 },
    heroCopy: { flex: 1, gap: 4 },
    heroTitle: {
        color: colors.text,
        fontFamily: fonts.heading,
        fontSize: 32,
        letterSpacing: -0.6,
        lineHeight: 33,
    },
    heroSubtitle: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
    heroActions: { flexDirection: 'row', gap: 12, marginTop: 12 },

    // ── Detail ───────────────────────────────────────────────────────────
    detailHeader: {
        alignItems: 'flex-end',
        flexDirection: 'row',
        gap: 28,
        marginBottom: 26,
    },
    /** The page's wash, carried under the rail so it has no seam there. */
    detailBackdrop: { ...StyleSheet.absoluteFill, left: -TV_CONTENT_LEFT },
    detailFooter: { marginTop: 24 },
    detailArt: { backgroundColor: colors.surface, borderRadius: 8, height: 200, width: 200 },
    detailArtRound: { borderRadius: 92 },
    detailCopy: { flex: 1, gap: 6, paddingBottom: 2 },
    detailType: {
        color: colors.muted,
        fontFamily: fonts.monoBold,
        fontSize: 12,
        letterSpacing: 1.6,
        textTransform: 'uppercase',
    },
    detailTitle: {
        color: colors.text,
        fontFamily: fonts.heading,
        fontSize: 32,
        letterSpacing: -0.7,
        lineHeight: 37,
    },
    detailSubtitle: { color: colors.muted, fontFamily: fonts.body, fontSize: 16 },
    detailActions: { flexDirection: 'row', gap: 12, marginTop: 14 },
    track: {
        alignItems: 'center',
        borderRadius: 8,
        flexDirection: 'row',
        gap: 16,
        height: 62,
        paddingHorizontal: 16,
    },
    trackFocused: {
        backgroundColor: colors.surfaceHigh,
        outlineColor: colors.accentLine,
        outlineWidth: 1,
        outlineOffset: 2,
    },
    trackIndex: {
        color: colors.muted,
        fontFamily: fonts.mono,
        fontSize: 14,
        textAlign: 'right',
        width: 32,
    },
    trackArt: { backgroundColor: colors.surface, borderRadius: 3, height: 40, width: 40 },
    trackCopy: { flex: 1, minWidth: 0 },
    trackTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
    trackSubtitle: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, marginTop: 3 },
    trackMeta: { color: colors.muted, fontFamily: fonts.mono, fontSize: 13 },
    trackPlaying: { color: colors.accent },
    trackInkFocused: { color: FOCUS_INK },

    // ── Now Playing ──────────────────────────────────────────────────────
    player: { ...StyleSheet.absoluteFill, backgroundColor: colors.background, zIndex: 40 },
    playerEmpty: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 64,
    },
    playerEmptyTitle: {
        color: colors.text,
        fontFamily: fonts.heading,
        fontSize: 34,
        textAlign: 'center',
    },
    playerEmptyText: {
        color: colors.muted,
        fontFamily: fonts.body,
        fontSize: 18,
        marginTop: 10,
        textAlign: 'center',
    },
    playerEmptyButton: { marginTop: 26 },
    playerBody: {
        alignItems: 'center',
        flex: 1,
        flexDirection: 'row',
        gap: 60,
        paddingHorizontal: 64,
        paddingTop: 96,
        paddingBottom: 86,
    },
    playerArt: { backgroundColor: colors.surface, borderRadius: 4, height: 304, width: 304 },
    playerInfo: { flex: 1, minWidth: 0 },
    playerEyebrow: {
        color: colors.muted,
        fontFamily: fonts.monoBold,
        fontSize: 12,
        letterSpacing: 1.6,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    playerTitle: {
        color: colors.text,
        fontFamily: fonts.heading,
        fontSize: 34,
        letterSpacing: -0.8,
        lineHeight: 40,
    },
    playerSubtitle: {
        color: '#b8c0ca',
        fontFamily: fonts.body,
        fontSize: 19,
        lineHeight: 26,
        marginTop: 10,
    },
    playerFooter: {
        position: 'absolute',
        bottom: 27,
        left: 64,
        right: 64,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
        borderTopColor: colors.borderStrong,
        borderTopWidth: 1,
        paddingTop: 12,
    },
    playerStatus: {
        color: colors.muted,
        fontFamily: fonts.body,
        fontSize: 13,
        flex: 1,
    },
    seek: {
        borderRadius: 12,
        marginHorizontal: -12,
        marginTop: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    seekFocused: { backgroundColor: QUIET_FILL, outlineColor: colors.accentLine, outlineWidth: 2 },
    seekBody: { width: '100%' },
    seekTrack: {
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        borderRadius: 3,
        height: 6,
        overflow: 'hidden',
    },
    seekFill: { backgroundColor: colors.text, height: 6 },
    seekTimes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    seekTime: { color: colors.muted, fontFamily: fonts.mono, fontSize: 13 },
    seekTimeScrubbing: { color: colors.text },
    seekHint: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
    transport: {
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 18,
        marginTop: 14,
    },
    transportButton: {
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderRadius: 24,
        height: 48,
        justifyContent: 'center',
        width: 48,
    },
    transportPrimary: {
        backgroundColor: colors.text,
        borderRadius: 34,
        height: 68,
        width: 68,
    },
    transportFocused: {
        backgroundColor: FOCUS_FILL,
        outlineColor: FOCUS_FILL,
        outlineWidth: 2,
        outlineOffset: 3,
    },
    transportPrimaryFocused: {
        outlineColor: colors.accentBright,
        outlineWidth: 2,
        outlineOffset: 5,
    },
    transportSecondary: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
    transportDot: {
        position: 'absolute',
        bottom: 5,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.text,
    },
    transportDotFocused: { backgroundColor: colors.background },
    queuePanel: {
        backgroundColor: 'rgba(14, 15, 19, 0.6)',
        borderRadius: radii.lg,
        paddingHorizontal: 14,
        paddingVertical: 16,
        width: 304,
        height: 340,
    },
    queueTitle: { marginBottom: 8, paddingHorizontal: 8 },
    queueRow: {
        alignItems: 'center',
        borderRadius: 10,
        flexDirection: 'row',
        gap: 12,
        height: TV_QUEUE_ROW_HEIGHT,
        paddingHorizontal: 8,
    },
    queueArt: { backgroundColor: colors.surface, borderRadius: 3, height: 40, width: 40 },

    // ── Menu (long press) ────────────────────────────────────────────────
    menuBackdrop: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(8, 9, 12, 0.66)',
        zIndex: 60,
    },
    menuPanel: {
        backgroundColor: colors.surface,
        bottom: 0,
        paddingHorizontal: 26,
        paddingVertical: 34,
        position: 'absolute',
        right: 0,
        top: 0,
        width: 390,
    },
    menuHeader: { alignItems: 'center', flexDirection: 'row', gap: 16, marginBottom: 20 },
    menuArt: { backgroundColor: colors.panel, borderRadius: 3, height: 64, width: 64 },
    menuCopy: { flex: 1, gap: 3 },
    menuTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 20, lineHeight: 24 },
    menuSubtitle: { color: colors.muted, fontFamily: fonts.mono, fontSize: 12.5 },
    menuItem: {
        alignItems: 'center',
        borderRadius: 12,
        flexDirection: 'row',
        gap: 16,
        minHeight: 50,
        paddingHorizontal: 16,
    },
    menuItemFocused: { backgroundColor: FOCUS_FILL },
    menuLabel: { color: colors.text, flexShrink: 1, fontFamily: fonts.body, fontSize: 17 },
    menuLabelDestructive: { color: '#ff7a6e' },
    menuFeedback: {
        color: colors.accentBright,
        fontFamily: fonts.body,
        fontSize: 15,
        marginTop: 16,
        paddingHorizontal: 16,
    },

    // ── Settings ─────────────────────────────────────────────────────────
    settingsPanel: {
        alignSelf: 'flex-start',
        backgroundColor: colors.panel,
        borderRadius: 14,
        gap: 6,
        minWidth: 420,
        padding: 24,
    },
    settingsDetail: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, marginBottom: 12 },

    // ── Toast ────────────────────────────────────────────────────────────
    toast: {
        alignSelf: 'center',
        backgroundColor: colors.surfaceHigh,
        borderRadius: radii.pill,
        bottom: 34,
        paddingHorizontal: 24,
        paddingVertical: 12,
        position: 'absolute',
        zIndex: 80,
    },
    toastText: { color: colors.text, fontFamily: fonts.body, fontSize: 16 },

    // ── Radio ────────────────────────────────────────────────────────────
    radioPageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20,
        marginBottom: 20,
    },
    radioSectionLabel: {
        color: colors.muted,
        fontFamily: fonts.body,
        fontSize: 14,
        marginBottom: 12,
    },
    radioCard: {
        backgroundColor: '#191d24',
        borderColor: colors.borderStrong,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 28,
        padding: 24,
    },
    radioDeviceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        marginBottom: 24,
    },
    radioDeviceLabel: { color: colors.muted, fontFamily: fonts.headingMedium, fontSize: 15 },
    radioHead: { alignItems: 'center', flexDirection: 'row', gap: 30 },
    radioCopy: { flex: 1, minWidth: 0 },
    radioTitle: {
        color: colors.text,
        fontFamily: fonts.heading,
        fontSize: 32,
        letterSpacing: -0.7,
        lineHeight: 38,
    },
    radioMeta: {
        color: '#b8c0ca',
        fontFamily: fonts.body,
        fontSize: 16,
        lineHeight: 23,
        marginTop: 8,
    },
    radioStatus: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, marginTop: 12 },
    radioSleeve: { backgroundColor: colors.surface, borderRadius: 6, height: 156, width: 156 },
    radioControls: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 20,
        marginTop: 24,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: colors.borderStrong,
    },
    radioTransport: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    radioActions: { flexDirection: 'row', gap: 2, marginLeft: 'auto' },
    radioVolumeGroup: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    volumeStep: { backgroundColor: 'transparent', minHeight: 38, width: 36, paddingHorizontal: 0 },
    volumeStepText: { color: colors.text, fontFamily: fonts.body, fontSize: 22 },
    radioVolumeReadout: { width: 48, alignItems: 'center', gap: 7 },
    radioVolumeTrack: {
        backgroundColor: colors.surfaceHigh,
        borderRadius: 2,
        height: 3,
        width: '100%',
        overflow: 'hidden',
    },
    radioVolumeFill: { backgroundColor: colors.accent, height: 3 },
    radioVolumeLabel: { color: colors.muted, fontFamily: fonts.mono, fontSize: 12 },
    radioPanelTitle: { marginTop: 8, marginBottom: 24 },
    radioPanelStatus: {
        color: colors.muted,
        fontFamily: fonts.body,
        fontSize: 14,
        marginBottom: 18,
    },
    radioPanelClose: { marginTop: 18 },
    radioNotice: {
        backgroundColor: colors.panel,
        borderRadius: 14,
        gap: 8,
        marginBottom: 24,
        padding: 28,
    },
    radioFeedback: {
        color: colors.accentBright,
        fontFamily: fonts.body,
        fontSize: 15,
        marginTop: 12,
    },
});
