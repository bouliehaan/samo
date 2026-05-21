import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import formatDuration from 'format-duration';
import { lazy, Suspense } from 'react';
import { PlayerbarSeekSlider } from './playerbar-seek-slider';
import styles from './playerbar-slider.module.css';
import { useIsPlayingRadio } from '/@/renderer/features/radio/hooks/use-radio-player';
import { useAppStore, useAppStoreActions, usePlayerSong, usePlayerTimestamp, } from '/@/renderer/store';
import { useAudiobookDuration, useAudiobookPosition } from '/@/renderer/store/audiobook.store';
import { usePlaybackSource } from '/@/renderer/store/playback-owner.store';
import { usePodcastDuration, usePodcastPosition } from '/@/renderer/store/podcast.store';
import { PlayerbarSliderType, usePlayerbarSlider } from '/@/renderer/store/settings.store';
import { Slider } from '/@/shared/components/slider/slider';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Text } from '/@/shared/components/text/text';
import { PlaybackSelectors } from '/@/shared/constants/playback-selectors';
const PlayerbarWaveform = lazy(() => import('./playerbar-waveform').then((module) => ({
    default: module.PlayerbarWaveform,
})));
export const PlayerbarSlider = () => {
    const currentSong = usePlayerSong();
    const playerbarSlider = usePlayerbarSlider();
    const source = usePlaybackSource();
    const audiobookPosition = useAudiobookPosition();
    const audiobookDuration = useAudiobookDuration();
    const podcastPosition = usePodcastPosition();
    const podcastDuration = usePodcastDuration();
    const musicTimestamp = usePlayerTimestamp();
    const isPlayingRadio = useIsPlayingRadio();
    const isAudiobookMode = source === 'audiobook';
    const isPodcastMode = source === 'podcast';
    const isRadioMode = source === 'radio';
    const isLongFormMode = isAudiobookMode || isPodcastMode;
    const songDuration = currentSong?.duration ? currentSong.duration / 1000 : 0;
    // In long-form mode (audiobook/podcast), the playerbar reports absolute
    // position + full duration from the per-source store, not music's timestamp.
    const currentTime = isAudiobookMode
        ? audiobookPosition
        : isPodcastMode
            ? podcastPosition
            : musicTimestamp;
    const totalDuration = isAudiobookMode
        ? audiobookDuration
        : isPodcastMode
            ? podcastDuration
            : songDuration;
    const radioDurationLabel = isPlayingRadio ? 'LIVE' : 'RADIO';
    const formattedDuration = isRadioMode
        ? radioDurationLabel
        : formatDuration(totalDuration * 1000 || 0);
    const formattedTimeRemaining = isRadioMode
        ? radioDurationLabel
        : formatDuration((currentTime - totalDuration) * 1000 || 0);
    const formattedTime = isRadioMode ? '' : formatDuration(currentTime * 1000 || 0);
    const showTimeRemaining = useAppStore((state) => state.showTimeRemaining);
    const { setShowTimeRemaining } = useAppStoreActions();
    // Waveform UI is music-track-specific; never use it for audiobooks/podcasts.
    const isWaveform = !isLongFormMode && !isRadioMode && playerbarSlider?.type === PlayerbarSliderType.WAVEFORM;
    return (_jsx(_Fragment, { children: _jsxs("div", { className: styles.sliderContainer, children: [_jsx("div", { className: styles.sliderValueWrapper, children: _jsx(Text, { className: PlaybackSelectors.elapsedTime, fw: 600, isMuted: true, isNoSelect: true, size: "xs", style: { userSelect: 'none' }, children: formattedTime }) }), _jsx("div", { className: styles.sliderWrapper, children: isWaveform ? (_jsx(Suspense, { fallback: _jsx(Spinner, {}), children: _jsx(PlayerbarWaveform, {}) })) : (_jsx(PlayerbarSeekSlider, { max: totalDuration, min: 0 })) }), _jsx("div", { className: styles.sliderValueWrapper, children: _jsx(Text, { className: PlaybackSelectors.totalDuration, fw: 600, isMuted: true, isNoSelect: true, onClick: isRadioMode ? undefined : () => setShowTimeRemaining(!showTimeRemaining), role: isRadioMode ? undefined : 'button', size: "xs", style: {
                            cursor: isRadioMode ? 'default' : 'pointer',
                            userSelect: 'none',
                        }, children: showTimeRemaining ? formattedTimeRemaining : formattedDuration }) })] }) }));
};
export const CustomPlayerbarSlider = ({ ...props }) => {
    return (_jsx(Slider, { classNames: {
            bar: styles.bar,
            label: styles.label,
            root: styles.root,
            thumb: styles.thumb,
            track: styles.track,
        }, ...props, size: 6 }));
};
