import { useStoreSelector } from './use-store-selector';

/** Which way a channel's programming is being moved. */
export type SamoChannelCommand = 'kind' | 'previous' | 'skip';

export type SamoChannelState = {
    /**
     * The command in flight, if any.
     *
     * A station-wide move costs a reconnect at this end, so a second press
     * while the first is still travelling would move the programming twice for
     * one intent. Shared rather than held by a button, so every surface that
     * grows these controls is guarded by the same one.
     */
    command: null | SamoChannelCommand;
    /** Why the last one did not work, for the surface that asked. */
    notice: null | string;
};

let samoChannelState: SamoChannelState = { command: null, notice: null };
const listeners = new Set<() => void>();

const patch = (next: Partial<SamoChannelState>): void => {
    const merged = { ...samoChannelState, ...next };
    if (merged.command === samoChannelState.command && merged.notice === samoChannelState.notice) {
        return;
    }
    samoChannelState = merged;
    listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

export const getSamoChannelState = (): SamoChannelState => samoChannelState;

export const setSamoChannelCommand = (command: null | SamoChannelCommand): void =>
    patch({ command });

export const setSamoChannelNotice = (notice: null | string): void => patch({ notice });

export const useSamoChannelSelector = <Selected>(
    selector: (state: SamoChannelState) => Selected,
): Selected => useStoreSelector(subscribe, getSamoChannelState, selector);
