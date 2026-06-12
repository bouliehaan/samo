import { Dimensions, Platform } from 'react-native';

import { spacing } from './tokens';

export const SCREEN_HEIGHT = Dimensions.get('window').height;
export const SCREEN_WIDTH = Dimensions.get('window').width;

export const PLAYER_SAFE_TOP = Platform.OS === 'android' ? 24 : 0;

/** Tab bar chrome — keep in sync with `styles.tabBar`. */
export const TAB_BAR_PADDING_TOP = 8;
export const TAB_BAR_PADDING_BOTTOM = 16;
export const TAB_BAR_BUTTON_MIN_HEIGHT = 62;
export const TAB_BAR_HEIGHT =
    TAB_BAR_PADDING_TOP + TAB_BAR_BUTTON_MIN_HEIGHT + TAB_BAR_PADDING_BOTTOM;

/** Mini player sits flush on the tab bar — one unified bottom dock. */
export const MINI_PLAYER_BOTTOM = TAB_BAR_HEIGHT;
export const MINI_PLAYER_ARTWORK_SIZE = 58;
export const MINI_PLAYER_VERTICAL_PADDING = 12;
export const MINI_PLAYER_HEIGHT = MINI_PLAYER_ARTWORK_SIZE + MINI_PLAYER_VERTICAL_PADDING * 2;
/** Mini player overlaps scroll content by its height only — tab bar is already out of flow. */
export const SCROLL_CONTENT_BOTTOM_INSET = MINI_PLAYER_HEIGHT + spacing.sm;
/** Slightly rounder than flat; echoes display bottom corners without a pill shape. */
export const MINI_PLAYER_RADIUS = 34;

export const FULL_PLAYER_EXPANDED_TOP = -PLAYER_SAFE_TOP;
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

/** `continueProgressTrack` + margin when a tile shows playback progress. */
export const HOME_MEDIA_PROGRESS_CHROME = 4 + 4;
export const HOME_MEDIA_ROW_HEIGHT = HOME_PRIMARY_TILE + HOME_MEDIA_TILE_CHROME;
export const HOME_MEDIA_ROW_HEIGHT_ARTIST =
    HOME_PRIMARY_TILE - HOME_COMPACT_OFFSET + HOME_MEDIA_TILE_CHROME;
export const HOME_MEDIA_ROW_HEIGHT_ROUNDED =
    HOME_PRIMARY_TILE - HOME_ROUNDED_OFFSET + HOME_MEDIA_TILE_CHROME;
export const HOME_MEDIA_ROW_HEIGHT_WIDE = 136;
export const HOME_ROW_INITIAL_ITEMS = 6;
export const HOME_ROW_RENDER_BATCH = 6;
export const HOME_ROW_WINDOW_SIZE = 5;

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
