import { QueueSong, Song } from '/@/shared/types/domain-types';
export declare const useIsCurrentSong: (song: QueueSong | Song) => {
    isActive: boolean;
};
