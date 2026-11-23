import { processColor, StyleSheet } from 'react-native';

import { colors, fonts } from '../theme/tokens';
import { type TvFocusLook } from './TvFocusable';

/**
 * The TV in the phone's own materials — the same tokens, faces, chips and
 * cover treatment — sized for a screen read from across a room.
 *
 * TV dp are already density-scaled by Android: a 1080p panel is a 960×540dp
 * canvas. Essential chrome stays inside the 5% overscan-safe area.
 */
export const TV_SAFE_Y = 27;
export const TV_SAFE_RIGHT = 48;
/** The rail: the phone's tab icons, standing on the left edge. Content lives
 *  in everything to its right, and scrolls under it. */
export const TV_RAIL_WIDTH = 76;
/**
 * The page's keyline, measured from the rail: every heading, the first cover
 * of every row and every list row start here. A row scrolls its focused cover
 * back to it, so focus has one place on screen and covers that have passed it
 * slide out under the rail instead of ending at a hard edge.
 */
export const TV_GUTTER = 36;
export const TV_TILE = 144;
export const TV_TILE_GAP = 20;
export const TV_WIDE_TILE = 320;
export const TV_GRID_COLUMNS = 5;
/** Room above and below a row's covers for a focused one's lift and ring. */
export const TV_ROW_BLEED = 14;
/** How far from a list's edges a scroll keeps a focused control that has no
 *  anchor of its own. */
export const TV_SCROLL_MARGIN = 56;
/** "The top of the page", as an anchor: further down than any header is tall,
 *  so the list scrolls all the way up for it. */
export const TV_ANCHOR_TOP = 2000;
export const TV_QUEUE_ROW_HEIGHT = 56;

/**
 * What every list on the TV hands its scroll view: the controls in it bring
 * themselves into view (`SamoTvFocusable.kt`), so the scroll view must not.
 *
 * Left alone it does, twice over. React Native jumps a focused child on
 * screen (`scrollsChildToFocus`); and Android's scroll views take the D-pad
 * themselves, before focus moves, and scroll just far enough to put the next
 * control flush against their edge — where a cover's ring is cut off by the
 * clip. `scrollEnabled` is what stops that (it gates their key handling as
 * well as touch, which a TV has none of); scrolling in code is unaffected.
 *
 * Clipped views stay attached so the D-pad can always find the row beyond
 * the edge before the list has scrolled to it.
 *
 * A glide is the scroll view animating itself on the UI thread, and a list
 * otherwise tells JavaScript where it is on every frame of it — fifteen
 * events a move, for windowing that needs one now and then. A tenth of a
 * second apart is still several times what a row's window of covers ahead
 * of focus needs.
 */
export const TV_LIST_PROPS = {
    removeClippedSubviews: false,
    scrollEnabled: false,
    scrollEventThrottle: 100,
    scrollsChildToFocus: false,
    showsHorizontalScrollIndicator: false,
    showsVerticalScrollIndicator: false,
} as const;

const SHELF_TITLE_HEIGHT = 24;
const SHELF_TITLE_GAP = 6;
/** From the top of a shelf's title to the top of its covers. */
const SHELF_TITLE_TO_COVERS = SHELF_TITLE_HEIGHT + SHELF_TITLE_GAP + TV_ROW_BLEED;
/**
 * Where a shelf's covers sit once focus is on one: its title at the top of
 * the safe area, the shelf before it gone under the top fade. Anchored any
 * higher, the title is what goes under the fade, and a row of covers with no
 * name is left at the top of the page.
 */
export const TV_SHELF_ANCHOR_Y = TV_SAFE_Y + SHELF_TITLE_TO_COVERS;
/** The same on Home, whose list starts under its bar of filters rather than
 *  at the top of the screen. */
export const TV_HOME_SHELF_ANCHOR_Y = 10 + SHELF_TITLE_TO_COVERS;
/** The same for a grid's rows, which have no title: the focused row's ring
 *  just clear of the top fade. */
export const TV_GRID_ANCHOR_Y = TV_SAFE_Y + TV_ROW_BLEED;

const QUIET_FILL = 'rgba(255, 255, 255, 0.07)';
const FOCUS_RING = colors.accentBright;
const FOCUS_FILL = 'rgba(255, 255, 255, 0.10)';

const argb = (color: string): number => processColor(color) as number;

const look = (
    radius: number,
    options: { fill?: boolean; height?: number; outset?: number; scale?: number } = {},
): TvFocusLook => ({
    fillColor: options.fill ? argb(FOCUS_FILL) : undefined,
    focusScale: options.scale ?? 1,
    ringColor: argb(FOCUS_RING),
    ringHeight: options.height,
    ringOutset: options.outset ?? 3,
    ringRadius: radius,
    ringWidth: 2,
});

/**
 * Focus, one language everywhere: a silver ring, set off from the control by
 * a hair. A cover also lifts; a row also fills, and stays put (scaling one
 * row would break its column's edge). Ink never changes, so nothing has to
 * re-render to show it.
 */
export const tvFocus = {
    button: look(22, { fill: true, scale: 1.04 }),
    buttonPrimary: look(22, { scale: 1.04 }),
    card: look(12, { scale: 1.04 }),
    chip: look(18, { scale: 1.04 }),
    icon: look(22, { fill: true, scale: 1.06 }),
    rail: look(14, { fill: true, outset: 2, scale: 1.06 }),
    row: look(10, { fill: true, outset: 0 }),
    seek: look(12, { fill: true, outset: 0 }),
    tile: look(8, { height: TV_TILE, scale: 1.06 }),
    tileRound: look(TV_TILE / 2, { height: TV_TILE, scale: 1.06 }),
    transport: look(24, { fill: true, scale: 1.08 }),
    transportPrimary: look(32, { outset: 4, scale: 1.06 }),
} as const;

const display = {
    color: colors.text,
    fontFamily: fonts.heading,
    letterSpacing: -0.8,
} as const;

const label = {
    color: colors.muted,
    fontFamily: fonts.monoBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
} as const;

export const tvStyles = StyleSheet.create({
    root: { backgroundColor: colors.background, flex: 1 },
    hidden: { display: 'none' },
    fill: { ...StyleSheet.absoluteFill },

    // ── Type ─────────────────────────────────────────────────────────────
    /** A screen's name. */
    pageTitle: { ...display, fontSize: 28, lineHeight: 34 },
    /** A row's name, in the phone's section-heading voice. */
    sectionTitle: {
        color: colors.text,
        fontFamily: fonts.heading,
        fontSize: 19,
        height: SHELF_TITLE_HEIGHT,
        letterSpacing: -0.2,
        lineHeight: SHELF_TITLE_HEIGHT,
        marginBottom: SHELF_TITLE_GAP,
    },
    /** The phone's small mono caption: a kind ("Album"), a state ("Now playing"). */
    label,
    /** One line that says why something is here. */
    eyebrow: { color: colors.accent, fontFamily: fonts.body, fontSize: 14, fontWeight: '700' },
    text: { color: colors.text, fontFamily: fonts.body, fontSize: 17, lineHeight: 24 },
    muted: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
    /** Facts and figures: counts, formats, lengths. */
    meta: { color: colors.muted, fontFamily: fonts.mono, fontSize: 13, lineHeight: 18 },
    error: { color: '#ffb4ab', fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
    centered: { textAlign: 'center' },

    // ── Buttons ──────────────────────────────────────────────────────────
    button: {
        alignItems: 'center',
        backgroundColor: QUIET_FILL,
        borderRadius: 22,
        flexDirection: 'row',
        gap: 9,
        height: 44,
        justifyContent: 'center',
        paddingHorizontal: 22,
    },
    /** The phone's silver plate: the one thing on a screen to press. */
    buttonPrimary: { backgroundColor: colors.accentBright },
    buttonSelected: { backgroundColor: 'rgba(255, 255, 255, 0.16)' },
    buttonText: { color: colors.text, fontFamily: fonts.body, fontSize: 16, fontWeight: '700' },
    buttonTextPrimary: { color: colors.background },
    iconButton: { paddingHorizontal: 0, width: 44 },
    disabled: { opacity: 0.4 },
    row: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

    // ── Chips (the phone's filter pills) ─────────────────────────────────
    chips: { flexDirection: 'row', gap: 8 },
    chip: {
        alignItems: 'center',
        backgroundColor: QUIET_FILL,
        borderRadius: 18,
        height: 36,
        justifyContent: 'center',
        paddingHorizontal: 18,
    },
    chipActive: { backgroundColor: colors.accentBright },
    chipText: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, fontWeight: '700' },
    chipTextActive: { color: colors.background },

    // ── Fields ───────────────────────────────────────────────────────────
    field: { gap: 8 },
    input: {
        backgroundColor: colors.panel,
        borderColor: 'transparent',
        borderRadius: 12,
        borderWidth: 2,
        color: colors.text,
        fontFamily: fonts.body,
        fontSize: 19,
        height: 52,
        paddingHorizontal: 16,
        paddingVertical: 0,
    },
    inputFocused: { backgroundColor: colors.surface, borderColor: FOCUS_RING },
    placeholder: { color: colors.faint },

    // ── Rail ─────────────────────────────────────────────────────────────
    rail: {
        alignItems: 'center',
        backgroundColor: colors.background,
        bottom: 0,
        gap: 6,
        left: 0,
        paddingBottom: TV_SAFE_Y,
        paddingTop: TV_SAFE_Y,
        position: 'absolute',
        top: 0,
        width: TV_RAIL_WIDTH,
        zIndex: 20,
    },
    /** Covers leave under the rail through this, not at a hard line. */
    railFade: {
        bottom: 0,
        left: TV_RAIL_WIDTH,
        position: 'absolute',
        top: 0,
        width: 26,
        zIndex: 19,
    },
    railLogo: { height: 26, marginBottom: 18, opacity: 0.9, width: 26 },
    railItem: {
        alignItems: 'center',
        borderRadius: 14,
        height: 44,
        justifyContent: 'center',
        width: 44,
    },
    /** Where you are: lit, whether or not focus is on it. */
    railItemSelected: { backgroundColor: 'rgba(255, 255, 255, 0.09)' },
    railSpacer: { flex: 1 },
    railNowArt: { backgroundColor: colors.surface, borderRadius: 6, height: 30, width: 30 },
    /** Playing, not paused: a dot on the cover. */
    railNowDot: {
        backgroundColor: colors.accentBright,
        borderColor: colors.background,
        borderRadius: 6,
        borderWidth: 2,
        height: 12,
        position: 'absolute',
        right: -5,
        top: -5,
        width: 12,
    },
    /** A destination's name, while focus is on its icon. Its own width: laid
     *  out inside the icon's 44dp it would be cut down to a letter. */
    railLabel: {
        flexDirection: 'row',
        left: 54,
        position: 'absolute',
        top: 7,
        width: 200,
    },
    railLabelPill: {
        backgroundColor: colors.surfaceHigh,
        borderRadius: 8,
        height: 30,
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    railLabelText: { color: colors.text, fontFamily: fonts.body, fontSize: 14, fontWeight: '700' },
    guide: { bottom: 0, left: TV_RAIL_WIDTH - 2, position: 'absolute', top: 0, width: 2 },

    // ── Pages ────────────────────────────────────────────────────────────
    content: { bottom: 0, left: TV_RAIL_WIDTH, position: 'absolute', right: 0, top: 0 },
    page: { ...StyleSheet.absoluteFill },
    pageScroll: {
        paddingBottom: 72,
        paddingLeft: TV_GUTTER,
        paddingRight: TV_SAFE_RIGHT,
        paddingTop: 40,
    },
    /** Rows that have scrolled up leave through this, out of the overscan. */
    topFade: { height: TV_SAFE_Y, left: 0, position: 'absolute', right: 0, top: 0 },
    pageHeader: {
        alignItems: 'baseline',
        flexDirection: 'row',
        gap: 14,
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    empty: { gap: 6, maxWidth: 560, paddingTop: 8 },
    emptyTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 22, lineHeight: 28 },
    emptyText: { color: colors.muted, fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },

    // ── Home ─────────────────────────────────────────────────────────────
    /** The filters, fixed: the page scrolls beneath them. */
    homeBar: {
        backgroundColor: colors.background,
        paddingBottom: 12,
        paddingLeft: TV_GUTTER,
        paddingRight: TV_SAFE_RIGHT,
        paddingTop: TV_SAFE_Y,
        zIndex: 2,
    },
    homeScroll: {
        paddingBottom: 72,
        paddingLeft: TV_GUTTER,
        paddingRight: TV_SAFE_RIGHT,
        paddingTop: 10,
    },
    homeMessage: { paddingLeft: TV_GUTTER, paddingRight: TV_SAFE_RIGHT, paddingTop: 16 },

    // ── Home hero ────────────────────────────────────────────────────────
    hero: {
        alignItems: 'center',
        backgroundColor: colors.panel,
        borderRadius: 16,
        flexDirection: 'row',
        gap: 28,
        marginBottom: 28,
        padding: 20,
    },
    heroArt: { backgroundColor: colors.surface, borderRadius: 10, height: 172, width: 172 },
    heroCopy: { flex: 1, minWidth: 0 },
    heroTitle: { ...display, fontSize: 34, lineHeight: 38, marginTop: 6 },
    heroSubtitle: { color: colors.text, fontFamily: fonts.body, fontSize: 17, marginTop: 6 },
    heroMeta: { marginTop: 4 },
    heroActions: { flexDirection: 'row', gap: 12, marginTop: 18 },

    // ── Shelves and tiles ────────────────────────────────────────────────
    shelf: { marginBottom: 22 },
    /** Out to both edges of the page: covers arrive from past the screen's
     *  right edge and leave under the rail. */
    shelfScroll: { marginLeft: -TV_GUTTER, marginRight: -TV_SAFE_RIGHT },
    shelfRow: {
        gap: TV_TILE_GAP,
        paddingLeft: TV_GUTTER,
        paddingRight: TV_SAFE_RIGHT,
        paddingVertical: TV_ROW_BLEED,
    },
    pendingRow: { flexDirection: 'row', overflow: 'hidden' },
    pendingTile: { opacity: 0.5 },
    pendingTileWide: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        height: 104,
        width: TV_WIDE_TILE,
    },
    tile: { width: TV_TILE },
    tileArt: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        height: TV_TILE,
        width: TV_TILE,
    },
    tileArtRound: { borderRadius: TV_TILE / 2 },
    tileText: { marginTop: 9 },
    tileTitle: {
        color: colors.text,
        fontFamily: fonts.body,
        fontSize: 15,
        fontWeight: '700',
        lineHeight: 19,
    },
    tileSubtitle: {
        color: colors.muted,
        fontFamily: fonts.mono,
        fontSize: 12,
        lineHeight: 16,
        marginTop: 3,
    },
    /** Something part-heard: a card with room for where you are in it. */
    tileWide: {
        alignItems: 'center',
        backgroundColor: colors.panel,
        borderRadius: 12,
        flexDirection: 'row',
        gap: 14,
        height: 104,
        padding: 12,
        width: TV_WIDE_TILE,
    },
    tileArtWide: { borderRadius: 6, height: 80, width: 80 },
    tileTextWide: { flex: 1, minWidth: 0 },
    tileProgressTrack: {
        backgroundColor: 'rgba(255, 255, 255, 0.14)',
        borderRadius: 2,
        height: 3,
        marginTop: 8,
        overflow: 'hidden',
    },
    tileProgressFill: { backgroundColor: colors.accent, height: 3 },
    viewAllArt: {
        alignItems: 'center',
        backgroundColor: colors.panel,
        borderRadius: 8,
        gap: 10,
        height: TV_TILE,
        justifyContent: 'center',
        width: TV_TILE,
    },
    viewAllChevron: {
        alignItems: 'center',
        backgroundColor: QUIET_FILL,
        borderRadius: 20,
        height: 40,
        justifyContent: 'center',
        width: 40,
    },
    viewAllText: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, fontWeight: '700' },
    gridRow: { flexDirection: 'row', gap: TV_TILE_GAP, paddingVertical: TV_ROW_BLEED },

    // ── Detail ───────────────────────────────────────────────────────────
    detailHeader: { alignItems: 'flex-end', flexDirection: 'row', gap: 28, marginBottom: 26 },
    detailFooter: { marginTop: 26 },
    detailArt: { backgroundColor: colors.surface, borderRadius: 10, height: 208, width: 208 },
    detailArtRound: { borderRadius: 104 },
    detailCopy: { flex: 1, minWidth: 0 },
    detailTitle: { ...display, fontSize: 36, lineHeight: 40, marginTop: 6 },
    detailSubtitle: { color: colors.text, fontFamily: fonts.body, fontSize: 18, marginTop: 6 },
    detailFacts: { marginTop: 6 },
    detailActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
    trackHeading: { marginBottom: 6, marginTop: 14 },
    track: {
        alignItems: 'center',
        borderRadius: 10,
        flexDirection: 'row',
        gap: 16,
        height: 58,
        paddingHorizontal: 14,
    },
    trackIndex: {
        color: colors.faint,
        fontFamily: fonts.mono,
        fontSize: 14,
        textAlign: 'right',
        width: 28,
    },
    trackArt: { backgroundColor: colors.surface, borderRadius: 4, height: 40, width: 40 },
    trackCopy: { flex: 1, minWidth: 0 },
    trackTitle: {
        color: colors.text,
        fontFamily: fonts.body,
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 21,
    },
    trackSubtitle: {
        color: colors.muted,
        fontFamily: fonts.mono,
        fontSize: 12,
        lineHeight: 16,
        marginTop: 2,
    },
    trackMeta: { color: colors.muted, fontFamily: fonts.mono, fontSize: 13 },
    /** The track the player has now, picked out from across the room. */
    trackPlaying: { color: colors.accent },

    // ── Now Playing ──────────────────────────────────────────────────────
    player: { ...StyleSheet.absoluteFill, backgroundColor: colors.background, zIndex: 40 },
    playerBody: {
        alignItems: 'center',
        flex: 1,
        flexDirection: 'row',
        gap: 56,
        paddingBottom: 64,
        paddingHorizontal: 64,
        paddingTop: TV_SAFE_Y,
    },
    playerArt: { backgroundColor: colors.surface, borderRadius: 12, height: 316, width: 316 },
    playerInfo: { flex: 1, minWidth: 0 },
    playerTitle: { ...display, fontSize: 36, lineHeight: 41, marginTop: 10 },
    playerSubtitle: {
        color: colors.muted,
        fontFamily: fonts.mono,
        fontSize: 16,
        lineHeight: 22,
        marginTop: 8,
    },
    seek: {
        borderRadius: 12,
        marginHorizontal: -12,
        marginTop: 18,
        paddingBottom: 8,
        paddingHorizontal: 12,
        paddingTop: 14,
    },
    seekTrack: {
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
        borderRadius: 3,
        height: 6,
        overflow: 'hidden',
    },
    seekFill: { backgroundColor: colors.accentBright, height: 6 },
    seekTimes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 },
    seekTime: { color: colors.muted, fontFamily: fonts.mono, fontSize: 13 },
    seekTimeScrubbing: { color: colors.text },
    seekHint: { color: colors.faint, fontFamily: fonts.body, fontSize: 13 },
    transport: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 18,
        justifyContent: 'center',
        marginTop: 10,
    },
    /** Play alone, resuming what played last: it starts where the title
     *  does, as the Home hero's action does, rather than centred under a seek
     *  bar that is not there. */
    transportResting: { justifyContent: 'flex-start', marginTop: 18 },
    transportButton: {
        alignItems: 'center',
        borderRadius: 24,
        height: 48,
        justifyContent: 'center',
        width: 48,
    },
    transportPrimary: {
        backgroundColor: colors.accentBright,
        borderRadius: 32,
        height: 64,
        width: 64,
    },
    /** Shuffle or repeat, on. */
    transportDot: {
        backgroundColor: colors.accentBright,
        borderRadius: 2,
        bottom: 5,
        height: 4,
        position: 'absolute',
        width: 4,
    },
    playerFooter: {
        alignItems: 'center',
        bottom: TV_SAFE_Y,
        flexDirection: 'row',
        gap: 24,
        left: 64,
        position: 'absolute',
        right: 64,
    },
    playerStatus: { color: colors.muted, flex: 1, fontFamily: fonts.body, fontSize: 14 },
    playerFooterActions: { flexDirection: 'row', gap: 10 },
    footerButton: { height: 38, paddingHorizontal: 18 },
    playerEmpty: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center' },
    playerEmptyButton: { marginTop: 16 },
    queuePanel: {
        backgroundColor: colors.panel,
        borderRadius: 16,
        height: 356,
        paddingHorizontal: 10,
        paddingVertical: 16,
        width: 316,
    },
    queueTitle: { marginBottom: 8, paddingHorizontal: 10 },
    queueRow: {
        alignItems: 'center',
        borderRadius: 10,
        flexDirection: 'row',
        gap: 12,
        height: TV_QUEUE_ROW_HEIGHT,
        paddingHorizontal: 10,
    },

    // ── Menu (long press) and panels ─────────────────────────────────────
    menuBackdrop: {
        ...StyleSheet.absoluteFill,
        backgroundColor: 'rgba(8, 9, 12, 0.7)',
        zIndex: 60,
    },
    menuPanel: {
        backgroundColor: colors.panel,
        bottom: 0,
        paddingBottom: TV_SAFE_Y,
        paddingHorizontal: 22,
        paddingTop: TV_SAFE_Y + 6,
        position: 'absolute',
        right: 0,
        top: 0,
        width: 384,
    },
    menuHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 14,
        marginBottom: 18,
        paddingHorizontal: 10,
    },
    menuArt: { backgroundColor: colors.surface, borderRadius: 6, height: 60, width: 60 },
    menuCopy: { flex: 1, minWidth: 0 },
    menuTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 19, lineHeight: 24 },
    menuSubtitle: {
        color: colors.muted,
        fontFamily: fonts.mono,
        fontSize: 12,
        lineHeight: 16,
        marginTop: 3,
    },
    /** Room for a focused row's ring, which the list would otherwise clip. */
    menuList: { paddingHorizontal: 4, paddingVertical: 4 },
    menuItem: {
        alignItems: 'center',
        borderRadius: 10,
        flexDirection: 'row',
        height: 48,
        paddingHorizontal: 14,
    },
    menuLabel: { color: colors.text, flexShrink: 1, fontFamily: fonts.body, fontSize: 17 },
    menuLabelDestructive: { color: '#ff7a6e' },
    menuFeedback: {
        color: colors.accentBright,
        fontFamily: fonts.body,
        fontSize: 15,
        marginTop: 14,
        paddingHorizontal: 14,
    },
    panelTitle: { marginBottom: 6, marginTop: 6, paddingHorizontal: 10 },
    panelStatus: { marginBottom: 14, paddingHorizontal: 10 },
    panelClose: { alignSelf: 'flex-start', marginLeft: 10, marginTop: 14 },

    // ── Settings ─────────────────────────────────────────────────────────
    settingsPanel: {
        alignSelf: 'flex-start',
        backgroundColor: colors.panel,
        borderRadius: 16,
        marginTop: 8,
        minWidth: 440,
        padding: 24,
    },
    settingsServer: {
        color: colors.text,
        fontFamily: fonts.heading,
        fontSize: 22,
        lineHeight: 28,
        marginTop: 6,
    },
    settingsDetail: { marginBottom: 18, marginTop: 4 },

    // ── Sign in ──────────────────────────────────────────────────────────
    setupFrame: { flex: 1, paddingHorizontal: 64, paddingVertical: TV_SAFE_Y },
    // Sign-in is laid out across the screen, not down it: stacked, the brand
    // alone took a third of the height and pushed the code screen's buttons to
    // the bottom edge.
    setup: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 56 },
    setupIntro: { width: 250 },
    setupLogo: { height: 44, marginBottom: 14, width: 44 },
    brand: { ...display, fontSize: 40, lineHeight: 46 },
    // Room past the panel's edges for a focused control's ring, which a
    // scroll view would otherwise clip.
    setupPanel: { alignSelf: 'stretch', flex: 1, marginHorizontal: -12 },
    setupContent: {
        flexGrow: 1,
        gap: 16,
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    setupTitle: { ...display, fontSize: 26, lineHeight: 32 },
    serverButton: {
        height: 64,
        justifyContent: 'space-between',
        paddingHorizontal: 22,
    },
    pairing: { alignItems: 'center', flexDirection: 'row', gap: 28 },
    pairingCopy: { flex: 1, gap: 8 },
    pairingCode: {
        color: colors.text,
        fontFamily: fonts.monoBold,
        fontSize: 38,
        letterSpacing: 5,
        lineHeight: 46,
    },
    pairingUrl: { color: colors.text, fontFamily: fonts.mono },

    // ── Toast ────────────────────────────────────────────────────────────
    toast: {
        alignSelf: 'center',
        backgroundColor: colors.surfaceHigh,
        borderRadius: 22,
        bottom: 34,
        paddingHorizontal: 24,
        paddingVertical: 12,
        position: 'absolute',
        zIndex: 80,
    },
    toastText: { color: colors.text, fontFamily: fonts.body, fontSize: 16 },

    // ── Radio ────────────────────────────────────────────────────────────
    radioCard: {
        backgroundColor: colors.panel,
        borderRadius: 16,
        marginBottom: 28,
        padding: 22,
    },
    radioHead: { alignItems: 'center', flexDirection: 'row', gap: 26 },
    radioSleeve: { backgroundColor: colors.surface, borderRadius: 10, height: 148, width: 148 },
    radioCopy: { flex: 1, minWidth: 0 },
    radioDevice: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
    radioTitle: { ...display, fontSize: 30, lineHeight: 35, marginTop: 8 },
    radioMeta: { color: colors.muted, fontFamily: fonts.mono, fontSize: 14, marginTop: 6 },
    radioStatus: { marginTop: 10 },
    radioControls: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 22,
        marginTop: 20,
    },
    radioTransport: { alignItems: 'center', flexDirection: 'row', gap: 10 },
    radioVolumeGroup: { alignItems: 'center', flexDirection: 'row', gap: 8 },
    radioVolumeReadout: { alignItems: 'center', gap: 7, width: 52 },
    radioVolumeTrack: {
        backgroundColor: 'rgba(255, 255, 255, 0.14)',
        borderRadius: 2,
        height: 3,
        overflow: 'hidden',
        width: '100%',
    },
    radioVolumeFill: { backgroundColor: colors.accent, height: 3 },
    volumeStepText: { color: colors.text, fontFamily: fonts.body, fontSize: 22, lineHeight: 26 },
    radioActions: { flexDirection: 'row', gap: 10, marginLeft: 'auto' },
    radioFeedback: {
        color: colors.accentBright,
        fontFamily: fonts.body,
        fontSize: 15,
        marginTop: 12,
    },
    radioSectionLabel: { marginBottom: 12 },
});
