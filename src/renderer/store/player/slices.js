import { CrossfadeStyle, PlayerRepeat, PlayerShuffle, PlayerStatus, PlayerStyle } from '/@/shared/types/types';
import { SONG_CONTEXT, } from '/@/renderer/store/last-playback-session.store';
export const createInitialPlayerTransportSlice = () => ({
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
