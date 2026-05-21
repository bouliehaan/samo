import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import formatDuration from 'format-duration';
import { lazy, memo, Suspense } from 'react';
import styles from './mobile-fullscreen-player.module.css';
import { PlayerbarSeekSlider } from '/@/renderer/features/player/components/playerbar-seek-slider';
import { useIsPlayingRadio } from '/@/renderer/features/radio/hooks/use-radio-player';
import { usePlayerTimestamp } from '/@/renderer/store';
import { usePlaybackSource } from '/@/renderer/store/playback-owner.store';
import { PlayerbarSliderType, usePlayerbarSlider } from '/@/renderer/store/settings.store';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Text } from '/@/shared/components/text/text';
import { PlaybackSelectors } from '/@/shared/constants/playback-selectors';
const PlayerbarWaveform = lazy(() => import('/@/renderer/features/player/components/playerbar-waveform').then((module) => ({
    default: module.PlayerbarWaveform,
})));
export const MobileFullscreenPlayerProgress = memo(({ currentSong }) => {
    const currentTime = usePlayerTimestamp();
    const playerbarSlider = usePlayerbarSlider();
    const source = usePlaybackSource();
    const isRadioMode = source === 'radio';
    const isPlayingRadio = useIsPlayingRadio();
    const songDuration = currentSong?.duration ? currentSong.duration / 1000 : 0;
    const formattedDuration = isRadioMode
        ? isPlayingRadio
            ? 'LIVE'
            : 'RADIO'
        : formatDuration(songDuration * 1000 || 0);
    const formattedTime = isRadioMode ? '' : formatDuration(currentTime * 1000 || 0);
    const isWaveform = !isRadioMode && playerbarSlider?.type === PlayerbarSliderType.WAVEFORM;
    return (_jsxs("div", { className: styles.progressContainer, children: [_jsx("div", { className: styles.timeContainer, children: _jsx(Text, { className: PlaybackSelectors.elapsedTime, size: "xs", style: { textAlign: 'right' }, children: formattedTime }) }), _jsx("div", { className: styles.sliderWrapper, children: isWaveform ? (_jsx(Suspense, { fallback: _jsx(Spinner, {}), children: _jsx(PlayerbarWaveform, {}) })) : (_jsx(PlayerbarSeekSlider, { max: songDuration, min: 0 })) }), _jsx("div", { className: styles.timeContainer, children: _jsx(Text, { className: PlaybackSelectors.totalDuration, size: "xs", style: { textAlign: 'left' }, children: formattedDuration }) })] }));
});
MobileFullscreenPlayerProgress.displayName = 'MobileFullscreenPlayerProgress';
