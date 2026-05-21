import { PlayerType } from '/@/shared/types/types';
export function getVisualizerAudioNodes(webAudio, playbackType) {
    if (!webAudio)
        return [];
    if (playbackType === PlayerType.LOCAL) {
        return webAudio.visualizerInputs ?? [];
    }
    return webAudio.gains;
}
