import { DeviceEventEmitter, NativeModules, PermissionsAndroid } from 'react-native';

import {
    getNetworkSnapshot,
    setDeviceNetworkStatus,
    type NetworkTransport,
} from '../state/network-state';

interface NativeNetworkStatus {
    online: boolean;
    ssid: null | string;
    transport: string;
}

interface SamoNetworkStatusBridge {
    canReadSsid(): Promise<boolean>;
    getStatus(): Promise<NativeNetworkStatus>;
}

const EVENT = 'SamoNetworkStatus';

const getBridge = (): SamoNetworkStatusBridge | undefined =>
    NativeModules.SamoNetworkStatus as SamoNetworkStatusBridge | undefined;

const TRANSPORTS: readonly NetworkTransport[] = [
    'cellular',
    'ethernet',
    'none',
    'other',
    'wifi',
];

const toTransport = (value: unknown): NetworkTransport =>
    TRANSPORTS.includes(value as NetworkTransport) ? (value as NetworkTransport) : 'other';

const applyStatus = (status: NativeNetworkStatus | null | undefined): void => {
    if (!status) {
        return;
    }
    setDeviceNetworkStatus({
        isDeviceOnline: Boolean(status.online),
        ssid: typeof status.ssid === 'string' && status.ssid.length > 0 ? status.ssid : null,
        transport: toTransport(status.transport),
    });
};

let installed = false;

/**
 * Start mirroring the system's connectivity into the network store.
 *
 * Idempotent and never torn down: connectivity is app-global, the listener is
 * one callback, and the alternative — binding it to a component's lifetime —
 * is how an app ends up believing it is offline because a screen unmounted.
 */
export const installNetworkStatusBridge = (): void => {
    if (installed) {
        return;
    }
    installed = true;

    const bridge = getBridge();
    if (!bridge) {
        // No native module (JS-only test harness, or an old binary): stay on
        // the optimistic default so nothing gates itself off by accident.
        return;
    }

    DeviceEventEmitter.addListener(EVENT, (status: NativeNetworkStatus) => {
        applyStatus(status);
    });

    // The callback only fires on CHANGE, so without this the app would run on
    // its optimistic default until the first time connectivity moved.
    void bridge
        .getStatus()
        .then(applyStatus)
        .catch(() => undefined);
};

/** Re-read connectivity now — used on foreground, where the system may have
 *  changed networks while our callback was frozen. */
export const refreshNetworkStatus = async (): Promise<void> => {
    const bridge = getBridge();
    if (!bridge) {
        return;
    }
    await bridge
        .getStatus()
        .then(applyStatus)
        .catch(() => undefined);
};

export const canReadWifiName = async (): Promise<boolean> => {
    const bridge = getBridge();
    if (!bridge) {
        return false;
    }
    return bridge.canReadSsid().catch(() => false);
};

/**
 * Ask for the permission that makes the Wi-Fi name readable, then re-read.
 *
 * Called from exactly one place — the "use my current Wi-Fi" button in network
 * settings — so the system prompt always arrives with an obvious reason on
 * screen, rather than as an unexplained location request at launch.
 */
export const requestWifiNameAccess = async (): Promise<null | string> => {
    if (!(await canReadWifiName())) {
        try {
            const result = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            );
            if (result !== PermissionsAndroid.RESULTS.GRANTED) {
                return null;
            }
        } catch {
            return null;
        }
    }

    await refreshNetworkStatus();
    return getNetworkSnapshot().ssid;
};
