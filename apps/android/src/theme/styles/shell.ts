import { StyleSheet } from 'react-native';
import {
    HOME_EDGE_PADDING,
    MINI_PLAYER_HEIGHT,
    MINI_PLAYER_RADIUS,
    SCROLL_CONTENT_BOTTOM_INSET,
    PAGE_TOP_INSET,
    TAB_BAR_BUTTON_MIN_HEIGHT,
    TAB_BAR_HEIGHT,
    TAB_BAR_PADDING_BOTTOM,
    TAB_BAR_PADDING_TOP,
} from '../layout';
import { colors, spacing } from '../tokens';

/** App shell: root containers, tab bar, tab scenes, nav overlays. */
export const shellStyles = StyleSheet.create({
    content: {
        paddingBottom: SCROLL_CONTENT_BOTTOM_INSET,
        paddingHorizontal: HOME_EDGE_PADDING,
        paddingTop: spacing.lg,
    },
    utilityScrollContent: {
        flexGrow: 1,
        paddingBottom: SCROLL_CONTENT_BOTTOM_INSET,
    },
    tabContent: {
        paddingBottom: SCROLL_CONTENT_BOTTOM_INSET,
        paddingHorizontal: HOME_EDGE_PADDING,
        // Radio is the only shared-ScrollView tab; its own screen margin
        // provides the headroom, matching the Playlists tab exactly.
        paddingTop: 0,
    },
    gestureRoot: {
        backgroundColor: colors.background,
        flex: 1,
    },
    header: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 0,
        minHeight: 56,
        paddingTop: PAGE_TOP_INSET,
    },
    keyboardView: {
        flex: 1,
    },
    /** THE top controls row every catalog page opens with (sort chip on the
     *  left, actions on the right). Playlists and Radio both render exactly
     *  this — one style so no two pages can drift apart again. x-origin
     *  contract: the row starts HOME_EDGE_PADDING from the screen edge —
     *  inherited from the padded tab ScrollView on Radio, supplied by
     *  playlistTopPanel on Playlists. */
    pageControlsRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.xs,
        minHeight: 36,
    },
    root: {
        backgroundColor: colors.background,
        flex: 1,
        flexDirection: 'column',
        position: 'relative',
    },
    /** Tab scenes, nav overlays, and player chrome — sits above the in-flow tab bar.
     *  overflow stays VISIBLE: the Home top-glass pane extends STATUS_BAR_INSET
     *  above this box to run under the translucent status bar, and any 'hidden'
     *  here (or on tabSceneHost) clips it flat at the content origin. Nothing
     *  else overhangs: every child is absolute-fill, and the scene dissolve's
     *  6px rise only dips below the bottom edge, under the dock chrome. */
    appContent: {
        flex: 1,
        minHeight: 0,
        position: 'relative',
    },
    safeArea: {
        flex: 1,
    },
    statusPanel: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        padding: spacing.md,
    },
    statusTitle: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 4,
    },
    tabBar: {
        // Content row on the shared frosted dock pane — floats over the scenes
        // (out of flex flow) so scroll content runs beneath the glass.
        backgroundColor: 'transparent',
        bottom: 0,
        flexDirection: 'row',
        left: 0,
        // Vertical padding lives INSIDE each button (tabButton), not on the
        // bar: the visual layout is identical, but the buttons' touchable
        // boxes span the full dock row height instead of just the icon strip.
        paddingHorizontal: spacing.xs,
        position: 'absolute',
        right: 0,
        zIndex: 10000,
    },
    /**
     * The shared frosted-glass pane under the mini player + tab bar — ONE
     * surface for the whole dock, so the two rows read as one piece and no
     * seam can exist between them. Blur + tint + chroma washes live inside
     * (BottomChromeBackdrop); this is geometry only.
     */
    bottomChrome: {
        borderColor: 'rgba(255, 255, 255, 0.09)',
        borderTopWidth: StyleSheet.hairlineWidth,
        bottom: 0,
        left: 0,
        overflow: 'hidden',
        position: 'absolute',
        right: 0,
        zIndex: 9,
    },
    bottomChromeWithMini: {
        borderTopLeftRadius: MINI_PLAYER_RADIUS,
        borderTopRightRadius: MINI_PLAYER_RADIUS,
        height: TAB_BAR_HEIGHT + MINI_PLAYER_HEIGHT,
    },
    bottomChromeBare: {
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        height: TAB_BAR_HEIGHT,
    },
    /**
     * A whisper of smoke over the chrome glass (dock AND Home top bar) —
     * just enough to seat ink on busy artwork. PURE BLACK on purpose: a
     * black overlay is multiplicative (zero additive veil), so it dims what
     * shows through without greying it. The pane's darkness comes from this
     * plus the BlurView's in-matrix `brightness` dim (chromeGlass token).
     * Any non-black smoke here reads as cast on the black glass — the old
     * (4,4,7) was a third of the "bluish greyish" complaint; grey lift
     * belongs to nothing.
     */
    chromeSmoke: {
        backgroundColor: 'rgba(0, 0, 0, 0.26)',
    },
    tabScene: {
        ...StyleSheet.absoluteFill,
        backgroundColor: colors.background,
    },
    /** Active scene layers above the one fading out (TabSceneContainer). */
    tabSceneOnTop: {
        zIndex: 1,
    },
    /** Inner scroll container inside the absolute-fill animated scene layer. */
    tabSceneFill: {
        flex: 1,
    },
    /** Holds the ONE app-level search-pull pan, wrapping the tab scenes (see
     *  SearchPullGestureHost). A real, non-collapsible view: the detector needs
     *  a native view to attach its handler to, and it must sit ABOVE the frozen
     *  scenes so nothing can tear the pan down. Same box as tabSceneHost. */
    searchPullGestureHost: {
        flex: 1,
        position: 'relative',
    },
    /**
     * The two blur targets (see theme/chrome-blur-targets). Deliberately inert:
     * same box as `appContent`, no background, no clipping, no z-index — they
     * exist to record a RenderNode, not to lay anything out. Anything visual
     * here would change what the panes sample.
     */
    chromeBlurTarget: {
        flex: 1,
        position: 'relative',
    },
    /** overflow visible on purpose — see appContent. */
    tabSceneHost: {
        flex: 1,
        position: 'relative',
    },
    /** Applied once a full-screen overlay above the tab host has finished
     *  fading in, so HWUI skips drawing the entire covered scene stack instead
     *  of repainting Home behind an opaque page. Alpha rather than `display`
     *  so layout — and the scenes' scroll offsets — survive untouched.
     *  See the covered-scene note in TabScenes. */
    tabSceneHostCovered: {
        opacity: 0,
    },
    /** Full-screen layer above the always-mounted tab host (detail, settings, view-all). */
    navOverlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: colors.background,
        zIndex: 2,
    },
    navOverlayTop: {
        zIndex: 3,
    },
    navOverlayHidden: {
        opacity: 0,
        zIndex: 0,
    },
    // First-run / no-server onboarding gate. Full-bleed over every surface so
    // the welcome flow reads edge-to-edge and nothing behind it is reachable.
    // top: 0 — the shell parent already starts at physical y=0 (nothing pads
    // for the status bar anymore); the old -24 was compensation for the
    // padded-safeArea era and shoved the overlay's top 24dp off-screen.
    onboardingOverlay: {
        backgroundColor: colors.background,
        bottom: 0,
        left: 0,
        position: 'absolute',
        right: 0,
        top: 0,
        zIndex: 11000,
    },
    tabUtilityScene: {
        flex: 1,
    },
    tabButton: {
        alignItems: 'center',
        borderRadius: 8,
        flex: 1,
        justifyContent: 'center',
        // The button carries the bar's former vertical padding so its hit box
        // is the whole dock row (padding + icon strip), keeping the icon's
        // optical position unchanged. Widths are flex-divided, so hit boxes
        // tile the row edge-to-edge without overlapping.
        minHeight:
            TAB_BAR_PADDING_TOP + TAB_BAR_BUTTON_MIN_HEIGHT + TAB_BAR_PADDING_BOTTOM,
        paddingBottom: TAB_BAR_PADDING_BOTTOM,
        paddingHorizontal: 2,
        paddingTop: TAB_BAR_PADDING_TOP,
    },
    tabButtonActive: {},
    tabHomeBody: {
        borderRadius: 2,
        borderWidth: 2,
        bottom: 2,
        height: 11,
        position: 'absolute',
        width: 15,
    },
    tabHomeRoofLeft: {
        borderRadius: 999,
        height: 2,
        left: 5,
        position: 'absolute',
        top: 6,
        transform: [{ rotate: '-42deg' }],
        width: 11,
    },
    tabHomeRoofRight: {
        borderRadius: 999,
        height: 2,
        position: 'absolute',
        right: 5,
        top: 6,
        transform: [{ rotate: '42deg' }],
        width: 11,
    },
    tabIcon: {
        alignItems: 'center',
        flexDirection: 'row',
        height: 24,
        justifyContent: 'center',
        position: 'relative',
        // Icon-only bar: the glyphs carry the whole tab alone, so they get
        // scaled up (transform keeps every hand-tuned inner metric intact).
        transform: [{ scale: 1.25 }],
        width: 24,
    },
    tabLibraryBook: {
        borderRadius: 2,
        borderWidth: 1.8,
        height: 18,
        marginHorizontal: 1,
        width: 5,
    },
    tabPlaylistLine: {
        borderRadius: 999,
        height: 2.2,
        left: 3,
        position: 'absolute',
        width: 18,
    },
    tabPlaylistPlay: {
        borderBottomColor: 'transparent',
        borderBottomWidth: 4,
        borderLeftWidth: 7,
        borderTopColor: 'transparent',
        borderTopWidth: 4,
        height: 0,
        position: 'absolute',
        right: 1,
        top: 8,
        width: 0,
    },
    tabRadioAntenna: {
        borderRadius: 999,
        height: 8,
        position: 'absolute',
        right: 6,
        top: 2,
        transform: [{ rotate: '34deg' }],
        width: 2,
    },
    tabRadioBody: {
        borderRadius: 4,
        borderWidth: 1.8,
        bottom: 3,
        height: 13,
        position: 'absolute',
        width: 19,
    },
    tabRadioDot: {
        borderRadius: 3,
        bottom: 7,
        height: 6,
        left: 5,
        position: 'absolute',
        width: 6,
    },
    tabRadioLine: {
        borderRadius: 999,
        bottom: 8,
        height: 2,
        position: 'absolute',
        right: 5,
        width: 6,
    },
});
