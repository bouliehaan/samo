import { ipcRenderer, IpcRendererEvent } from 'electron';

/**
 * Registers an ipcRenderer listener and returns its disposer, so a caller
 * unsubscribes exactly what it subscribed. Channels are shared across
 * namespaces — mpris and remote both listen on `request-position` — so tearing
 * a channel down wholesale would take the other subscriber with it.
 */
export const subscribe = <T extends unknown[]>(
    channel: string,
    cb: (event: IpcRendererEvent, ...args: T) => void,
): (() => void) => {
    const listener = cb as (event: IpcRendererEvent, ...args: any[]) => void;

    ipcRenderer.on(channel, listener);

    return () => {
        ipcRenderer.removeListener(channel, listener);
    };
};
