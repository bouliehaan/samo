import { cancelCatalogArtworkPrefetch } from './artwork-prefetch';
import {
    refreshActiveEndpoint,
    startEndpointRecoveryWatch,
} from './endpoint-selection';
import { installNetworkStatusBridge, refreshNetworkStatus } from './network-status';
import { refreshSamoRadioDevices } from './samo-radio';
import { loadEndpointProfiles } from './server-endpoints';
import { getNetworkSnapshot, subscribeNetworkState } from '../state/network-state';

/**
 * Wire connectivity into the app, once, at boot.
 *
 * Everything here is app-global and deliberately not owned by a component: an
 * offline app that came back online because a screen mounted would be a worse
 * bug than the one this replaces.
 */
let installed = false;

export const installNetworkBootstrap = (): void => {
    if (installed) {
        return;
    }
    installed = true;

    installNetworkStatusBridge();
    void loadEndpointProfiles();
    startEndpointRecoveryWatch();

    let wasOffline = getNetworkSnapshot().isOffline;
    let lastTransport = getNetworkSnapshot().transport;
    let lastSsid = getNetworkSnapshot().ssid;

    subscribeNetworkState(() => {
        const next = getNetworkSnapshot();

        // Landing on a different network — or on a different Wi-Fi — can change
        // WHICH of the server's addresses is the right one, even when the app
        // was online both before and after.
        if (next.transport !== lastTransport || next.ssid !== lastSsid) {
            lastTransport = next.transport;
            lastSsid = next.ssid;
            void refreshActiveEndpoint();
        }

        if (next.isOffline === wasOffline) {
            return;
        }
        wasOffline = next.isOffline;

        if (next.isOffline) {
            // A full-library cover warm walking the network is the single most
            // obvious thing an offline app should not be doing.
            cancelCatalogArtworkPrefetch();
            // The server's own audio outputs are only reachable through the
            // server, so they go away with it — no control panel, and no "Send
            // to samo-radio" in menus that could only fail on tap.
            void refreshSamoRadioDevices();
            return;
        }

        // Back online: confirm which address before anything starts using it —
        // including the samo-radio re-read, which would otherwise go to the
        // address that just stopped working.
        void refreshActiveEndpoint({ force: true }).then(() => refreshSamoRadioDevices());
    });
};

/**
 * Re-check connectivity and endpoint choice after a spell in the background.
 *
 * The system does not replay connectivity callbacks that fired while the
 * process was frozen, so a phone that changed networks mid-doze comes back
 * believing whatever was true when it went to sleep.
 */
export const refreshNetworkOnForeground = async (): Promise<void> => {
    await refreshNetworkStatus();
    await refreshActiveEndpoint();
};
