import { createSocket } from 'dgram';
import { ipcMain } from 'electron';
import { networkInterfaces } from 'os';

import { DiscoveredServerItem, ServerType } from '/@/shared/types/types';

// LAN discovery protocol (mirrors the server's internal/discovery broadcaster and
// the mobile client): UDP-broadcast "Who is SamoServer?" to :7360; the server
// replies by unicast with JSON { Address, Id, Name }.
const DISCOVERY_PORT = 7360;
const DISCOVERY_MESSAGE = 'Who is SamoServer?';
const PROBE_INTERVAL_MS = 1000;
const DISCOVERY_DURATION_MS = 4000;

interface DiscoveryResponse {
    Address?: string;
    Id?: string;
    Name?: string;
}

// macOS rejects sends to the global 255.255.255.255 from a 0.0.0.0-bound socket
// (EADDRNOTAVAIL), so probe each interface's subnet-directed broadcast address
// (e.g. 192.168.1.255). 255.255.255.255 is kept as a best-effort fallback.
const broadcastTargets = (): string[] => {
    const targets = new Set<string>();
    for (const addresses of Object.values(networkInterfaces())) {
        for (const info of addresses ?? []) {
            if (info.family !== 'IPv4' || info.internal) continue;
            const ip = info.address.split('.').map(Number);
            const mask = info.netmask.split('.').map(Number);
            if (ip.length !== 4 || mask.length !== 4 || mask.some(Number.isNaN)) continue;
            targets.add(
                ip.map((octet, index) => (octet & mask[index]) | (~mask[index] & 255)).join('.'),
            );
        }
    }
    targets.add('255.255.255.255');
    return [...targets];
};

const discoverSamoServers = (reply: (server: DiscoveredServerItem) => void): Promise<void> =>
    new Promise((resolve) => {
        let socket: null | ReturnType<typeof createSocket> = null;
        let probeTimer: null | ReturnType<typeof setInterval> = null;
        let settled = false;
        const seen = new Set<string>();

        const cleanup = () => {
            if (settled) return;
            settled = true;
            if (probeTimer) clearInterval(probeTimer);
            probeTimer = null;
            const active = socket;
            socket = null;
            if (active) {
                try {
                    active.close();
                } catch {
                    // already closed
                }
            }
            resolve();
        };

        try {
            socket = createSocket({ reuseAddr: true, type: 'udp4' });
        } catch {
            resolve();
            return;
        }

        const sendProbe = () => {
            for (const target of broadcastTargets()) {
                try {
                    // The callback swallows per-target async errors (e.g. the
                    // 255.255.255.255 fallback failing on macOS).
                    socket?.send(DISCOVERY_MESSAGE, DISCOVERY_PORT, target, () => undefined);
                } catch {
                    // Transient/synchronous send failure — the next tick retries.
                }
            }
        };

        socket.on('message', (msg) => {
            let parsed: DiscoveryResponse | null = null;
            try {
                parsed = JSON.parse(msg.toString()) as DiscoveryResponse;
            } catch {
                return;
            }
            if (!parsed?.Address || !parsed.Name || seen.has(parsed.Address)) {
                return;
            }
            seen.add(parsed.Address);
            reply({
                name: parsed.Name,
                type: ServerType.SAMO,
                url: parsed.Address,
            });
        });

        socket.on('error', cleanup);

        socket.on('listening', () => {
            try {
                socket?.setBroadcast(true);
            } catch {
                // Some platforms reject setBroadcast; the send below may still work.
            }
            sendProbe();
            probeTimer = setInterval(sendProbe, PROBE_INTERVAL_MS);
        });

        try {
            socket.bind(0);
        } catch {
            cleanup();
            return;
        }

        setTimeout(cleanup, DISCOVERY_DURATION_MS);
    });

ipcMain.on('autodiscover-ping', (ev) => {
    if (ev.ports.length === 0) throw new Error('Expected a port to stream autodiscovery results');
    const port = ev.ports[0];

    discoverSamoServers((result) => port.postMessage(result))
        .then(() => port.close())
        .catch((err) => console.error(err));
});
