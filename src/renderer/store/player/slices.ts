import { CrossfadeStyle, PlayerRepeat, PlayerShuffle, PlayerStatus, PlayerStyle } from '/@/shared/types/types';

import {
    SONG_CONTEXT,
    type MusicPlaybackContext,
} from '/@/renderer/store/last-playback-session.store';

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

export const createInitialPlayerTransportSlice = (): PlayerTransportSlice => ({
    context: SONG_CONTEXT,
    crossfadeDuration: 5,
    crossfadeStyle: CrossfadeStyle.EQUAL_POWER,
    index: -1,
    muted: false,
    pauseOnNextSongEnd: false,
    playerNum: 1,
    repeat: PlayerRepeat.NONE,
    shuffle: PlayerShuffle.NONE,
    speed: 1,
    status: PlayerStatus.PAUSED,
    transitionType: PlayerStyle.GAPLESS,
    volume: 30,
});
