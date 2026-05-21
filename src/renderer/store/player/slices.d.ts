import { CrossfadeStyle, PlayerRepeat, PlayerShuffle, PlayerStatus, PlayerStyle } from '/@/shared/types/types';
import { type MusicPlaybackContext } from '/@/renderer/store/last-playback-session.store';
/** Ephemeral transport controls — volume, status, speed, repeat, shuffle. */
export interface PlayerTransportSlice {
    context: MusicPlaybackContext;
    crossfadeDuration: number;
    crossfadeStyle: CrossfadeStyle;
    index: number;
    muted: boolean;
    pauseOnNextSongEnd: boolean;
    playerNum: 1 | 2;
    repeat: PlayerRepeat;
    shuffle: PlayerShuffle;
    speed: number;
    status: PlayerStatus;
    transitionType: PlayerStyle;
    volume: number;
}
export declare const createInitialPlayerTransportSlice: () => PlayerTransportSlice;
