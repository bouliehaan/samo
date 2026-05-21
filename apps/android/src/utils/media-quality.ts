import { isHiResAudioQuality, isLosslessAudioQuality } from '@samo/core/audio-quality';
import {
    type MobileMediaDetail,
    type MobileMediaTrack,
    type MobilePlayableAudio,
} from '@samo/core/mobile';

export const isPlaybackHiRes = (playback?: MobilePlayableAudio | null): boolean =>
    Boolean(playback && isHiResAudioQuality(playback.quality));

export const isHiFiPlayback = (playback?: MobilePlayableAudio): boolean =>
    Boolean(playback && isLosslessAudioQuality(playback.quality));

export const isHiFiTrack = (track: MobileMediaTrack): boolean => isHiFiPlayback(track.playback);

export const detailHasHiRes = (detail: MobileMediaDetail): boolean =>
    Boolean(detail.isHiRes || detail.tracks.some((track) => isPlaybackHiRes(track.playback)));
