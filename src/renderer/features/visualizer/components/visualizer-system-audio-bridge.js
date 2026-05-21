import isElectron from 'is-electron';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useIsLocalVisualizerSurfaceVisible } from '/@/renderer/features/player/hooks/use-is-local-visualizer-surface-visible';
import { useVisualizerSystemAudio } from '/@/renderer/features/player/hooks/use-visualizer-system-audio';
import { usePlayerStatus } from '/@/renderer/store/player.store';
import { usePlaybackSettings, usePlaybackType } from '/@/renderer/store/settings.store';
import { toast } from '/@/shared/components/toast/toast';
import { PlayerStatus, PlayerType } from '/@/shared/types/types';
const localSettings = isElectron() ? window.api.localSettings : null;
export function VisualizerSystemAudioBridgeHook() {
    const { t } = useTranslation();
    const playbackType = usePlaybackType();
    const playerStatus = usePlayerStatus();
    const isVisualizerSurfaceVisible = useIsLocalVisualizerSurfaceVisible();
    const { mpvProperties: { audioExclusiveMode }, webAudio, } = usePlaybackSettings();
    const exclusiveModeToastShownRef = useRef(false);
    const captureDeniedToastShownRef = useRef(false);
    const isLocalPlayback = playbackType === PlayerType.LOCAL;
    const isPlaying = playerStatus === PlayerStatus.PLAYING;
    const isExclusiveMode = audioExclusiveMode === 'yes';
    const shouldAttemptConnection = isLocalPlayback && isPlaying && isVisualizerSurfaceVisible && webAudio && !isExclusiveMode;
    useEffect(() => {
        if (!isLocalPlayback || !isPlaying || !isVisualizerSurfaceVisible || !isExclusiveMode) {
            return;
        }
        if (exclusiveModeToastShownRef.current) {
            return;
        }
        exclusiveModeToastShownRef.current = true;
        toast.warn({
            message: t('visualizer.systemAudioExclusiveModeNotSupported', {
                postProcess: 'sentenceCase',
            }),
        });
    }, [isExclusiveMode, isLocalPlayback, isPlaying, isVisualizerSurfaceVisible, t]);
    useEffect(() => {
        if (shouldAttemptConnection) {
            captureDeniedToastShownRef.current = false;
        }
    }, [shouldAttemptConnection]);
    useVisualizerSystemAudio({
        onSystemAudioCaptureDenied: () => {
            if (captureDeniedToastShownRef.current) {
                return;
            }
            captureDeniedToastShownRef.current = true;
            toast.warn({
                message: t('visualizer.systemAudioNoAudioTrack', {
                    postProcess: 'sentenceCase',
                }),
            });
        },
        onSystemAudioCaptureSuccess: () => {
            localSettings?.set('visualizer_system_audio_consent_granted', true);
        },
        shouldAttemptConnection,
    });
    return null;
}
