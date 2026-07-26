import { type SamoMobileTabId } from '@samo/core/navigation';

/**
 * Re-tapping the ALREADY-ACTIVE bottom-bar tab while its bare page is showing
 * (no overlay to dismiss, nothing else the press could mean) is a gesture of
 * its own: snap that page back to its rest state — pills/first row at the top,
 * the pull-down search drawer parked above them. Home additionally kicks the
 * same refresh a pull-to-refresh runs.
 *
 * The tab bar knows about the press, each page's scroll hook owns its
 * scrollable, and HomeTabScene owns the refresh — this tiny emitter carries
 * the tab id to all of them without new render-tree plumbing (same
 * module-singleton pattern as the rest of app-navigation). Listeners filter by
 * id so a page only reacts to its OWN tab being re-tapped.
 */
type Listener = (tabId: SamoMobileTabId) => void;

const listeners = new Set<Listener>();

export const subscribeTabReselected = (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const emitTabReselected = (tabId: SamoMobileTabId): void => {
    listeners.forEach((listener) => listener(tabId));
};
