import { NativeModules, Platform } from 'react-native';

/**
 * Frame-accurate soft-keyboard control (see SamoImeControlModule.kt).
 *
 * React Native can only focus and blur, which asks the system to play its own
 * show/hide animation on its own clock — the keyboard arrives *after* your
 * gesture, never during it. This drives the IME's actual position instead, so it
 * can be dragged up and down by a finger like any other surface.
 *
 * Android 11+ only. `isImeControlSupported()` is false below that and every
 * other call is a no-op, so callers degrade to ordinary focus without branching.
 */
interface SamoImeControlNative {
    isSupported: () => Promise<boolean>;
    start: () => Promise<boolean>;
    setFraction: (fraction: number) => void;
    finish: (shown: boolean) => void;
}

const native = (NativeModules as { SamoImeControl?: SamoImeControlNative })
    .SamoImeControl;

const isAndroid = Platform.OS === 'android';

let supported: boolean | null = null;

export const isImeControlSupported = async (): Promise<boolean> => {
    if (!isAndroid || !native) {
        return false;
    }
    if (supported === null) {
        supported = await native.isSupported().catch(() => false);
    }
    return supported;
};

/**
 * The search field registers a focuser here so IME control can be requested in
 * ONE ordered step: focus first, then ask.
 *
 * Android denies `controlWindowInsetsAnimation` outright when there is no focused
 * editor — there is nothing for it to animate. Routing focus through
 * `useAnimatedReaction -> runOnJS -> setState -> effect` while the control request
 * went out from the gesture worklet meant the two raced, and whether the keyboard
 * tracked your finger came down to which landed first.
 */
let focusImeTarget: (() => void) | null = null;

export const registerImeTarget = (focuser: (() => void) | null): void => {
    focusImeTarget = focuser;
};

/**
 * Focus the field and take control of the keyboard, in that order, in one call.
 * This is what a gesture should call — never `startImeControl` directly.
 */
export const beginImeControl = async (): Promise<boolean> => {
    focusImeTarget?.();
    return startImeControl();
};

/**
 * Ask for control of the IME. Resolves true once the system has handed it over —
 * which is ASYNCHRONOUS, so the first frames of a gesture may land before control
 * exists. `setImeFraction` is a no-op until then rather than an error, so the
 * caller can just keep pushing frames.
 */
export const startImeControl = async (): Promise<boolean> => {
    if (!isAndroid || !native) {
        return false;
    }
    return native.start().catch(() => false);
};

/** 0 = fully hidden, 1 = fully shown. Safe to call every frame. */
export const setImeFraction = (fraction: number): void => {
    native?.setFraction(fraction);
};

/** Release the IME, letting it settle to `shown` from wherever it was left. */
export const finishImeControl = (shown: boolean): void => {
    native?.finish(shown);
};
