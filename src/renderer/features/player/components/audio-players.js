import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import isElectron from 'is-electron';
import { useEffect } from 'react';
import { eventEmitter } from '/@/renderer/events/event-emitter';
import { AudiobookWebPlayer } from '/@/renderer/features/audiobooks/components/audiobook-web-player';
import { DiscordRpcHook } from '/@/renderer/features/discord-rpc/use-discord-rpc';
import { MainPlayerListenerHook } from '/@/renderer/features/player/audio-player/hooks/use-main-player-listener';
import { MpvPlayer } from '/@/renderer/features/player/audio-player/mpv-player';
import { WebPlayer } from '/@/renderer/features/player/audio-player/web-player';
import { SleepTimerHook } from '/@/renderer/features/player/components/sleep-timer-button';
import { AutoDJHook } from '/@/renderer/features/player/hooks/use-auto-dj';
import { AutosaveHook } from '/@/renderer/features/player/hooks/use-autosave';
import { MediaSessionHook } from '/@/renderer/features/player/hooks/use-media-session';
import { MPRISHook } from '/@/renderer/features/player/hooks/use-mpris';
import { PlaybackHotkeysHook } from '/@/renderer/features/player/hooks/use-playback-hotkeys';
import { PowerSaveBlockerHook } from '/@/renderer/features/player/hooks/use-power-save-blocker';
import { QueueRestoreTimestampHook } from '/@/renderer/features/player/hooks/use-queue-restore';
import { RememberMusicSessionHook } from '/@/renderer/features/player/hooks/use-remember-music-session';
import { RestoreLastPlaybackSessionHook } from '/@/renderer/features/player/hooks/use-restore-last-playback-session';
import { ScrobbleHook } from '/@/renderer/features/player/hooks/use-scrobble';
import { UpdateCurrentSongHook } from '/@/renderer/features/player/hooks/use-update-current-song';
import { useWebAudio } from '/@/renderer/features/player/hooks/use-webaudio';
import { PodcastWebPlayer } from '/@/renderer/features/podcasts/components/podcast-web-player';
import { RadioWebPlayer } from '/@/renderer/features/radio/components/radio-web-player';
import { RadioAudioInstanceHook, RadioMetadataHook, } from '/@/renderer/features/radio/hooks/use-radio-player';
import { RemoteHook } from '/@/renderer/features/remote/hooks/use-remote';
import { VisualizerSystemAudioBridgeHook } from '/@/renderer/features/visualizer/components/visualizer-system-audio-bridge';
import { updateQueueFavorites, updateQueueRatings, useCurrentServerId, usePlaybackSettings, usePlaybackType, useSettingsStoreActions, } from '/@/renderer/store';
import { usePlaybackSession } from '/@/renderer/store/playback-owner.store';
import { logFn } from '/@/renderer/utils/logger';
import { toast } from '/@/shared/components/toast/toast';
import { LibraryItem } from '/@/shared/types/domain-types';
import { PlayerType } from '/@/shared/types/types';
const CODEC_PROBES = [
    { codec: 'mp3', container: 'mp3', mime: 'audio/mpeg' },
    { codec: 'aac', container: 'mp4', mime: 'audio/mp4; codecs="mp4a.40.2"' },
    { codec: 'aac', container: 'aac', mime: 'audio/aac' },
    { codec: 'aac', container: 'mp4', mime: 'audio/x-m4a' },
    { codec: 'opus', container: 'ogg', mime: 'audio/ogg; codecs="opus"' },
    { codec: 'opus', container: 'webm', mime: 'audio/webm; codecs="opus"' },
    { codec: 'vorbis', container: 'ogg', mime: 'audio/ogg; codecs="vorbis"' },
    { codec: 'vorbis', container: 'webm', mime: 'audio/webm; codecs="vorbis"' },
    { codec: 'flac', container: 'flac', mime: 'audio/flac' },
    { codec: ['pcm', 'wav'], container: 'wav', mime: 'audio/wav' },
    { codec: 'alac', container: 'mp4', mime: 'audio/mp4; codecs="alac"' },
];
const DEFAULT_TRANSCODING_PROFILES = [
    { audioCodec: 'flac', container: 'flac', protocol: 'http' },
    { audioCodec: 'opus', container: 'ogg', protocol: 'http' },
    { audioCodec: 'mp3', container: 'mp3', protocol: 'http' },
];
const SAFARI_TRANSCODING_PROFILES = [{ audioCodec: 'mp3', container: 'mp3', protocol: 'http' }];
const DIRECT_PLAY_PROFILES = [];
export function getDefaultTranscodingProfiles() {
    return isSafari() ? SAFARI_TRANSCODING_PROFILES : DEFAULT_TRANSCODING_PROFILES;
}
export function getDirectPlayProfiles() {
    return DIRECT_PLAY_PROFILES;
}
// Shamelessly taken from NavidromeUI
function detectBrowserProfile() {
    const audio = new Audio();
    for (const { codec, container, mime } of CODEC_PROBES) {
        if (audio.canPlayType(mime) === 'maybe' || audio.canPlayType(mime) === 'probably') {
            DIRECT_PLAY_PROFILES.push({
                audioCodecs: Array.isArray(codec) ? codec : [codec],
                containers: [container],
                protocols: ['http'],
            });
        }
    }
    logFn.info('DIRECT_PLAY_PROFILES', { meta: DIRECT_PLAY_PROFILES });
    return DIRECT_PLAY_PROFILES;
}
function isSafari() {
    const ua = navigator.userAgent;
    return ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium');
}
export const AudioPlayers = () => {
    const serverId = useCurrentServerId();
    const { resetSampleRate } = useSettingsStoreActions();
    const { audioDeviceId, mpvProperties: { audioSampleRateHz }, webAudio, } = usePlaybackSettings();
    const { setWebAudio, webAudio: audioContext } = useWebAudio();
    useEffect(() => {
        detectBrowserProfile();
    }, []);
    return (_jsxs(_Fragment, { children: [_jsx(SleepTimerHook, {}), _jsx(ScrobbleHook, {}), _jsx(PowerSaveBlockerHook, {}), _jsx(DiscordRpcHook, {}), _jsx(MPRISHook, {}), _jsx(MainPlayerListenerHook, {}), _jsx(MediaSessionHook, {}), _jsx(PlaybackHotkeysHook, {}), _jsx(RemoteHook, {}), _jsx(AutoDJHook, {}), _jsx(RememberMusicSessionHook, {}), _jsx(RestoreLastPlaybackSessionHook, {}), _jsx(QueueRestoreTimestampHook, {}), _jsx(UpdateCurrentSongHook, {}), _jsx(RadioAudioInstanceHook, {}), _jsx(RadioMetadataHook, {}), _jsx(VisualizerSystemAudioBridgeHook, {}), _jsx(AutosaveHook, {}), _jsx(AudioPlayersContent, { audioContext: audioContext, audioDeviceId: audioDeviceId, audioSampleRateHz: audioSampleRateHz, resetSampleRate: resetSampleRate, serverId: serverId, setWebAudio: setWebAudio, webAudio: webAudio })] }));
};
const AudioPlayersContent = ({ audioContext, audioDeviceId, audioSampleRateHz, resetSampleRate, serverId, setWebAudio, webAudio, }) => {
    const session = usePlaybackSession();
    const { engine, source } = session;
    useEffect(() => {
        if (webAudio && 'AudioContext' in window) {
            let context;
            try {
                context = new AudioContext({
                    latencyHint: 'playback',
                    sampleRate: audioSampleRateHz || undefined,
                });
            }
            catch (error) {
                // In practice, this should never be hit because the UI should validate
                // the range. However, the actual supported range is not guaranteed
                toast.error({ message: error.message });
                context = new AudioContext({ latencyHint: 'playback' });
                resetSampleRate();
            }
            const gains = [context.createGain(), context.createGain()];
            for (const gain of gains) {
                gain.connect(context.destination);
            }
            setWebAudio({ context, gains });
        }
        // Intentionally ignore the sample rate dependency, as it makes things really messy
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    useEffect(() => {
        // Not standard, just used in chromium-based browsers. See
        // https://developer.chrome.com/blog/audiocontext-setsinkid/.
        if (!isElectron()) {
            return;
        }
        if (audioContext && 'setSinkId' in audioContext.context && audioDeviceId) {
            const setSink = async () => {
                try {
                    if (audioContext.context.state !== 'closed') {
                        await audioContext.context.setSinkId(audioDeviceId);
                    }
                }
                catch (error) {
                    toast.error({ message: `Error setting sink: ${error.message}` });
                }
            };
            setSink();
        }
    }, [audioContext, audioDeviceId]);
    // Listen to favorite and rating events to update queue songs
    useEffect(() => {
        const handleFavorite = (payload) => {
            if (payload.itemType !== LibraryItem.SONG || payload.serverId !== serverId) {
                return;
            }
            updateQueueFavorites(payload.id, payload.favorite);
        };
        const handleRating = (payload) => {
            if (payload.itemType !== LibraryItem.SONG || payload.serverId !== serverId) {
                return;
            }
            updateQueueRatings(payload.id, payload.rating);
        };
        eventEmitter.on('USER_FAVORITE', handleFavorite);
        eventEmitter.on('USER_RATING', handleRating);
        return () => {
            eventEmitter.off('USER_FAVORITE', handleFavorite);
            eventEmitter.off('USER_RATING', handleRating);
        };
    }, [serverId]);
    const playbackType = usePlaybackType();
    if (source === 'radio') {
        return _jsx(RadioWebPlayer, {});
    }
    if (source === 'audiobook') {
        return _jsx(AudiobookWebPlayer, {});
    }
    if (source === 'podcast') {
        return _jsx(PodcastWebPlayer, {});
    }
    const musicEngine = engine === 'none'
        ? isElectron() && playbackType === PlayerType.LOCAL
            ? 'mpv-native'
            : 'web'
        : engine;
    if (source === 'music' && isElectron() && musicEngine === 'mpv-native') {
        return _jsx(MpvPlayer, {});
    }
    // Web is the explicit compatibility engine for music and the harmless idle engine at boot.
    return _jsx(WebPlayer, {});
};
