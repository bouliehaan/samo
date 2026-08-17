import { StyleSheet } from 'react-native';
import {
    EXPLORE_HERO_ARTWORK,
    EXPLORE_HERO_HEIGHT,
    EXPLORE_HERO_PADDING,
    HOME_COMPACT_OFFSET,
    HOME_EDGE_PADDING,
    HOME_MEDIA_SUBTITLE_ROW_HEIGHT,
    HOME_MEDIA_TILE_CHROME,
    HOME_MEDIA_TILE_CHROME_COMPACT,
    HOME_PRIMARY_TILE,
    HOME_ROUNDED_OFFSET,
    HOME_SEARCH_DRAWER_PADDING,
    HOME_SEARCH_DRAWER_REST_GAP,
    HOME_REFRESH_BAR_HEIGHT,
    HOME_REFRESH_SEGMENT_WIDTH,
    HOME_SEARCH_FIELD_HEIGHT,
    HOME_TILE_GAP,
    SCROLL_CONTENT_BOTTOM_INSET,
    HOME_SCENE_TOP_INSET,
    STATUS_BAR_INSET,
} from '../layout';
import { colors, fonts, radii, spacing } from '../tokens';

/** Home tab: sections, media tiles, filter grid. */
export const homeStyles = StyleSheet.create({
    homeListContent: {
        paddingBottom: SCROLL_CONTENT_BOTTOM_INSET,
        paddingHorizontal: HOME_EDGE_PADDING,
        // Status-bar clearance lives IN the scroll content (not on the
        // container): at rest the first row clears the clock, but scrolled
        // content runs all the way under the translucent status bar —
        // edge-to-edge, no opaque clip line. StatusBarScrim keeps the clock
        // legible over whatever scrolls beneath it.
        paddingTop: HOME_SCENE_TOP_INSET,
    },

    /** The search field row — shared by the floating pull-down surface and the
     *  full-search overlay so the field lands on the identical line in both. */
    homeSearchDrawer: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: spacing.xs,
        paddingBottom: HOME_SEARCH_DRAWER_PADDING,
        paddingTop: HOME_SEARCH_DRAWER_PADDING,
    },
    /**
     * The drawer's own surface: a tray that bleeds out to both screen edges
     * (the row lives inside homeListContent's horizontal padding) and spans
     * the whole band — from the physical screen edge, past the field row, down
     * through the bottom gap to the pills — so the revealed drawer reads as
     * one slab pulled out of the top of the display rather than a field
     * floating over the page.
     *
     * Rounded BOTTOM corners + a hairline lip only; the top is the screen
     * edge. Translucent, never opaque; no elevation (it changes Android
     * compositing). Its bottom strip is on-screen even at rest, so the reveal
     * animates its opacity from 0 — decoration only, `pointerEvents="none"`,
     * so unlike the old field fade nothing about touch or legibility rides on
     * it.
     */
    homeSearchDrawerTray: {
        // No flat fill: the slab is REAL glass, the same recipe as the bottom
        // dock (see BottomChromeBackdrop) — GPU blur of the page beneath plus a
        // breath of pure-black smoke. This was rgba(21,23,28,0.96), i.e. 96%
        // opaque, directly contradicting this block's own "translucent, never
        // opaque" note. It was why the surface read as a flat grey panel dropped
        // over the app while every other piece of chrome in the shell is glass.
        //
        // `overflow: hidden` is what clips the blur to the bottom radii.
        backgroundColor: 'transparent',
        borderBottomLeftRadius: radii.lg,
        borderBottomRightRadius: radii.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255, 255, 255, 0.09)',
        bottom: -HOME_SEARCH_DRAWER_REST_GAP,
        left: -HOME_EDGE_PADDING,
        overflow: 'hidden',
        position: 'absolute',
        right: -HOME_EDGE_PADDING,
        top: -HOME_SCENE_TOP_INSET,
    },
    /** Overlay variant: the search screen has no pills-clearance spacer to
     *  cover, so the tray ends with the row. */
    homeSearchDrawerTrayOverlay: {
        bottom: 0,
    },
    /** Flex wrapper the reveal animation transforms — the field itself stays
     *  a plain Pressable so press feedback and hit-testing are untouched. */
    homeSearchFieldWrap: {
        flex: 1,
    },
    homeSearchField: {
        alignItems: 'center',
        // A faint WASH, not a fill. The mini player is the reference here: it
        // "paints no surface of its own", it is content riding on the frosted
        // dock pane, which is why it belongs to the glass instead of sitting on
        // it. This pill was colors.backgroundElevated — an opaque black slab
        // dropped onto the glass tray, reading as a hole rather than a control
        // cut into the same material. White at ~6% lifts the glass just enough
        // to say "you can type here" while the blur still shows through it.
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderColor: 'rgba(255, 255, 255, 0.10)',
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 10,
        height: HOME_SEARCH_FIELD_HEIGHT,
        paddingHorizontal: spacing.md,
    },
    homeSearchFieldLabel: {
        color: colors.muted,
        fontSize: 15,
        fontWeight: '600',
    },
    homeSearchFieldPressed: {
        opacity: 0.75,
    },
    homeSearchLogo: {
        height: 34,
        opacity: 0.92,
        resizeMode: 'contain',
        width: 34,
    },
    homeSearchLogoButton: {
        alignItems: 'center',
        borderRadius: 999,
        height: HOME_SEARCH_FIELD_HEIGHT,
        justifyContent: 'center',
        width: 44,
    },
    /**
     * The pull-down search surface's own layer. Absolute at the very top of the
     * app content, above the status-bar scrim (9500), the page, AND the full
     * search overlay (11000). Holds the tray/field row (reusing the
     * homeSearchDrawer geometry), slid in from above by the shared `pull` value.
     * Not scroll content.
     */
    searchPullSurface: {
        left: 0,
        paddingHorizontal: HOME_EDGE_PADDING,
        paddingTop: HOME_SCENE_TOP_INSET,
        position: 'absolute',
        right: 0,
        top: 0,
        // ABOVE the full-search overlay (11000). The pull surface owns the one
        // search field in the app, so it has to stay on top once search opens —
        // at 10600 the overlay painted straight over the bar you had just pulled
        // down, and the field vanished behind it.
        zIndex: 11100,
    },
    /**
     * The dim behind the surface — fades in with the pull, tap to retract. Sits
     * one layer under the surface itself.
     *
     * PURE BLACK, on purpose, and the same lesson the dock records: a black
     * scrim is multiplicative, so it DARKENS what shows through and leaves its
     * contrast and colour intact — like sunglasses. This was #0d0e12, a grey,
     * which at 60% lifts the page toward itself and lays a flat veil over it
     * instead of dimming it. That veil is why the page behind search looked
     * washed and lifeless rather than simply darker.
     */
    searchPullScrim: {
        // Transparent at rest and ANIMATED AS A COLOUR by SearchPullScrim — the
        // dim is this slab's own alpha, never a view opacity, so a full-screen
        // offscreen layer is never allocated for it. Leaving the old solid
        // '#000000' here would also black the whole display for any frame that
        // rendered before the animated style landed.
        backgroundColor: 'transparent',
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 10550,
    },
    searchPullScrimFill: {
        flex: 1,
    },
    /** "Shows" / "Books" label between the hero shelves and the full grid. */
    gridTabCatalogTitle: {
        marginBottom: spacing.xs,
        marginTop: spacing.xs,
    },
    /** Row that holds the catalog title + sort button, side by side. */
    gridTabCatalogTitleRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingRight: spacing.sm,
    },
    continueProgressFill: {
        backgroundColor: colors.accent,
        borderRadius: 999,
        height: '100%',
    },
    continueProgressTrack: {
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
        borderRadius: 999,
        height: 4,
        marginTop: 4,
        overflow: 'hidden',
        width: '100%',
    },
    homeFilterGrid: {
        columnGap: HOME_TILE_GAP,
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: spacing.sm,
        rowGap: spacing.sm,
    },
    homeFilterGridRow: {
        columnGap: HOME_TILE_GAP,
        flexDirection: 'row',
        marginBottom: spacing.sm,
    },
    homeFilterGridArtwork: {
        aspectRatio: 1,
        backgroundColor: colors.surface,
        borderRadius: 2,
        marginBottom: 4,
        width: HOME_PRIMARY_TILE,
    },
    homeFilterGridArtworkFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    homeFilterGridArtworkPodcast: {
        borderRadius: 26,
    },
    homeFilterGridSubtitleRow: {
        minHeight: HOME_MEDIA_SUBTITLE_ROW_HEIGHT,
        minWidth: 0,
    },
    homeFilterGridTile: {
        width: HOME_PRIMARY_TILE,
    },
    homeFilterPill: {
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 999,
        justifyContent: 'center',
        minHeight: 34,
        paddingHorizontal: spacing.md,
    },
    homeFilterPillActive: {
        backgroundColor: colors.accent,
    },
    homeFilterPills: {
        gap: spacing.xs,
        paddingBottom: spacing.sm,
        paddingTop: spacing.xs,
    },
    homeFilterPillText: {
        color: colors.text,
        fontSize: 13,
        fontWeight: '800',
    },
    /**
     * The refresh sweep (see HomeRefreshIndicator), living in the gutter between
     * the status bar and the first row — the 8px `PAGE_TOP_INSET` adds on top of
     * `STATUS_BAR_INSET`. That band is empty in every Home state, which is the
     * whole reason it is here: anything centred lower lands on the filter pills.
     *
     * Absolute, so it floats ABOVE the list instead of displacing it, and
     * `overflow: hidden` so the travelling segment is clipped into a sweep at
     * both edges rather than sliding in off-screen as a rectangle.
     */
    homeRefreshBar: {
        height: HOME_REFRESH_BAR_HEIGHT,
        left: 0,
        overflow: 'hidden',
        position: 'absolute',
        right: 0,
        top: STATUS_BAR_INSET + 3,
    },
    homeRefreshBarSegment: {
        backgroundColor: colors.accent,
        borderRadius: radii.pill,
        height: '100%',
        width: HOME_REFRESH_SEGMENT_WIDTH,
    },
    homeRefreshBarStatic: {
        backgroundColor: colors.accent,
        borderRadius: radii.pill,
        height: '100%',
        opacity: 0.7,
        width: '100%',
    },
    homeFilterPillTextActive: {
        color: colors.background,
    },
    homeSceneRoot: {
        // NO container-level top padding: a padded container clips scrolled
        // content at an arbitrary line below the status bar (the "opaque
        // black bar" look). The clearance is homeListContent's paddingTop,
        // which scrolls away so content runs edge-to-edge under the bar. The
        // parked search drawer's slice that geometrically sits behind the
        // status bar at rest is handled by its scroll-driven opacity fade.
        flex: 1,
    },
    homeSection: {
        marginBottom: spacing.md,
        marginTop: 0,
    },
    homeRowList: {
        overflow: 'hidden',
    },
    homeMultiRowColumn: {
        gap: spacing.xs,
    },
    tileMetaRow: {
        // Below-cover metadata band: title/subtitle column on the left, the
        // hi-fi mark sat to the right (Qobuz card layout). Vertically centered
        // so the mark sits within the metadata, never on the artwork.
        alignItems: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    tileMetaRowFill: {
        // For the wide "continue" cards whose Pressable is already a row —
        // the band must grow to fill the space beside the artwork.
        flex: 1,
    },
    tileMetaTextCol: {
        flex: 1,
        minWidth: 0,
    },
    mediaArtwork: {
        aspectRatio: 1,
        backgroundColor: colors.surface,
        borderRadius: 2,
        height: HOME_PRIMARY_TILE,
        marginBottom: 4,
        width: HOME_PRIMARY_TILE,
    },
    mediaArtworkAlbum: {
        borderRadius: 2,
    },
    mediaArtworkArtist: {
        borderRadius: 999,
        height: HOME_PRIMARY_TILE - HOME_COMPACT_OFFSET,
        width: HOME_PRIMARY_TILE - HOME_COMPACT_OFFSET,
    },
    mediaArtworkBook: {
        borderRadius: 2,
        height: HOME_PRIMARY_TILE,
        width: HOME_PRIMARY_TILE,
    },
    mediaArtworkCompact: {
        borderRadius: 2,
        height: HOME_PRIMARY_TILE,
        width: HOME_PRIMARY_TILE,
    },
    mediaArtworkFallback: {
        alignItems: 'center',
        aspectRatio: 1,
        backgroundColor: colors.surface,
        borderRadius: 2,
        height: HOME_PRIMARY_TILE,
        justifyContent: 'center',
        marginBottom: 4,
        width: HOME_PRIMARY_TILE,
    },
    mediaArtworkGrid: {
        borderRadius: 30,
        height: HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET,
        width: HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET,
    },
    mediaArtworkLetter: {
        color: colors.accent,
        fontSize: 48,
        fontWeight: '900',
    },
    mediaArtworkPlaylist: {
        borderRadius: 2,
        height: HOME_PRIMARY_TILE,
        width: HOME_PRIMARY_TILE,
    },
    mediaArtworkPodcast: {
        borderRadius: 26,
        height: HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET,
        width: HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET,
    },
    mediaArtworkRadio: {
        backgroundColor: 'transparent',
        borderRadius: 32,
    },
    mediaArtworkWide: {
        borderRadius: 2,
        height: 112,
        marginBottom: 0,
        width: 112,
    },
    mediaSubtitle: {
        color: colors.muted,
        fontSize: 12,
        fontFamily: fonts.mono,
        lineHeight: 16,
    },
    mediaSubtitleCentered: {
        textAlign: 'center',
    },
    mediaSubtitleInline: {
        flexShrink: 1,
        minWidth: 0,
    },
    mediaInfoRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: 4,
        minHeight: HOME_MEDIA_SUBTITLE_ROW_HEIGHT,
        minWidth: 0,
    },
    mediaInfoRowCentered: {
        justifyContent: 'center',
    },
    mediaText: {
        minWidth: 0,
        position: 'relative',
    },
    mediaTextCentered: {
        alignItems: 'center',
    },
    mediaTextWide: {
        flex: 1,
        justifyContent: 'center',
        minWidth: 0,
    },
    mediaTile: {
        marginRight: HOME_TILE_GAP,
        position: 'relative',
        width: HOME_PRIMARY_TILE,
    },
    mediaTileAlbum: {
        width: HOME_PRIMARY_TILE,
    },
    mediaTileArtist: {
        alignItems: 'center',
        width: HOME_PRIMARY_TILE - HOME_COMPACT_OFFSET,
    },
    mediaTileBook: {
        minHeight: HOME_PRIMARY_TILE + HOME_MEDIA_TILE_CHROME,
        width: HOME_PRIMARY_TILE,
    },
    mediaTileCompact: {
        height: HOME_PRIMARY_TILE + HOME_MEDIA_TILE_CHROME_COMPACT,
        width: HOME_PRIMARY_TILE,
    },
    mediaTileContinue: {
        borderColor: 'rgba(255, 255, 255, 0.06)',
        borderWidth: 1,
        width: 320,
    },
    mediaTileGrid: {
        alignItems: 'center',
        width: HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET,
    },
    mediaTilePlaylist: {
        width: HOME_PRIMARY_TILE,
    },
    mediaTilePodcast: {
        minHeight:
            HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET + HOME_MEDIA_TILE_CHROME,
        width: HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET,
    },
    mediaTileWide: {
        backgroundColor: colors.panel,
        borderRadius: 4,
        flexDirection: 'row',
        gap: spacing.md,
        minHeight: 136,
        padding: 12,
        width: 320,
    },
    /**
     * The Explore drop's featured card. The section is a SINGLE playlist, so
     * it is not a carousel — a 320pt tile stranded in a full-width row was the
     * whole reason this shelf read as broken. It spans the page instead, and
     * takes its colour from its own cover: the artwork again as a blurred,
     * scrimmed backdrop, with the sharp cover sat on top of it.
     */
    exploreHero: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: radii.md,
        borderWidth: 1,
        height: EXPLORE_HERO_HEIGHT,
        // The backdrop is a full-bleed image; without this it paints past the
        // rounded corners as a square.
        overflow: 'hidden',
    },
    exploreHeroArtwork: {
        backgroundColor: colors.surface,
        // A hairline, not a shadow: the card clips its children (the backdrop
        // is full-bleed), so a drop shadow would be cut off at the corners.
        borderColor: 'rgba(255, 255, 255, 0.14)',
        borderRadius: radii.sm,
        borderWidth: StyleSheet.hairlineWidth,
        height: EXPLORE_HERO_ARTWORK,
        width: EXPLORE_HERO_ARTWORK,
    },
    /** Same cover, blurred to a wash — the card's only source of colour. */
    exploreHeroBackdrop: {
        ...StyleSheet.absoluteFill,
    },
    exploreHeroEyebrow: {
        color: colors.accent,
        fontFamily: fonts.mono,
        fontSize: 10,
        letterSpacing: 1.4,
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    exploreHeroRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: spacing.md,
        padding: EXPLORE_HERO_PADDING,
    },
    /** Darkens the blur enough for text, densest behind the copy column. */
    exploreHeroScrim: {
        ...StyleSheet.absoluteFill,
    },
    exploreHeroSubtitle: {
        color: colors.muted,
        fontFamily: fonts.mono,
        fontSize: 12,
        lineHeight: 16,
        marginTop: 5,
    },
    exploreHeroText: {
        flex: 1,
        minWidth: 0,
    },
    exploreHeroTitle: {
        color: colors.text,
        fontFamily: fonts.heading,
        fontSize: 24,
        letterSpacing: -0.5,
        lineHeight: 28,
    },
    mediaTitle: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '800',
        // Renders 1px tighter than the line height the row budget reserves
        // (HOME_MEDIA_TITLE_LINE_HEIGHT = 18). A 2-line title therefore comes in
        // ~2px under budget, leaving the subtitle below it room to clear the
        // fixed-height carousel cell instead of being clipped — without making
        // the row any taller.
        lineHeight: 17,
        marginBottom: 1,
    },
    mediaTitleCentered: {
        textAlign: 'center',
    },
    mediaDownloadIndicator: {
        opacity: 0.82,
        paddingTop: 1,
    },
    mediaTitleWide: {
        fontSize: 15,
        lineHeight: 19,
    },
    section: {
        backgroundColor: colors.panel,
        borderRadius: 8,
        marginTop: spacing.lg,
        padding: spacing.md,
    },
    sectionHeaderRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingRight: spacing.sm,
    },
    sectionTitle: {
        color: colors.text,
        fontSize: 22,
        fontFamily: fonts.heading,
        letterSpacing: -0.45,
        marginBottom: 4,
        marginTop: 4,
    },
    sectionViewAll: {
        paddingHorizontal: spacing.xs,
        paddingVertical: 4,
    },
    sectionViewAllLabel: {
        color: colors.accent,
        fontSize: 13,
        fontWeight: '700',
    },
});
