import { WebMediaEngine } from '/@/renderer/features/player/audio-player/web-media-engine';
import { useRadioPlaybackUrl } from '/@/renderer/features/radio/hooks/use-radio-playback-url';
import {
    useIsRadioActive,
    useRadioPlayer,
    useRadioStore,
} from '/@/renderer/features/radio/hooks/use-radio-player';

export function RadioWebPlayer() {
    const { currentStreamUrl, isPlaying } = useRadioPlayer();
    const { actions } = useRadioStore();
    const { setCurrentStreamUrl, setIsPlaying, setStationName } = actions;
    const isRadioActive = useIsRadioActive();
    // The station is known by a token-free URL everywhere else in the app; the
    // authenticated form exists only for the element that opens the stream.
    const { onStreamError, url } = useRadioPlaybackUrl(currentStreamUrl);

    return (
        <WebMediaEngine
            contentUrl={url}
            errorMessage="Radio playback error."
            isActive={isRadioActive}
            mode="radio"
            onEnded={() => {
                setIsPlaying(false);
                setCurrentStreamUrl(null);
                setStationName(null);
            }}
            onError={onStreamError}
            onSeekTransport={() => {}}
            ownsPlayback={() => isRadioActive}
            radioIsPlaying={isPlaying}
            releaseOnError={() => {}}
            statusFromRadio
            syncVolumeToEngineRef
        />
    );
}
