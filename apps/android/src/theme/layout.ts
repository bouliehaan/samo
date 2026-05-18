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
export const MINI_PLAYER_COLLAPSED_TOP =
    SCREEN_HEIGHT - PLAYER_SAFE_TOP - MINI_PLAYER_BOTTOM - MINI_PLAYER_HEIGHT;
export const PLAYER_EXPANSION_DISTANCE = MINI_PLAYER_COLLAPSED_TOP - FULL_PLAYER_EXPANDED_TOP;
export const FULL_PLAYER_ARTWORK_SIZE = Math.min(SCREEN_WIDTH - 64, SCREEN_HEIGHT * 0.42);

// Tuned for a "weighty but settling" feel — never overshoots more than ~3%, lands
// in under 400 ms. Shared by the fullscreen player open and drag-cancel paths so
// both motions read as the same physical object.
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
export const VIEW_ALL_INITIAL_ITEMS = 12;
export const VIEW_ALL_RENDER_BATCH = 12;
export const VIEW_ALL_WINDOW_SIZE = 7;
