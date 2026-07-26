import Bonjour from 'bonjour-service';
import { Client, DefaultMediaReceiver } from 'castv2-client';
import { createSocket } from 'dgram';

// `bonjour-service` uses `export =` with a namespace, so its Browser/Service
// shapes are reached through the default import rather than named type imports.
type CastBrowser = InstanceType<typeof Bonjour.Browser>;
type CastService = InstanceType<typeof Bonjour.Service>;

/**
 * Native Chromecast support for the desktop app.
 *
 * The Google Cast *web* Sender SDK does not work in Electron — Electron's
 * Chromium is built without Chrome's proprietary Media Router, so the SDK loads
 * but never discovers a device. This module replaces it with a first-party
 * implementation that runs in the Electron main process:
 *
 *   - discovery: mDNS browse for `_googlecast._tcp` (via bonjour-service)
 *   - control:   the Cast v2 protocol over TLS:8009 (via castv2-client),
 *                launching the Default Media Receiver and driving load/play/
 *                pause/seek/stop.
 *
 * The renderer talks to it purely over IPC (see ./index.ts) and mirrors the
 * pushed state into its cast store, so the output-picker UI is unchanged.
 */

/** Google Default Media Receiver — plays standard HTTP audio streams on the TV. */
const CAST_PORT = 8009;
const GENERIC_MUSIC_METADATA_TYPE = 3;
const MDNS_ADDRESS = '224.0.0.251';
const MDNS_PORT = 5353;
/** How long the picker may say "looking" before it has to settle on a result. */
const SCAN_SETTLE_MS = 6000;
/** Kernel errors that mean the OS is refusing us the subnet, not that it is idle. */
const BLOCKED_ERROR_CODES = new Set(['EACCES', 'EHOSTUNREACH', 'ENETUNREACH', 'EPERM']);

export interface CastDevice {
    id: string;
    isSelected: boolean;
    name: string;
}

export interface CastLoadPayload {
    album?: null | string;
    artist?: null | string;
    artworkUrl?: null | string;
    contentType: string;
    contentUrl: string;
    positionSeconds?: number;
    title: string;
}

export interface CastState {
    deviceName: null | string;
    devices: CastDevice[];
    isConnected: boolean;
    isScanning: boolean;
    status: CastStatus;
}

export type CastStatus =
    | 'blocked'
    | 'connected'
    | 'connecting'
    | 'disconnected'
    | 'no-devices'
    | 'unavailable';

interface DiscoveredDevice {
    host: string;
    id: string;
    name: string;
    port: number;
}

type StateListener = (state: CastState) => void;

let bonjour: Bonjour | null = null;
let browser: CastBrowser | null = null;
const devices = new Map<string, DiscoveredDevice>();

let client: Client | null = null;
let receiver: DefaultMediaReceiver | null = null;
let connectedDeviceId: null | string = null;
let connecting = false;

let localNetworkBlocked = false;
let scanStartedAt = 0;
let settleTimer: null | ReturnType<typeof setTimeout> = null;

const listeners = new Set<StateListener>();

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const computeStatus = (): CastStatus => {
    if (connectedDeviceId) return 'connected';
    if (connecting) return 'connecting';
    if (devices.size > 0) return 'disconnected';
    // Only a probe failure with nothing discovered means anything: if devices are
    // arriving, the probe was wrong and the scan is the better evidence.
    if (localNetworkBlocked) return 'blocked';
    if (!browser) return 'unavailable';
    return 'no-devices';
};

/** A scan only claims to be "looking" for its grace period, then it reports. */
const isSettling = () => scanStartedAt > 0 && Date.now() - scanStartedAt < SCAN_SETTLE_MS;

const clearSettleTimer = () => {
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = null;
};

const buildState = (): CastState => {
    const connectedName = connectedDeviceId ? (devices.get(connectedDeviceId)?.name ?? null) : null;
    return {
        deviceName: connectedName,
        devices: Array.from(devices.values()).map((device) => ({
            id: device.id,
            isSelected: device.id === connectedDeviceId,
            name: device.name,
        })),
        isConnected: Boolean(connectedDeviceId),
        isScanning: Boolean(browser) && !connectedDeviceId && isSettling(),
        status: computeStatus(),
    };
};

const emitState = () => {
    const state = buildState();
    for (const listener of listeners) {
        listener(state);
    }
};

export const onCastState = (listener: StateListener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export const getCastState = (): CastState => buildState();

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

const encodeDnsName = (name: string): Buffer => {
    const bytes: number[] = [];
    for (const label of name.split('.')) {
        bytes.push(label.length);
        for (let index = 0; index < label.length; index += 1) {
            bytes.push(label.charCodeAt(index));
        }
    }
    bytes.push(0);
    return Buffer.from(bytes);
};

/** A standard mDNS PTR question for `_googlecast._tcp.local`. */
const MDNS_QUERY = Buffer.concat([
    Buffer.from([0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0]),
    encodeDnsName('_googlecast._tcp.local'),
    Buffer.from([0, 12, 0, 1]),
]);

/**
 * macOS puts local-subnet traffic behind the Local Network privacy grant, and a
 * denied process gets EHOSTUNREACH on the very first packet — both the mDNS
 * query bonjour-service sends and the TLS socket castv2-client opens to :8009.
 * Neither library surfaces that error, so a blocked app is indistinguishable
 * from an empty network and the picker spins forever. Send one query ourselves
 * so the two can be told apart and the UI can name the real problem.
 */
const probeLocalNetwork = (): Promise<'blocked' | 'ok' | 'unknown'> =>
    new Promise((resolve) => {
        let socket: null | ReturnType<typeof createSocket> = null;
        let settled = false;

        const finish = (result: 'blocked' | 'ok' | 'unknown') => {
            if (settled) return;
            settled = true;
            const active = socket;
            socket = null;
            if (active) {
                try {
                    active.close();
                } catch {
                    // already closed
                }
            }
            resolve(result);
        };

        try {
            socket = createSocket({ reuseAddr: true, type: 'udp4' });
            socket.on('error', () => finish('unknown'));
            socket.bind(0, () => {
                try {
                    socket?.setMulticastTTL(255);
                } catch {
                    // non-fatal; the send below is the actual test
                }
                socket?.send(MDNS_QUERY, MDNS_PORT, MDNS_ADDRESS, (error) => {
                    if (!error) {
                        finish('ok');
                        return;
                    }
                    const code = (error as NodeJS.ErrnoException).code ?? '';
                    finish(BLOCKED_ERROR_CODES.has(code) ? 'blocked' : 'unknown');
                });
            });
        } catch {
            finish('unknown');
        }
    });

/** Cast prefers IPv4; pick a v4 address from the mDNS record, else the host. */
const resolveHost = (service: CastService): string => {
    const ipv4 = service.addresses?.find((address) => /^\d+\.\d+\.\d+\.\d+$/.test(address));
    return ipv4 ?? service.host;
};

const toDevice = (service: CastService): DiscoveredDevice | null => {
    const host = resolveHost(service);
    if (!host) return null;
    const txt = (service.txt ?? {}) as Record<string, string>;
    // Cast advertises the stable device id as `id` and the friendly name as
    // `fn`; fall back to the service name so a nonconforming device still shows.
    const id = txt.id || service.name || host;
    const name = txt.fn || service.name || 'Chromecast';
    return { host, id, name, port: service.port || CAST_PORT };
};

const teardownDiscovery = () => {
    clearSettleTimer();
    scanStartedAt = 0;
    try {
        browser?.stop?.();
    } catch {
        /* ignore */
    }
    try {
        bonjour?.destroy?.();
    } catch {
        /* ignore */
    }
    browser = null;
    bonjour = null;
    // Keep the connected device in the map; clear the rest.
    for (const id of [...devices.keys()]) {
        if (id !== connectedDeviceId) devices.delete(id);
    }
};

/** Re-emit when the grace period lapses so "looking" resolves without a poll. */
const armSettleTimer = () => {
    clearSettleTimer();
    settleTimer = setTimeout(() => {
        settleTimer = null;
        emitState();
    }, SCAN_SETTLE_MS);
};

const beginScanWindow = () => {
    scanStartedAt = Date.now();
    armSettleTimer();
};

export const startDiscovery = async (): Promise<CastState> => {
    // Probed on every call rather than only the first: the picker polls this
    // while it is open, so granting access in System Settings recovers the
    // session without an app restart.
    const wasBlocked = localNetworkBlocked;
    localNetworkBlocked = (await probeLocalNetwork()) === 'blocked';

    // A blocked probe is reported, never acted on: keep scanning regardless so a
    // false positive can't tear down discovery that would otherwise work.
    if (browser) {
        // Already scanning — re-emit so a late caller gets the current snapshot.
        if (wasBlocked) beginScanWindow();
        emitState();
        return buildState();
    }

    try {
        bonjour = new Bonjour();
        browser = bonjour.find({ type: 'googlecast' });
        beginScanWindow();

        browser.on('up', (service: CastService) => {
            const device = toDevice(service);
            if (!device) return;
            devices.set(device.id, device);
            emitState();
        });

        browser.on('down', (service: CastService) => {
            const device = toDevice(service);
            if (!device) return;
            // Never drop the device we're actively casting to from the list.
            if (device.id !== connectedDeviceId) {
                devices.delete(device.id);
                emitState();
            }
        });
    } catch {
        // mDNS can fail to bind (locked-down network stack); surface as
        // "unavailable" rather than throwing into the picker.
        teardownDiscovery();
    }

    emitState();
    return buildState();
};

export const stopDiscovery = () => {
    teardownDiscovery();
    emitState();
};

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

const teardownSession = (emit: boolean) => {
    try {
        receiver?.close();
    } catch {
        /* ignore */
    }
    try {
        client?.close();
    } catch {
        /* ignore */
    }
    receiver = null;
    client = null;
    connectedDeviceId = null;
    connecting = false;
    if (emit) emitState();
};

/**
 * A refused subnet and a powered-off speaker both surface as EHOSTUNREACH, so
 * name both possibilities rather than guessing at one.
 */
const describeConnectError = (error: unknown): Error => {
    const code = (error as NodeJS.ErrnoException | null)?.code ?? '';
    if (BLOCKED_ERROR_CODES.has(code)) {
        return new Error(
            'Could not reach that Chromecast. Check that it is powered on and that Samo is allowed to access devices on your local network.',
        );
    }
    return error instanceof Error ? error : new Error('Chromecast connection failed.');
};

export const connectToDevice = (deviceId?: string): Promise<void> => {
    const target = deviceId ? devices.get(deviceId) : devices.values().next().value;
    if (!target) {
        return Promise.reject(new Error('That Chromecast is no longer on the network.'));
    }

    // Reconnecting: drop any existing session first.
    if (client) {
        teardownSession(false);
    }

    connecting = true;
    emitState();

    return new Promise<void>((resolve, reject) => {
        const nextClient = new Client();
        let settled = false;
        const fail = (error: Error) => {
            if (settled) return;
            settled = true;
            teardownSession(true);
            reject(error);
        };

        nextClient.on('error', (error: Error) => {
            // Errors after a successful connect mean the session dropped
            // (device powered off, network blip) — reflect that in the UI.
            if (settled) {
                teardownSession(true);
                return;
            }
            fail(describeConnectError(error));
        });

        try {
            nextClient.connect({ host: target.host, port: target.port }, () => {
                nextClient.launch(DefaultMediaReceiver, (launchError, nextReceiver) => {
                    if (launchError || !nextReceiver) {
                        fail(launchError ?? new Error('Could not start the Chromecast receiver.'));
                        return;
                    }
                    client = nextClient;
                    receiver = nextReceiver;
                    connectedDeviceId = target.id;
                    connecting = false;
                    settled = true;

                    nextReceiver.on('status', () => {
                        // Receiver status transitions don't change our connection
                        // model, but keep the hook so future work (position, end
                        // of media) has a home.
                    });

                    emitState();
                    resolve();
                });
            });
        } catch (error) {
            fail(describeConnectError(error));
        }
    });
};

export const disconnect = (): Promise<void> => {
    if (!receiver) {
        teardownSession(true);
        return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
        try {
            receiver?.stop(() => {
                teardownSession(true);
                resolve();
            });
        } catch {
            teardownSession(true);
            resolve();
        }
    });
};

export const loadMedia = (payload: CastLoadPayload): Promise<void> => {
    if (!receiver) {
        return Promise.reject(new Error('No active Chromecast session.'));
    }
    const media = {
        contentId: payload.contentUrl,
        contentType: payload.contentType,
        metadata: {
            albumName: payload.album ?? undefined,
            artist: payload.artist ?? undefined,
            images: payload.artworkUrl ? [{ url: payload.artworkUrl }] : undefined,
            metadataType: GENERIC_MUSIC_METADATA_TYPE,
            title: payload.title,
        },
        streamType: 'BUFFERED' as const,
    };
    return new Promise<void>((resolve, reject) => {
        receiver!.load(
            media,
            { autoplay: true, currentTime: Math.max(0, payload.positionSeconds ?? 0) },
            (error) => (error ? reject(error) : resolve()),
        );
    });
};

const control = (action: (done: (error: Error | null) => void) => void): Promise<void> => {
    if (!receiver) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
        action((error) => (error ? reject(error) : resolve()));
    });
};

export const play = () => control((done) => receiver!.play(done));
export const pause = () => control((done) => receiver!.pause(done));
export const seek = (positionSeconds: number) =>
    control((done) => receiver!.seek(Math.max(0, positionSeconds), done));

/** Tear everything down for app shutdown. */
export const shutdownCast = () => {
    teardownSession(false);
    stopDiscovery();
    listeners.clear();
};
