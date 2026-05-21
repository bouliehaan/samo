import { jsx as _jsx } from "react/jsx-runtime";
import { WebMediaEngine } from '/@/renderer/features/player/audio-player/web-media-engine';
import { useIsRadioActive, useRadioPlayer, useRadioStore, } from '/@/renderer/features/radio/hooks/use-radio-player';
export function RadioWebPlayer() {
    const { currentStreamUrl, isPlaying } = useRadioPlayer();
    const { actions } = useRadioStore();
    const { setCurrentStreamUrl, setIsPlaying, setStationName } = actions;
    const isRadioActive = useIsRadioActive();
    return (_jsx(WebMediaEngine, { contentUrl: currentStreamUrl, errorMessage: "Radio playback error.", isActive: isRadioActive, mode: "radio", onEnded: () => {
            setIsPlaying(false);
            setCurrentStreamUrl(null);
            setStationName(null);
        }, onError: () => { }, onSeekTransport: () => { }, ownsPlayback: () => isRadioActive, radioIsPlaying: isPlaying, releaseOnError: () => { }, statusFromRadio: true, syncVolumeToEngineRef: true }));
}
