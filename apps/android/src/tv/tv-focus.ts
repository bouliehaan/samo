/**
 * Where D-pad focus is right now, in the terms Back, the rail guide and the
 * long-press menu reason about.
 *
 * Android owns focus; this only mirrors it from each control's focus and blur
 * events. It is a module, not state: nothing renders from it, it is read at
 * the moment a key is handled.
 */
export type TvZone = 'content' | 'menu' | 'player' | 'rail';

type FocusedControl = {
    id: string;
    onPress?: () => void;
    /** What a held OK (or a remote's Menu key) does on this control. */
    onLongPress?: () => void;
    zone: TvZone;
};

let focused: FocusedControl | null = null;
let lastZone: TvZone | null = null;

/**
 * Which side of the rail should receive focus when a surface there is shown
 * again — after the player or a menu closes, after Back pops a page.
 *
 * Both the rail and the content beneath an overlay become visible in the same
 * commit, and each would otherwise place focus in itself; the one the person
 * was in when the overlay opened is the one that should. It follows the person
 * (every focus in the rail or the content moves it), and navigation sets it
 * outright when it means to send focus somewhere: a rail item's OK sends it
 * into the page, Back from the rail keeps it on the rail.
 */
let placementZone: Extract<TvZone, 'content' | 'rail'> = 'content';
let requestedZone: Extract<TvZone, 'content' | 'rail'> | null = null;

export const noteTvFocus = (control: FocusedControl): void => {
    focused = control;
    lastZone = control.zone;
    if (control.zone === 'content' || control.zone === 'rail') {
        // Hiding the old surface can make Android briefly focus the rail.
        // That automatic move must not overwrite an explicit navigation intent.
        if (requestedZone !== null && control.zone !== requestedZone) return;
        requestedZone = null;
        placementZone = control.zone;
    }
};

export const setTvPlacementZone = (zone: Extract<TvZone, 'content' | 'rail'>): void => {
    placementZone = zone;
    requestedZone = zone;
};

/** A deliberate D-pad move takes precedence over any pending placement. */
export const clearTvPlacementRequest = (): void => {
    requestedZone = null;
};

/** Whether a surface in `zone` should take focus as it is shown. Overlays
 *  (the player, a menu) always do; the rail and the content only when focus
 *  belongs on their side. */
export const shouldTvZoneTakeFocus = (zone: TvZone): boolean =>
    zone === 'menu' || zone === 'player' || zone === placementZone;

export const noteTvBlur = (id: string): void => {
    if (focused?.id === id) {
        focused = null;
    }
};

export const getTvFocusedControl = (): FocusedControl | null => focused;

/** The zone of the last control that held focus — still answered while focus
 *  is in transit (on a guide, or nowhere) between two controls. */
export const getTvLastZone = (): TvZone | null => lastZone;
