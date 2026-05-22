import { ipcMain } from 'electron';

import { QueueSong } from '/@/shared/types/domain-types';
import { PlayerRepeat, PlayerStatus } from '/@/shared/types/types';

export type PlayerStateEvents = {
    favorite: { favorite: boolean; ids: string[]; serverId: string };
    playback: PlayerStatus;
    position: number;
    privateMode: boolean;
    rating: { ids: string[]; rating: number; serverId: string };
    repeat: PlayerRepeat;
    seek: number;
    shuffle: boolean;
    sidebarCollapsed: boolean;
    song: { imageUrl?: null | string; song: QueueSong | undefined };
    volume: number;
};

type EventName = keyof PlayerStateEvents;
type Handler<K extends EventName> = (payload: PlayerStateEvents[K]) => void;

const handlers: { [K in EventName]: Set<Handler<K>> } = {
    favorite: new Set(),
    playback: new Set(),
    position: new Set(),
    privateMode: new Set(),
    rating: new Set(),
    repeat: new Set(),
    seek: new Set(),
    shuffle: new Set(),
    sidebarCollapsed: new Set(),
    song: new Set(),
    volume: new Set(),
};

const lastValues: Partial<{ [K in EventName]: PlayerStateEvents[K] }> = {};

const dispatch = <K extends EventName>(name: K, payload: PlayerStateEvents[K]) => {
    lastValues[name] = payload;
    for (const handler of handlers[name]) {
        try {
            (handler as Handler<K>)(payload);
        } catch (error) {
            console.error(`[player-state-broadcast] ${name} handler threw`, error);
        }
    }
};

export const subscribePlayerStateEvent = <K extends EventName>(
    name: K,
    handler: Handler<K>,
): (() => void) => {
    (handlers[name] as Set<Handler<K>>).add(handler);
    return () => {
        (handlers[name] as Set<Handler<K>>).delete(handler);
    };
};

export const getLastPlayerStateValue = <K extends EventName>(
    name: K,
): PlayerStateEvents[K] | undefined => lastValues[name];

ipcMain.on('update-playback', (_event, status: PlayerStatus) => dispatch('playback', status));
ipcMain.on('update-repeat', (_event, repeat: PlayerRepeat) => dispatch('repeat', repeat));
ipcMain.on('update-shuffle', (_event, shuffle: boolean) => dispatch('shuffle', shuffle));
ipcMain.on('update-volume', (_event, volume: number) => dispatch('volume', volume));
ipcMain.on('update-position', (_event, position: number) => dispatch('position', position));
ipcMain.on('update-seek', (_event, offset: number) => dispatch('seek', offset));
ipcMain.on(
    'update-song',
    (_event, song: QueueSong | undefined, imageUrl?: null | string) =>
        dispatch('song', { imageUrl, song }),
);
ipcMain.on(
    'update-favorite',
    (_event, favorite: boolean, serverId: string, ids: string[]) =>
        dispatch('favorite', { favorite, ids, serverId }),
);
ipcMain.on(
    'update-rating',
    (_event, rating: number, serverId: string, ids: string[]) =>
        dispatch('rating', { ids, rating, serverId }),
);
ipcMain.on('update-private-mode', (_event, privateMode: boolean) =>
    dispatch('privateMode', privateMode),
);
ipcMain.on('update-sidebar-collapsed', (_event, collapsedSidebar: boolean) =>
    dispatch('sidebarCollapsed', collapsedSidebar),
);
