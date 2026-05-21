import { Dimensions, Platform } from 'react-native';

export const SCREEN_HEIGHT = Dimensions.get('window').height;
export const SCREEN_WIDTH = Dimensions.get('window').width;

export const PLAYER_SAFE_TOP = Platform.OS === 'android' ? 24 : 0;

export const MINI_PLAYER_BOTTOM = 75;
export const MINI_PLAYER_ARTWORK_SIZE = 58;
export const MINI_PLAYER_VERTICAL_PADDING = 10;
export const MINI_PLAYER_HEIGHT = MINI_PLAYER_ARTWORK_SIZE + MINI_PLAYER_VERTICAL_PADDING * 2;
export const MINI_PLAYER_RADIUS = 28;

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

export const FULL_PLAYER_HEADER_HEIGHT = 44;
/** Music layout: metadata + seek + controls + cast row below the flex artwork well. */
export const FULL_PLAYER_BELOW_ARTWORK_CHROME = 310;
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
export const HOME_ROW_INITIAL_ITEMS = 6;
export const HOME_ROW_RENDER_BATCH = 6;
export const HOME_ROW_WINDOW_SIZE = 5;

export const VIEW_ALL_SIDEBAR_GUTTER = 30;
export const VIEW_ALL_TILE_SIZE = Math.floor(
    (SCREEN_WIDTH - HOME_EDGE_PADDING * 2 - HOME_TILE_GAP - VIEW_ALL_SIDEBAR_GUTTER) / 2,
);
export const VIEW_ALL_TILE_HEIGHT = VIEW_ALL_TILE_SIZE + 6 + 18 + 16;
export const VIEW_ALL_ROW_HEIGHT = VIEW_ALL_TILE_HEIGHT + HOME_TILE_GAP;
export const VIEW_ALL_INITIAL_ITEMS = 8;
export const VIEW_ALL_RENDER_BATCH = 8;
export const VIEW_ALL_WINDOW_SIZE = 5;
