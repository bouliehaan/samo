import { useEffect, useSyncExternalStore } from 'react';
import dgram from 'react-native-udp';
import { safeParseJson } from '../utils/json';

export interface DiscoveredServer {
    Address: string;
    Id: string;
    Name: string;
}

const DISCOVERY_PORT = 7360;
const DISCOVERY_MESSAGE = 'Who is SamoServer?';
const BROADCAST_INTERVAL_MS = 2500;
// The server's discovery broadcaster (internal/discovery) listens on a plain
// UDP socket and replies by unicast, so the global broadcast address is what it
// actually answers. (It does not join a multicast group.)
const BROADCAST_TARGET = '255.255.255.255';
// Keep the socket alive briefly after the last screen using discovery unmounts.
// react-native-udp emits 'listening' synchronously once bind completes; if the
// component tears down before that (React StrictMode's mount→unmount→mount, or a
// transient remount during the boot/sync jank), the socket gets close()d before
// the FIRST probe is ever sent — which is exactly why discovery "scanned
// forever" and the server never heard us. A module-level singleton with a
// debounced teardown rides out that churn so the probe actually goes out.
//
// Short on purpose: long enough to survive StrictMode's sub-second remount, but
// not so long that we keep blasting UDP broadcasts into the auth step (which
// shares the Wi-Fi link with the login request) after the user has left the
// discover screen.
const IDLE_TEARDOWN_MS = 1500;
const REOPEN_DELAY_MS = 1500;

type DiscoverySocket = ReturnType<typeof dgram.createSocket>;

interface DiscoverySnapshot {
    discoveredServers: DiscoveredServer[];
    isDiscovering: boolean;
}

let socket: DiscoverySocket | null = null;
let broadcastTimer: ReturnType<typeof setInterval> | null = null;
let teardownTimer: ReturnType<typeof setTimeout> | null = null;
let reopenTimer: ReturnType<typeof setTimeout> | null = null;
let refCount = 0;

let servers: DiscoveredServer[] = [];
let discovering = false;
let snapshot: DiscoverySnapshot = {
    discoveredServers: servers,
    isDiscovering: discovering,
};
const listeners = new Set<() => void>();

const emit = () => {
    snapshot = { discoveredServers: servers, isDiscovering: discovering };
    listeners.forEach((listener) => listener());
};

const sendProbe = () => {
    const active = socket;
    if (!active) {
        return;
    }
    try {
        active.send(
            DISCOVERY_MESSAGE,
            0,
            DISCOVERY_MESSAGE.length,
            DISCOVERY_PORT,
            BROADCAST_TARGET,
            () => {
                // Transient send failures are expected on a flaky network; the
                // next interval tick retries.
            },
        );
    } catch {
        // Socket raced to closed — the reopen path will rebuild it.
    }
};

const teardownSocket = () => {
    if (broadcastTimer) {
        clearInterval(broadcastTimer);
        broadcastTimer = null;
    }
    const active = socket;
    socket = null;
    if (active) {
        try {
            active.close();
        } catch {
            // already closed
        }
    }
};

const scheduleReopen = () => {
    if (reopenTimer) {
        return;
    }
    reopenTimer = setTimeout(() => {
        reopenTimer = null;
        if (refCount > 0) {
            openSocket();
        }
    }, REOPEN_DELAY_MS);
};

function openSocket() {
    if (socket) {
        return;
    }

    let active: DiscoverySocket;
    try {
        active = dgram.createSocket({ type: 'udp4' });
    } catch {
        // Native module unavailable — settle so the UI can offer manual entry
        // instead of spinning forever.
        discovering = false;
        emit();
        return;
    }

    socket = active;
    discovering = true;
    emit();

    active.on('message', (msg) => {
        const response = safeParseJson<DiscoveredServer>(msg.toString());
        if (
            response?.Address &&
            response.Name &&
            !servers.some((existing) => existing.Address === response.Address)
        ) {
            servers = [...servers, response];
            emit();
        }
    });

    active.on('error', () => {
        teardownSocket();
        if (refCount > 0) {
            scheduleReopen();
        }
    });

    active.once('listening', () => {
        try {
            active.setBroadcast(true);
        } catch {
            // Some platforms reject setBroadcast; the send below may still work.
        }
        sendProbe();
        if (broadcastTimer) {
            clearInterval(broadcastTimer);
        }
        broadcastTimer = setInterval(sendProbe, BROADCAST_INTERVAL_MS);
    });

    try {
        active.bind(0);
    } catch {
        teardownSocket();
        if (refCount > 0) {
            scheduleReopen();
        }
    }
}

const acquire = () => {
    refCount += 1;
    if (teardownTimer) {
        clearTimeout(teardownTimer);
        teardownTimer = null;
    }
    openSocket();
};

const release = () => {
    refCount = Math.max(0, refCount - 1);
    if (refCount === 0 && !teardownTimer) {
        teardownTimer = setTimeout(() => {
            teardownTimer = null;
            if (refCount === 0) {
                teardownSocket();
                servers = [];
                discovering = false;
                emit();
            }
        }, IDLE_TEARDOWN_MS);
    }
};

const rescanServers = () => {
    servers = [];
    discovering = true;
    emit();
    if (socket) {
        sendProbe();
    } else {
        openSocket();
    }
};

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

const getSnapshot = () => snapshot;

/**
 * Subscribes to the shared LAN discovery engine. The socket is owned at module
 * scope (not by this component), so it survives the mount/unmount churn that
 * used to kill it before the first broadcast. Returns the live result set plus a
 * `rescan()` to clear and re-probe.
 */
export function useServerDiscovery() {
    useEffect(() => {
        acquire();
        return () => {
            release();
        };
    }, []);

    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    return {
        discoveredServers: state.discoveredServers,
        isDiscovering: state.isDiscovering,
        rescan: rescanServers,
    };
}
