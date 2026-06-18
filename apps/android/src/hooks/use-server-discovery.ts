import { useEffect, useState } from 'react';
import dgram from 'react-native-udp';
import { safeParseJson } from '../utils/json';

export interface DiscoveredServer {
    Address: string;
    Id: string;
    Name: string;
}

export function useServerDiscovery() {
    const [discoveredServers, setDiscoveredServers] = useState<DiscoveredServer[]>([]);
    const [isDiscovering, setIsDiscovering] = useState(true);

    useEffect(() => {
        const socket = dgram.createSocket({ type: 'udp4' });
        let broadcastInterval: ReturnType<typeof setInterval>;

        socket.on('listening', () => {
            socket.setBroadcast(true);

            // Broadcast every 3 seconds
            broadcastInterval = setInterval(() => {
                const message = 'Who is SamoServer?';
                socket.send(message, 0, message.length, 7360, '255.255.255.255', (err) => {
                    if (err) {
                        // console.error('Broadcast error:', err);
                    }
                });
            }, 3000);
            
            // Initial immediate broadcast
            const initialMsg = 'Who is SamoServer?';
            socket.send(initialMsg, 0, initialMsg.length, 7360, '255.255.255.255');
        });

        socket.on('message', (msg) => {
            const response = safeParseJson<DiscoveredServer>(msg.toString());
            if (response?.Address && response.Name) {
                setDiscoveredServers((current) => {
                        if (!current.some((s) => s.Address === response.Address)) {
                            return [...current, response];
                        }
                        return current;
                    });
                }
        });

        socket.on('error', () => {
            socket.close();
            setIsDiscovering(false);
        });

        socket.bind(0);

        return () => {
            clearInterval(broadcastInterval);
            socket.close();
        };
    }, []);

    return {
        discoveredServers,
        isDiscovering,
    };
}
