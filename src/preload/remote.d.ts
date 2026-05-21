import { IpcRendererEvent } from 'electron';
import { QueueSong } from '/@/shared/types/domain-types';
import { PlayerStatus } from '/@/shared/types/types';
export declare const remote: {
    requestFavorite: (cb: (event: IpcRendererEvent, data: {
        favorite: boolean;
        id: string;
        serverId: string;
    }) => void) => void;
    requestPosition: (cb: (event: IpcRendererEvent, data: {
        position: number;
    }) => void) => void;
    requestRating: (cb: (event: IpcRendererEvent, data: {
        id: string;
        rating: number;
        serverId: string;
    }) => void) => void;
    requestSeek: (cb: (event: IpcRendererEvent, data: {
        offset: number;
    }) => void) => void;
    requestVolume: (cb: (event: IpcRendererEvent, data: {
        volume: number;
    }) => void) => void;
    setRemoteEnabled: (enabled: boolean) => Promise<null | string>;
    setRemotePort: (port: number) => Promise<null | string>;
    updateFavorite: (favorite: boolean, serverId: string, ids: string[]) => void;
    updatePassword: (password: string) => void;
    updatePlayback: (playback: PlayerStatus) => void;
    updatePosition: (timeSec: number) => void;
    updateRating: (rating: number, serverId: string, ids: string[]) => void;
    updateRepeat: (repeat: string) => void;
    updateSetting: (enabled: boolean, port: number, username: string, password: string) => Promise<null | string>;
    updateShuffle: (shuffle: boolean) => void;
    updateSong: (song: QueueSong | undefined, imageUrl?: null | string) => void;
    updateUsername: (username: string) => void;
    updateVolume: (volume: number) => void;
};
export type Remote = typeof remote;
