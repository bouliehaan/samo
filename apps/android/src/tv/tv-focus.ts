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

type TvArrow = 'down' | 'left' | 'right' | 'up';

/** The person's D-pad moves so far. A placement owed from before the latest
 *  one has been overtaken: they already put focus where they want it. */
let moves = 0;
/** An arrow press whose focus move has not landed on a control yet. A Left
 *  or Right one is the only way focus reaches the rail/content seam on the
 *  person's behalf. */
let pendingMove: TvArrow | null = null;
/** The arrow that brought focus to the control holding it, if one did —
 *  rather than Android parking it there, or a placement. */
let arrivedBy: TvArrow | null = null;

const isArrow = (key: string): key is TvArrow =>
    key === 'down' || key === 'left' || key === 'right' || key === 'up';

export const noteTvFocus = (control: FocusedControl): void => {
    focused = control;
    lastZone = control.zone;
    arrivedBy = pendingMove;
    pendingMove = null;
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
    pendingMove = null;
};

/**
 * A remote key going down, as it arrives — before Android moves focus for it.
 * An arrow is a deliberate move, which takes precedence over any pending
 * placement.
 */
export const noteTvKeyDown = (key: string): void => {
    if (isArrow(key)) {
        moves += 1;
        requestedZone = null;
        pendingMove = key;
    } else {
        pendingMove = null;
    }
};

export const getTvMoveCount = (): number => moves;

/**
 * Which side of the rail the person is on, as Back understands it: where
 * focus belongs, not where it happens to be. While a detail is still loading
 * (or failed to), focus waits on the rail, but Back should close the detail.
 */
export const getTvBackZone = (): TvZone | null =>
    lastZone === 'content' || lastZone === 'rail' ? placementZone : lastZone;

/** Whether focus arriving now is the person crossing sideways, rather than
 *  Android putting it somewhere because the control holding it went away. */
export const isTvSidewaysMove = (): boolean => pendingMove === 'left' || pendingMove === 'right';

/**
 * Whether the person pressed Up to reach the control focus has just arrived
 * on. A list that brings its header back into view for such a control must
 * not do it for focus Android parks there in passing (closing the player
 * parks it on a page's first control): that scroll would land after the
 * page's own placement, and leave the placed control off screen.
 */
export const didTvFocusArriveUp = (): boolean => arrivedBy === 'up';

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
