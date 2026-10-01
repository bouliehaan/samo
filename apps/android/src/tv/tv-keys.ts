import { AppState, DeviceEventEmitter } from 'react-native';

import { clearTvPlacementRequest, getTvFocusedControl } from './tv-focus';

/**
 * MainActivity forwards TV remote keys on samoTvKey. Android owns directional
 * focus; JS completes select on release so a held OK cannot click an item
 * before opening its menu. The bridge leaves text entry and media keys to
 * Android. Seek controls pin native left/right focus and consume those keys.
 */

/** Fallback hold delay for remotes without repeats; native repeats use Android's timeout. */
const LONG_PRESS_MS = 450;

export type TvKey =
    | 'down'
    | 'fastForward'
    | 'left'
    | 'menu'
    | 'next'
    | 'pause'
    | 'play'
    | 'playPause'
    | 'previous'
    | 'rewind'
    | 'right'
    | 'select'
    | 'up';

type TvKeyListener = (key: TvKey, action: 'down' | 'up', repeat: boolean) => void;

const listeners = new Set<TvKeyListener>();
let installed = false;
/** Keys currently held, so a repeat can be told from a fresh press. */
const held = new Set<string>();
let selectDownAt: number | null = null;
let selectLongPressed = false;
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let selectControlId: string | null = null;

const cancelLongPress = (): void => {
    if (longPressTimer !== null) clearTimeout(longPressTimer);
    longPressTimer = null;
};

const handleKeyEvent = (event: {
    eventKeyAction?: number;
    eventType?: string;
    repeatCount?: number;
}): void => {
    const key = event.eventType;
    // Focus and blur ride the same channel with no key action.
    if (!key || event.eventKeyAction == null || event.eventKeyAction < 0) {
        return;
    }
    const action = event.eventKeyAction === 0 ? 'down' : 'up';
    const repeat = action === 'down' && held.has(key);
    if (action === 'down' && !repeat && ['down', 'left', 'right', 'up'].includes(key)) {
        clearTvPlacementRequest();
    }
    if (action === 'down') {
        held.add(key);
    } else {
        held.delete(key);
    }

    if (key === 'select') {
        if (action === 'down' && !repeat) {
            cancelLongPress();
            selectDownAt = Date.now();
            selectLongPressed = false;
            const control = getTvFocusedControl();
            selectControlId = control?.id ?? null;
            if (control?.onLongPress) {
                // Some remotes do not repeat OK. A held key still opens the
                // menu, but never on a different control after focus moves.
                longPressTimer = setTimeout(() => {
                    longPressTimer = null;
                    if (!selectLongPressed && getTvFocusedControl()?.id === control.id) {
                        selectLongPressed = true;
                        control.onLongPress?.();
                    }
                }, LONG_PRESS_MS);
            }
        } else if (
            action === 'down' &&
            !selectLongPressed &&
            selectDownAt !== null &&
            (event.repeatCount || Date.now() - selectDownAt >= LONG_PRESS_MS)
        ) {
            // Only a control that HAS a long press swallows the click: holding
            // OK on anything else is just a slow press, and should still press.
            const control = getTvFocusedControl();
            if (control?.onLongPress && control.id === selectControlId) {
                cancelLongPress();
                selectLongPressed = true;
                control.onLongPress();
            }
        } else if (action === 'up') {
            cancelLongPress();
            const control = getTvFocusedControl();
            if (!selectLongPressed && control?.id === selectControlId) control?.onPress?.();
            selectDownAt = null;
            selectControlId = null;
        }
    }

    // Remotes that have one: Menu is the same request as a held OK.
    if (key === 'menu' && action === 'down' && !repeat) {
        getTvFocusedControl()?.onLongPress?.();
    }

    listeners.forEach((listener) => listener(key as TvKey, action, repeat));
};

/** Wire the key stream once, for the life of the process. */
export const installTvKeys = (): void => {
    if (installed) {
        return;
    }
    installed = true;
    DeviceEventEmitter.addListener('samoTvKey', handleKeyEvent);
    AppState.addEventListener('change', (state) => {
        if (state === 'active') return;
        cancelLongPress();
        held.clear();
        selectDownAt = null;
        selectControlId = null;
        selectLongPressed = false;
    });
};

export const subscribeTvKeys = (listener: TvKeyListener): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

/**
 * Whether the select that is releasing was a long press — in which case the
 * click Android is about to deliver must not also fire. Consumes the answer,
 * so it can only swallow one click.
 */
export const takeTvLongPressClick = (): boolean => {
    if (!selectLongPressed) {
        return false;
    }
    selectLongPressed = false;
    return true;
};
