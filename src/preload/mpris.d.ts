import { IpcRendererEvent } from 'electron';
import { QueueSong } from '/@/shared/types/domain-types';
import { PlayerRepeat, PlayerStatus } from '/@/shared/types/types';
export declare const mpris: {
    requestPosition: (cb: (event: IpcRendererEvent, data: {
        position: number;
    }) => void) => void;
    requestSeek: (cb: (event: IpcRendererEvent, data: {
        offset: number;
    }) => void) => void;
    requestToggleRepeat: (cb: (event: IpcRendererEvent, data: {
        repeat: PlayerRepeat;
    }) => void) => void;
    requestToggleShuffle: (cb: (event: IpcRendererEvent, data: {
        shuffle: boolean;
    }) => void) => void;
    requestVolume: (cb: (event: IpcRendererEvent, data: {
        volume: number;
    }) => void) => void;
    updatePosition: (timeSec: number) => void;
    updateRepeat: (repeat: PlayerRepeat) => void;
    updateSeek: (timeSec: number) => void;
    updateShuffle: (shuffle: boolean) => void;
    updateSong: (song: QueueSong | undefined, imageUrl?: null | string) => void;
    updateStatus: (status: PlayerStatus) => void;
    updateVolume: (volume: number) => void;
};
export type Mpris = typeof mpris;
