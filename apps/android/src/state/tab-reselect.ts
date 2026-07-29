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

/** One independent signal: its own subscribers and its own per-tab counter. */
type Channel = {
    counters: Map<SamoMobileTabId, number>;
    listeners: Set<Listener>;
};

const createChannel = (): Channel => ({ counters: new Map(), listeners: new Set() });

/** "Go to this tab's rest state" — scroll to top, park the search drawer. */
const reselectChannel = createChannel();
/**
 * "Refresh this tab." SEPARATE from reselect on purpose: pressing Home means
 * the smallest thing it can — arrive, then go to the top, and only re-fetch
 * once you are already at the top and press again. One channel could not
 * express that, because scroll-to-top and refresh have to fire on different
 * presses.
 */
const refreshChannel = createChannel();

const readCounterOn = (channel: Channel, tabId: SamoMobileTabId): number =>
    channel.counters.get(tabId) ?? 0;

const emitOn = (channel: Channel, tabId: SamoMobileTabId): void => {
    channel.counters.set(tabId, readCounterOn(channel, tabId) + 1);
    channel.listeners.forEach((listener) => listener(tabId));
};

const subscribeOn = (channel: Channel, listener: Listener): (() => void) => {
    channel.listeners.add(listener);
    return () => {
        channel.listeners.delete(listener);
    };
};

const useChannel = (channel: Channel, tabId: SamoMobileTabId, handler: () => void): void => {
    const latest = useRef(handler);
    latest.current = handler;
    const seen = useRef(readCounterOn(channel, tabId));

    useEffect(() => {
        if (readCounterOn(channel, tabId) !== seen.current) {
            seen.current = readCounterOn(channel, tabId);
            latest.current();
        }
        return subscribeOn(channel, (signalledTabId) => {
            if (signalledTabId !== tabId) {
                return;
            }
            seen.current = readCounterOn(channel, tabId);
            latest.current();
        });
    }, [channel, tabId]);
};

export const subscribeTabReselected = (listener: Listener): (() => void) =>
    subscribeOn(reselectChannel, listener);

export const emitTabReselected = (tabId: SamoMobileTabId): void =>
    emitOn(reselectChannel, tabId);

/** "This tab wants fresh data." Only Home currently raises it. */
export const emitTabRefreshRequested = (tabId: SamoMobileTabId): void =>
    emitOn(refreshChannel, tabId);

/**
 * Run `handler` whenever `tabId` is reselected — including a press that landed
 * while this subtree was frozen, which is caught up on the next thaw.
 *
 * `handler` is read through a ref so a caller may pass an inline closure without
 * re-subscribing on every render.
 */
export const useTabReselect = (tabId: SamoMobileTabId, handler: () => void): void => {
    useChannel(reselectChannel, tabId, handler);
};

/** Twin of {@link useTabReselect} on the refresh channel. */
export const useTabRefresh = (tabId: SamoMobileTabId, handler: () => void): void => {
    useChannel(refreshChannel, tabId, handler);
};
