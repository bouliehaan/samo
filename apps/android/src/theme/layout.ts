import { Dimensions, Platform, StatusBar } from 'react-native';
import { initialWindowMetrics } from 'react-native-safe-area-context';

import { type HomeDisplaySection } from '../types/home';
import { spacing } from './tokens';

export const SCREEN_HEIGHT = Dimensions.get('window').height;
export const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * REAL Android status-bar height, from the native window insets
 * (react-native-safe-area-context's startup constant — no provider needed,
 * and the app is portrait-locked so it never changes mid-process). RN's
 * StatusBar.currentHeight reads the legacy status_bar_height resource, which
 * mis-reports on display-cutout devices — that lie is what forced the old
 * "+28dp of insurance" page tops (the giant foreheads). It remains ONLY as
 * the fallback for a stale binary that predates the native module
 * (initialWindowMetrics is null there, and JS-only re-syncs keep working).
 */
const NATIVE_WINDOW_TOP_INSET = initialWindowMetrics?.insets.top ?? 0;
export const STATUS_BAR_INSET =
    Platform.OS === 'android'
        ? NATIVE_WINDOW_TOP_INSET > 0
            ? Math.round(NATIVE_WINDOW_TOP_INSET)
            : (StatusBar.currentHeight ?? 24)
        : 0;

/**
 * THE top clearance for every page's first row: the real status bar + one
 * tight, uniform breathing gap (Spotify-tier). All five tabs, the search
 * overlay, view-all and utility headers share this single token — never add
 * per-page "optical" fudge on top of it; that's how the foreheads happened.
 */
export const PAGE_TOP_INSET = STATUS_BAR_INSET + 8;

/** Home scene + search overlay top — SAME value as every other page top.
 *  Kept as its own name because these two surfaces MUST stay equal to each
 *  other (the overlay's field lands exactly on the drawer's field row), and
 *  the shared token spells that contract out. */
export const HOME_SCENE_TOP_INSET = PAGE_TOP_INSET;

/**
 * The Home refresh sweep (see HomeRefreshIndicator). It is seated in the gutter
 * PAGE_TOP_INSET opens above the first row, so it must stay thinner than that
 * 8px — the whole point of the placement is that it occupies space nothing else
 * wants. The segment width is shared with the component because the sweep's
 * travel is computed from it; two copies of the number would drift and leave the
 * bar entering or leaving mid-screen.
 */
export const HOME_REFRESH_BAR_HEIGHT = 2.5;
export const HOME_REFRESH_SEGMENT_WIDTH = Math.round(SCREEN_WIDTH * 0.38);

/**
 * Search field geometry, shared by the floating pull-down surface
 * (SearchPullSurface) and the full-search overlay so both land the field on the
 * identical row — opening search reads as the pulled bar coming alive. The
 * pull's own thresholds and springs live in components/search-pull.
 */
export const HOME_SEARCH_FIELD_HEIGHT = 52;
export const HOME_SEARCH_DRAWER_PADDING = 10;
/**
 * The gap between the open drawer's bottom lip and the filter pills — and,
 * once the drawer is parked, the strip of page that sits under the status bar.
 *
 * It is BOTH because the drawer rides the scroll: whatever separates the field
 * from the pills when open is what the pills are offset by at rest. That is
 * why the previous drawer had a ~56dp void under its field — this spacer was a
 * whole HOME_SCENE_TOP_INSET, because the row had to be geometrically
 * off-screen at rest and the pills still had to clear the clock. The reveal
 * animation lifts that requirement (see HOME_SEARCH_DRAWER_HIDE_TRANSLATE), so
 * the gap can now just be a gap.
 */
export const HOME_SEARCH_DRAWER_REST_GAP = 12;

export const PLAYER_SAFE_TOP = STATUS_BAR_INSET;

/** Tab bar chrome — keep in sync with `styles.tabBar`. Icon-only: the
 *  buttons are shorter than the labeled era, with the reclaimed height spent
 *  on even breathing room around the (scaled-up) glyphs. */
export const TAB_BAR_PADDING_TOP = 14;
export const TAB_BAR_PADDING_BOTTOM = 20;
export const TAB_BAR_BUTTON_MIN_HEIGHT = 44;
export const TAB_BAR_HEIGHT =
    TAB_BAR_PADDING_TOP + TAB_BAR_BUTTON_MIN_HEIGHT + TAB_BAR_PADDING_BOTTOM;

/** Mini player sits flush on the tab bar — one unified bottom dock. */
export const MINI_PLAYER_BOTTOM = TAB_BAR_HEIGHT;
export const MINI_PLAYER_ARTWORK_SIZE = 58;
export const MINI_PLAYER_VERTICAL_PADDING = 12;
export const MINI_PLAYER_HEIGHT = MINI_PLAYER_ARTWORK_SIZE + MINI_PLAYER_VERTICAL_PADDING * 2;
/**
 * The whole bottom dock (tab bar + mini player) now FLOATS over the scenes on
 * one shared frosted-glass pane — the tab bar left the flex flow, so scroll
 * content runs underneath it and every scrolling screen must clear the full
 * dock height.
 */
export const SCROLL_CONTENT_BOTTOM_INSET = TAB_BAR_HEIGHT + MINI_PLAYER_HEIGHT + spacing.sm;
/**
 * Bottom inset when the mini player is hidden (nothing playing and nothing in
 * the last-played slot): just the floating tab bar plus a breathing gap —
 * anything more is dead space (the "chin"). See `useScrollContentBottomInset`.
 */
export const SCROLL_CONTENT_BOTTOM_INSET_COLLAPSED = TAB_BAR_HEIGHT + spacing.sm;
/** Slightly rounder than flat; echoes display bottom corners without a pill shape. */
export const MINI_PLAYER_RADIUS = 34;

// The app shell no longer pads for the status bar (screens self-clear with
// STATUS_BAR_INSET), so the player shell's parent already starts at physical
// y=0 and the expanded player docks at 0 — NOT -PLAYER_SAFE_TOP. The old
// offset assumed a safeArea-padded shell; keeping it after that padding was
// removed shifted the open player up one status-bar-height (header under the
// clock) and left an inset-tall strip of the parked shell peeking at the
// screen's bottom edge.
export const FULL_PLAYER_EXPANDED_TOP = 0;
export const FULL_PLAYER_PADDING_TOP = Platform.OS === 'android' ? 42 : 24;
export const FULL_PLAYER_PADDING_BOTTOM = 28;
// Match the absolute miniplayer (`bottom: MINI_PLAYER_BOTTOM`) so the
// expanding shell lands on the same pixel row at progress 0.
export const MINI_PLAYER_COLLAPSED_TOP =
    SCREEN_HEIGHT - MINI_PLAYER_BOTTOM - MINI_PLAYER_HEIGHT;
export const PLAYER_EXPANSION_DISTANCE = MINI_PLAYER_COLLAPSED_TOP - FULL_PLAYER_EXPANDED_TOP;
export const FULL_PLAYER_ARTWORK_SIZE = Math.min(SCREEN_WIDTH - 64, SCREEN_HEIGHT * 0.42);

/** Mini row inset — must match `miniPlayerTouchable` padding. */
export const MINI_PLAYER_ARTWORK_LEFT = 18;
export const MINI_PLAYER_ARTWORK_RADIUS = 10;

/** Mini play button dimensions + center (in screen coords at progress=0). */
export const MINI_PLAYER_PLAY_SIZE = 50;
export const MINI_PLAYER_PLAY_GLYPH_SIZE = 24;
export const MINI_PLAYER_PLAY_CENTER_X =
    SCREEN_WIDTH - MINI_PLAYER_ARTWORK_LEFT - MINI_PLAYER_PLAY_SIZE / 2;
export const MINI_PLAYER_PLAY_CENTER_Y =
    SCREEN_HEIGHT - MINI_PLAYER_BOTTOM - MINI_PLAYER_HEIGHT / 2;

/** Full primary play button — final size, centered horizontally. Vertical is
 * measured at runtime in PlayerSurface (bottom-block layout varies with track
 * type), with this estimate as the initial value before measurement settles. */
export const FULL_PLAYER_PLAY_SIZE = 88;
export const FULL_PLAYER_PLAY_GLYPH_SIZE = 54;
export const FULL_PLAYER_PLAY_CENTER_X = SCREEN_WIDTH / 2;
export const FULL_PLAYER_PLAY_CENTER_Y_ESTIMATE = SCREEN_HEIGHT - 150;

export const FULL_PLAYER_HEADER_HEIGHT = 44;
/** Music layout: metadata + seek + controls + cast row below the flex artwork well. */
export const FULL_PLAYER_BELOW_ARTWORK_CHROME = 350;
export const FULL_PLAYER_HERO_SHADOW_OFFSET = 8;

const FULL_PLAYER_ARTWORK_WELL =
    SCREEN_HEIGHT -
    FULL_PLAYER_PADDING_TOP -
    FULL_PLAYER_PADDING_BOTTOM -
    FULL_PLAYER_HEADER_HEIGHT -
    FULL_PLAYER_BELOW_ARTWORK_CHROME -
    FULL_PLAYER_ARTWORK_SIZE;

/** Hero center in the shell's full-size content coordinate space. */
export const FULL_PLAYER_HERO_TOP =
    FULL_PLAYER_PADDING_TOP +
    FULL_PLAYER_HEADER_HEIGHT +
    Math.max(0, FULL_PLAYER_ARTWORK_WELL / 2) +
    FULL_PLAYER_HERO_SHADOW_OFFSET;

export const FULL_PLAYER_HERO_LEFT =
    (SCREEN_WIDTH - FULL_PLAYER_ARTWORK_SIZE) / 2;

// Default settle spring for sheets/queue. Player open/close use player-motion springs.
export const OPEN_SPRING = { damping: 26, mass: 0.9, stiffness: 220 } as const;
// When the OS-level "reduce motion" setting is on, use an effectively
// over-damped spring so the same code path arrives at the target without any
// overshoot, bounce, or sustained travel. Cheaper than special-casing
// withTiming everywhere and keeps the velocity-aware drag math intact.
export const REDUCED_MOTION_SPRING = { damping: 90, mass: 1, stiffness: 400 } as const;

// How far the player must be dragged (or how fast it must be flung) before a
// release commits to dismiss instead of springing back.
export const DISMISS_DISTANCE = PLAYER_EXPANSION_DISTANCE * 0.28;
export const DISMISS_VELOCITY = 900;

// The queue sheet covers the lower 78% of the player when fully open; the
// remaining strip keeps a sliver of artwork visible for context.
export const QUEUE_SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.78);
export const QUEUE_CLOSE_DISTANCE = 30;
export const QUEUE_CLOSE_VELOCITY = 360;
// Queue rows are FIXED height — the drag-to-reorder slot math derives insertion
// positions arithmetically from these instead of measuring virtualized rows.
export const QUEUE_SHEET_ROW_HEIGHT = 60;
export const QUEUE_SHEET_HEADER_ROW_HEIGHT = 36;

// Two album cards must fit perfectly across the screen with breathing room.
export const HOME_EDGE_PADDING = 10;
export const HOME_TILE_GAP = 6;
export const HOME_PRIMARY_TILE = Math.floor(
    (SCREEN_WIDTH - HOME_EDGE_PADDING * 2 - HOME_TILE_GAP) / 2,
);
export const HOME_COMPACT_OFFSET = 30;
export const HOME_ROUNDED_OFFSET = 22;
/** Tight gap between artwork and title (styles.mediaArtwork marginBottom). */
const HOME_MEDIA_ARTWORK_TEXT_GAP = 4;
const HOME_MEDIA_TITLE_LINE_HEIGHT = 18;
const HOME_MEDIA_TITLE_MAX_LINES = 2;
const HOME_MEDIA_TITLE_MARGIN_BOTTOM = 1;
const HOME_MEDIA_SUBTITLE_LINE_HEIGHT = 16;
/** Minimal descender room; tiles use includeFontPadding={false} on Android. */
const HOME_MEDIA_TEXT_DESCENDER_SLACK = 2;
/** Subtitle row height including descender slack (matches `mediaInfoRow`). */
export const HOME_MEDIA_SUBTITLE_ROW_HEIGHT =
    HOME_MEDIA_SUBTITLE_LINE_HEIGHT + HOME_MEDIA_TEXT_DESCENDER_SLACK;
/**
 * Real, explicit clearance for the title+subtitle block. The previous design
 * budgeted exactly 2 title lines and clawed back 1px by rendering the title
 * tighter than its budget — a near-zero-slack pixel fight that still clipped the
 * subtitle on real devices whenever a title wrapped to 2 lines (the reported
 * Home bug). Reserving a few honest pixels here makes the cell taller than its
 * contents instead of fighting them, so the subtitle always clears.
 */
const HOME_MEDIA_TILE_BLOCK_SLACK = 6;

/** Title + subtitle block under a home carousel tile (`mediaTileCompact`). */
export const HOME_MEDIA_TILE_CHROME =
    HOME_MEDIA_ARTWORK_TEXT_GAP +
    HOME_MEDIA_TITLE_LINE_HEIGHT * HOME_MEDIA_TITLE_MAX_LINES +
    HOME_MEDIA_TITLE_MARGIN_BOTTOM +
    HOME_MEDIA_SUBTITLE_ROW_HEIGHT +
    HOME_MEDIA_TILE_BLOCK_SLACK;

export const HOME_MEDIA_TILE_CHROME_COMPACT =
    HOME_MEDIA_ARTWORK_TEXT_GAP +
    HOME_MEDIA_TITLE_LINE_HEIGHT * 1 +
    HOME_MEDIA_TITLE_MARGIN_BOTTOM +
    HOME_MEDIA_SUBTITLE_ROW_HEIGHT +
    HOME_MEDIA_TILE_BLOCK_SLACK;

/** `continueProgressTrack` + margin when a tile shows playback progress. */
export const HOME_MEDIA_PROGRESS_CHROME = 4 + 4;
export const HOME_MEDIA_ROW_HEIGHT = HOME_PRIMARY_TILE + HOME_MEDIA_TILE_CHROME;
export const HOME_MEDIA_ROW_HEIGHT_COMPACT = HOME_PRIMARY_TILE + HOME_MEDIA_TILE_CHROME_COMPACT;
export const HOME_MEDIA_ROW_HEIGHT_ARTIST =
    HOME_PRIMARY_TILE - HOME_COMPACT_OFFSET + HOME_MEDIA_TILE_CHROME;
export const HOME_MEDIA_ROW_HEIGHT_ROUNDED =
    HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET + HOME_MEDIA_TILE_CHROME;
export const HOME_MEDIA_ROW_HEIGHT_WIDE = 136;
/**
 * The Explore drop's featured card. It is the only home shelf that is a single
 * item, so it is not a carousel at all — it spans the full content width like
 * a hero (`HomeExploreHero`), and this is its exact height.
 */
export const EXPLORE_HERO_PADDING = 14;
export const EXPLORE_HERO_ARTWORK = 112;
export const EXPLORE_HERO_HEIGHT = EXPLORE_HERO_ARTWORK + EXPLORE_HERO_PADDING * 2;
export const HOME_ROW_INITIAL_ITEMS = 6;
export const HOME_ROW_RENDER_BATCH = 6;
export const HOME_ROW_WINDOW_SIZE = 5;

/**
 * Horizontal stride of one home-row item (tile width + gap). Shared by the
 * FlashList drawDistance/item-length in `HomeDisplayRow` and the skeleton row,
 * so a reserved placeholder is the same width as the real tile.
 */
export const getHomeRowItemLength = (variant: HomeDisplaySection['variant']): number => {
    switch (variant) {
        case 'artist':
            return HOME_PRIMARY_TILE - HOME_COMPACT_OFFSET + HOME_TILE_GAP;
        case 'podcast':
        case 'podcast-feed':
        case 'radio':
            return HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET + HOME_TILE_GAP;
        // The Explore hero spans the page, so its "stride" is the whole
        // content width — nothing ever scrolls beside it.
        case 'explo':
            return SCREEN_WIDTH - HOME_EDGE_PADDING * 2;
        case 'continue':
        case 'wide':
            return 320 + HOME_TILE_GAP;
        case 'album':
        case 'book':
        case 'playlist':
        case 'recents':
            return HOME_PRIMARY_TILE + HOME_TILE_GAP;
    }
};

/**
 * Exact pixel height of a home shelf's scroll row for a variant. The single
 * source of truth for both the real `HomeDisplayRow` FlashList height AND the
 * skeleton placeholder height — equal heights are what let a pending shelf swap
 * to real content with ZERO layout shift.
 */
export const getHomeSectionRowHeight = (
    variant: HomeDisplaySection['variant'],
    rowCount: number,
): number => {
    let singleHeight: number;
    switch (variant) {
        case 'artist':
            singleHeight = HOME_MEDIA_ROW_HEIGHT_ARTIST;
            break;
        case 'podcast':
        case 'radio':
            singleHeight = HOME_MEDIA_ROW_HEIGHT_ROUNDED;
            break;
        case 'podcast-feed':
            singleHeight = HOME_MEDIA_ROW_HEIGHT_ROUNDED + HOME_MEDIA_PROGRESS_CHROME;
            break;
        case 'explo':
            singleHeight = EXPLORE_HERO_HEIGHT;
            break;
        case 'continue':
        case 'wide':
            singleHeight = HOME_MEDIA_ROW_HEIGHT_WIDE;
            break;
        case 'recents':
            singleHeight = HOME_MEDIA_ROW_HEIGHT_COMPACT;
            break;
        default:
            singleHeight = HOME_MEDIA_ROW_HEIGHT;
    }

    return rowCount > 1 ? singleHeight * 2 + spacing.xs : singleHeight;
};

/** Two-up "Browse" cards in the search overlay — same arithmetic as the home
 *  tiles so both grids sit on the identical column edges. */
export const SEARCH_BROWSE_CARD_WIDTH = Math.floor(
    (SCREEN_WIDTH - HOME_EDGE_PADDING * 2 - spacing.sm) / 2,
);

export const VIEW_ALL_SIDEBAR_GUTTER = 30;
export const VIEW_ALL_TILE_SIZE = Math.floor(
    (SCREEN_WIDTH - HOME_EDGE_PADDING * 2 - HOME_TILE_GAP - VIEW_ALL_SIDEBAR_GUTTER) / 2,
);
// Artwork + text-gap + one title line + one subtitle line + explicit slack.
// The previous `+ 6 + 18 + 16` budget was exact-to-the-pixel: the metadata
// row's centering + line metrics on real devices clipped the bottom half of
// every subtitle (same disease the Home tiles had — see
// HOME_MEDIA_TILE_BLOCK_SLACK above). Reserve honest clearance instead of
// fighting for pixels.
const VIEW_ALL_TILE_TEXT_GAP = 6;
const VIEW_ALL_TILE_TITLE_LINE = 18;
const VIEW_ALL_TILE_SUBTITLE_LINE = 16;
const VIEW_ALL_TILE_BLOCK_SLACK = 6;
export const VIEW_ALL_TILE_HEIGHT =
    VIEW_ALL_TILE_SIZE +
    VIEW_ALL_TILE_TEXT_GAP +
    VIEW_ALL_TILE_TITLE_LINE +
    VIEW_ALL_TILE_SUBTITLE_LINE +
    VIEW_ALL_TILE_BLOCK_SLACK;
export const VIEW_ALL_ROW_HEIGHT = VIEW_ALL_TILE_HEIGHT + HOME_TILE_GAP;
export const VIEW_ALL_INITIAL_ITEMS = 8;
export const VIEW_ALL_RENDER_BATCH = 8;
export const VIEW_ALL_WINDOW_SIZE = 5;
