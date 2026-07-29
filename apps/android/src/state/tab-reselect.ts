import { type SamoMobileTabId } from '@samo/core/navigation';
import { useEffect, useRef } from 'react';

/**
 * "Take me to the top of this tab." Pressing the bottom-bar tab you are already
 * on — with nothing else the press could mean — snaps that page back to its rest
 * state: pills/first row at the top, the pull-down search drawer parked above
 * them. HOME ALSO FIRES ON EVERY PRESS, not just a re-tap, because arriving at
 * Home is meant to mean a fresh feed (see `pressTab`).
 *
 * The tab bar knows about the press, each page's scroll hook owns its
 * scrollable, and HomeTabScene owns the refresh — this tiny emitter carries the
 * tab id to all of them without new render-tree plumbing (same module-singleton
 * pattern as the rest of app-navigation). Listeners filter by id so a page only
 * reacts to its OWN tab.
 *
 * THE SIGNAL IS A COUNTER, NOT JUST AN EVENT, AND THAT IS THE WHOLE TRICK.
 *
 * A plain emit is lost whenever the page that should answer it is not currently
 * listening — and the pages that answer it are exactly the ones that get
 * frozen. Background tabs rest behind `<Freeze>`, React suspends the subtree,
 * and a suspended subtree HAS ITS EFFECTS TORN DOWN, so Home's scroll hook and
 * its refresh subscription are both gone while Home is in the background. That
 * is precisely the moment you press Home. The event fired into an empty room
 * and the tab came back neither scrolled up nor refreshed — intermittently,
 * because whichever tab you visited last is kept thawed (`keepWarm`), so
 * bouncing Home↔Podcasts happened to work while anything deeper did not.
 *
 * So every emit bumps a per-tab counter, and `useTabReselect` compares what it
 * has already handled against that counter when its effect (re)runs. A thaw
 * re-runs effects, which means a page that was asleep when the press landed
 * still answers it the moment it wakes. The `seen` ref survives the freeze —
 * Suspense keeps state and refs, it only discards effects — so a press is
 * answered exactly once, never replayed on an unrelated thaw.
 */
type Listener = (tabId: SamoMobileTabId) => void;

const listeners = new Set<Listener>();
const counters = new Map<SamoMobileTabId, number>();

const readCounter = (tabId: SamoMobileTabId): number => counters.get(tabId) ?? 0;

export const subscribeTabReselected = (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const emitTabReselected = (tabId: SamoMobileTabId): void => {
    counters.set(tabId, readCounter(tabId) + 1);
    listeners.forEach((listener) => listener(tabId));
};

/**
 * Run `handler` whenever `tabId` is reselected — including a press that landed
 * while this subtree was frozen, which is caught up on the next thaw.
 *
 * `handler` is read through a ref so a caller may pass an inline closure without
 * re-subscribing on every render.
 */
export const useTabReselect = (tabId: SamoMobileTabId, handler: () => void): void => {
    const latest = useRef(handler);
    latest.current = handler;
    // Seeded with the CURRENT count, so mounting a page for the first time is
    // never mistaken for a press it missed.
    const seen = useRef(readCounter(tabId));

    useEffect(() => {
        if (readCounter(tabId) !== seen.current) {
            seen.current = readCounter(tabId);
            latest.current();
        }
        return subscribeTabReselected((reselectedTabId) => {
            if (reselectedTabId !== tabId) {
                return;
            }
            seen.current = readCounter(tabId);
            latest.current();
        });
    }, [tabId]);
};
