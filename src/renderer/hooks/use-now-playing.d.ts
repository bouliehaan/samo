import { type PlaybackSource } from '/@/renderer/store/playback-owner.store';
export type NowPlaying = {
    artist: string;
    artwork: string | undefined;
    canSeek: boolean;
    canSkipNext: boolean;
    canSkipPrevious: boolean;
    source: null | PlaybackSource;
    subtitle: string;
    title: string;
};
export declare function getNowPlayingSnapshot(): NowPlaying;
export declare function useNowPlaying(): NowPlaying;
