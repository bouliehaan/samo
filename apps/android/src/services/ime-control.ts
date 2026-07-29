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

/*
 * SESSION GENERATION — the guard against a grant that arrives too late.
 *
 * `controlWindowInsetsAnimation` takes the system on the order of 740ms to
 * honour, and a search pull can easily be started, released and finished well
 * inside that. When it is, the sequence runs:
 *
 *   start()  ...gesture ends... finish()  ...THEN the grant lands...
 *
 * and that last step hands a live controller to a gesture that no longer
 * exists. `finish()` had nothing to release when it ran, so nothing releases it
 * afterwards either: the keyboard is left under our thumb with no finger
 * driving it, and the IME visibly moves on its own a beat after the user put
 * the surface away. That is the flash — it is not the dismissal misbehaving,
 * it is the PREVIOUS request landing on top of it.
 *
 * Every `finish` bumps the generation, so a `start` that resolves after it can
 * see it has been superseded and hand the controller straight back — settling
 * the IME to whatever that finish asked for, which is the outcome the user's
 * gesture actually chose.
 */
let sessionGeneration = 0;
/** What the most recent `finish` asked the IME to settle to, so a late grant
 *  resolves to the same place rather than guessing. */
let lastFinishShown = false;

/**
 * Ask for control of the IME. Resolves true once the system has handed it over —
 * which is ASYNCHRONOUS, so the first frames of a gesture may land before control
 * exists. `setImeFraction` is a no-op until then rather than an error, so the
 * caller can just keep pushing frames.
 *
 * Resolves FALSE when the grant arrived after the gesture had already finished:
 * the session is released here and the caller never sees it, so there is no such
 * thing as a controller nobody is driving.
 */
export const startImeControl = async (): Promise<boolean> => {
    if (!isAndroid || !native) {
        return false;
    }
    const generation = ++sessionGeneration;
    const granted = await native.start().catch(() => false);
    if (!granted) {
        return false;
    }
    if (generation !== sessionGeneration) {
        // Superseded while we waited. Give it back at the position the gesture
        // that superseded us asked for, so the keyboard lands where the user
        // left it instead of wherever this stale session happened to open.
        native.finish(lastFinishShown);
        return false;
    }
    return true;
};

/** 0 = fully hidden, 1 = fully shown. Safe to call every frame. */
export const setImeFraction = (fraction: number): void => {
    native?.setFraction(fraction);
};

/**
 * Release the IME, letting it settle to `shown` from wherever it was left.
 *
 * Also invalidates any request still in flight — see the generation note above.
 * This is why it is safe to call on every terminal path of the gesture,
 * including the ones where control was asked for but never arrived.
 */
export const finishImeControl = (shown: boolean): void => {
    sessionGeneration += 1;
    lastFinishShown = shown;
    native?.finish(shown);
};
