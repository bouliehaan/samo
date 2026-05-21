import { jsx as _jsx } from "react/jsx-runtime";
import { WebMediaEngine } from '/@/renderer/features/player/audio-player/web-media-engine';
import { useAudiobookActions, useAudiobookContentUrl, useAudiobookPosition, useAudiobookStore, } from '/@/renderer/store/audiobook.store';
export function AudiobookWebPlayer() {
    const contentUrl = useAudiobookContentUrl();
    const resumePosition = useAudiobookPosition();
    const { release, seekTo, setPosition } = useAudiobookActions();
    return (_jsx(WebMediaEngine, { contentUrl: contentUrl, errorMessage: "Audiobook playback error. Check the stream URL or server connection.", isActive: Boolean(contentUrl), mode: "abs-resume", onEnded: () => release(), onError: () => {
            useAudiobookStore.getState().actions.setError('Audiobook playback error. Check the stream URL or server connection.');
        }, onProgress: (playedSeconds) => setPosition(playedSeconds), onSeekTransport: seekTo, ownsPlayback: () => Boolean(useAudiobookStore.getState().contentUrl), releaseOnError: () => release(), resetResumeOnEnd: () => {
            const { item } = useAudiobookStore.getState();
            if (item) {
                useAudiobookStore.setState((state) => ({
                    resumeByItemId: { ...state.resumeByItemId, [item.id]: 0 },
                }));
            }
        }, resumePosition: resumePosition }));
}
