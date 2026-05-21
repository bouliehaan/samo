import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import styles from './center-controls.module.css';
import { MainPlayButton, PlayerButton } from '/@/renderer/features/player/components/player-button';
import { PlayerbarSlider } from '/@/renderer/features/player/components/playerbar-slider';
import { openShuffleAllModal } from '/@/renderer/features/player/components/shuffle-all-modal';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { useIsPlayingRadio, useIsRadioActive, useRadioControls, useRadioPlayer, } from '/@/renderer/features/radio/hooks/use-radio-player';
import { useButtonSize, usePlayerRepeat, usePlayerShuffle, usePlayerSongProperties, usePlayerStatus, useSkipButtons, } from '/@/renderer/store';
import { useAudiobookActions, useAudiobookContentUrl, useAudiobookDuration, useAudiobookIsLoading, useAudiobookItem, useAudiobookPosition, useAudiobookServer, } from '/@/renderer/store/audiobook.store';
import { usePlaybackSource } from '/@/renderer/store/playback-owner.store';
import { usePodcastActions, usePodcastContentUrl, usePodcastDuration, usePodcastEpisode, usePodcastIsLoading, usePodcastItem, usePodcastPosition, usePodcastServer, } from '/@/renderer/store/podcast.store';
import { Icon } from '/@/shared/components/icon/icon';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { PlayerRepeat, PlayerShuffle, PlayerStatus } from '/@/shared/types/types';
export const CenterControls = () => {
    const skip = useSkipButtons();
    const isRadioActive = useIsRadioActive();
    const { id: currentSongId } = usePlayerSongProperties(['id']) ?? {};
    const shouldShowRadioControls = isRadioActive && currentSongId === undefined;
    if (shouldShowRadioControls) {
        return (_jsx(_Fragment, { children: _jsx("div", { className: styles.controlsContainer, children: _jsxs("div", { className: styles.buttonsContainer, children: [_jsx(RadioStopButton, {}), _jsx(ShuffleButton, { disabled: shouldShowRadioControls }), _jsx(PreviousButton, { disabled: shouldShowRadioControls }), skip?.enabled && _jsx(SkipBackwardButton, { disabled: shouldShowRadioControls }), _jsx(RadioCenterPlayButton, {}), skip?.enabled && _jsx(SkipForwardButton, { disabled: shouldShowRadioControls }), _jsx(NextButton, { disabled: shouldShowRadioControls }), _jsx(RepeatButton, { disabled: shouldShowRadioControls }), _jsx(ShuffleAllButton, { disabled: shouldShowRadioControls })] }) }) }));
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: styles.controlsContainer, children: _jsxs("div", { className: styles.buttonsContainer, children: [_jsx(StopButton, {}), _jsx(ShuffleButton, {}), _jsx(PreviousButton, {}), skip?.enabled && _jsx(SkipBackwardButton, {}), _jsx(CenterPlayButton, {}), skip?.enabled && _jsx(SkipForwardButton, {}), _jsx(NextButton, {}), _jsx(RepeatButton, {}), _jsx(ShuffleAllButton, {})] }) }), _jsx(PlayerbarSlider, {})] }));
};
const RadioCenterPlayButton = ({ disabled }) => {
    const { currentStreamUrl } = useRadioPlayer();
    const isPlayingRadio = useIsPlayingRadio();
    const { pause, play } = useRadioControls();
    const handleClick = () => {
        if (isPlayingRadio) {
            pause();
        }
        else if (currentStreamUrl) {
            play();
        }
    };
    return _jsx(MainPlayButton, { disabled: disabled, isPaused: !isPlayingRadio, onClick: handleClick });
};
const RadioStopButton = ({ disabled }) => {
    const { t } = useTranslation();
    const buttonSize = useButtonSize();
    const { stop } = useRadioControls();
    return (_jsx(PlayerButton, { disabled: disabled, icon: _jsx(Icon, { fill: "default", icon: "mediaStop", size: buttonSize - 2 }), onClick: stop, tooltip: {
            label: t('player.stop', { postProcess: 'sentenceCase' }),
            openDelay: 0,
        }, variant: "tertiary" }));
};
const StopButton = ({ disabled }) => {
    const { t } = useTranslation();
    const buttonSize = useButtonSize();
    const { mediaStop } = usePlayer();
    return (_jsx(PlayerButton, { disabled: disabled, icon: _jsx(Icon, { fill: "default", icon: "mediaStop", size: buttonSize - 2 }), onClick: () => mediaStop(), tooltip: {
            label: t('player.stop', { postProcess: 'sentenceCase' }),
            openDelay: 0,
        }, variant: "tertiary" }));
};
const ShuffleButton = ({ disabled }) => {
    const { t } = useTranslation();
    const buttonSize = useButtonSize();
    const shuffle = usePlayerShuffle();
    const { toggleShuffle } = usePlayer();
    return (_jsx(PlayerButton, { disabled: disabled, icon: _jsx(Icon, { fill: shuffle === PlayerShuffle.NONE ? 'default' : 'primary', icon: "mediaShuffle", size: buttonSize }), isActive: shuffle !== PlayerShuffle.NONE, onClick: toggleShuffle, tooltip: {
            label: shuffle === PlayerShuffle.NONE
                ? t('player.shuffle', {
                    context: 'off',
                    postProcess: 'sentenceCase',
                })
                : t('player.shuffle', { postProcess: 'sentenceCase' }),
            openDelay: 0,
        }, variant: "tertiary" }));
};
const PreviousButton = ({ disabled }) => {
    const { t } = useTranslation();
    const buttonSize = useButtonSize();
    const { mediaPrevious } = usePlayer();
    const source = usePlaybackSource();
    const { seekToPreviousChapter } = useAudiobookActions();
    const { seekToPreviousEpisode } = usePodcastActions();
    const isAudiobookMode = source === 'audiobook';
    const isPodcastMode = source === 'podcast';
    let handleClick;
    let tooltipLabel;
    if (isAudiobookMode) {
        handleClick = seekToPreviousChapter;
        tooltipLabel =
            t('player.previous', { context: 'chapter', postProcess: 'sentenceCase' }) ||
                'Previous chapter';
    }
    else if (isPodcastMode) {
        handleClick = () => seekToPreviousEpisode();
        tooltipLabel =
            t('player.previous', { context: 'episode', postProcess: 'sentenceCase' }) ||
                'Previous episode';
    }
    else {
        handleClick = mediaPrevious;
        tooltipLabel = t('player.previous', { postProcess: 'sentenceCase' });
    }
    return (_jsx(PlayerButton, { disabled: disabled, icon: _jsx(Icon, { fill: "default", icon: "mediaPrevious", size: buttonSize }), onClick: handleClick, tooltip: {
            label: tooltipLabel,
            openDelay: 0,
        }, variant: "secondary" }));
};
const SkipBackwardButton = ({ disabled }) => {
    const { t } = useTranslation();
    const buttonSize = useButtonSize();
    const source = usePlaybackSource();
    const skip = useSkipButtons();
    const audiobookPosition = useAudiobookPosition();
    const audiobookActions = useAudiobookActions();
    const podcastPosition = usePodcastPosition();
    const podcastActions = usePodcastActions();
    const { mediaSeekToTimestamp, mediaSkipBackward } = usePlayer();
    const handleClick = () => {
        const seconds = skip?.skipBackwardSeconds ?? 5;
        if (source === 'audiobook') {
            const target = Math.max(0, audiobookPosition - seconds);
            audiobookActions.seekTo(target);
            mediaSeekToTimestamp(target);
            return;
        }
        if (source === 'podcast') {
            const target = Math.max(0, podcastPosition - seconds);
            podcastActions.seekTo(target);
            mediaSeekToTimestamp(target);
            return;
        }
        mediaSkipBackward();
    };
    return (_jsx(PlayerButton, { disabled: disabled, icon: _jsx(Icon, { fill: "default", icon: "mediaStepBackward", size: buttonSize }), onClick: handleClick, tooltip: {
            label: t('player.skip', {
                context: 'back',
                postProcess: 'sentenceCase',
            }),
            openDelay: 0,
        }, variant: "secondary" }));
};
const CenterPlayButton = ({ disabled }) => {
    const { id: currentSongId } = usePlayerSongProperties(['id']) ?? {};
    const source = usePlaybackSource();
    const audiobookItem = useAudiobookItem();
    const audiobookContentUrl = useAudiobookContentUrl();
    const audiobookIsLoading = useAudiobookIsLoading();
    const audiobookServer = useAudiobookServer();
    const audiobookActions = useAudiobookActions();
    const podcastItem = usePodcastItem();
    const podcastEpisode = usePodcastEpisode();
    const podcastContentUrl = usePodcastContentUrl();
    const podcastIsLoading = usePodcastIsLoading();
    const podcastServer = usePodcastServer();
    const podcastActions = usePodcastActions();
    const status = usePlayerStatus();
    const { mediaTogglePlayPause } = usePlayer();
    const isAudiobookMode = source === 'audiobook';
    const isPodcastMode = source === 'podcast';
    const isStartingLongForm = (isAudiobookMode && audiobookIsLoading) || (isPodcastMode && podcastIsLoading);
    const canPlayAudiobook = Boolean(audiobookItem && audiobookServer);
    const canPlayPodcast = Boolean(podcastItem && podcastEpisode && podcastServer);
    const handleClick = () => {
        if (isAudiobookMode && !audiobookContentUrl && audiobookServer && audiobookItem) {
            audiobookActions.play(audiobookServer, audiobookItem);
            return;
        }
        if (isPodcastMode && !podcastContentUrl && podcastServer && podcastItem && podcastEpisode) {
            podcastActions.play(podcastServer, podcastItem, podcastEpisode);
            return;
        }
        mediaTogglePlayPause();
    };
    if (isStartingLongForm) {
        return (_jsx(PlayerButton, { disabled: true, icon: _jsx(Spinner, { size: 20 }), tooltip: { label: 'Starting playback...', openDelay: 0 }, variant: "main" }));
    }
    return (_jsx(MainPlayButton, { disabled: disabled ||
            (isAudiobookMode
                ? !canPlayAudiobook
                : isPodcastMode
                    ? !canPlayPodcast
                    : currentSongId === undefined), isPaused: status === PlayerStatus.PAUSED, onClick: handleClick }));
};
const SkipForwardButton = ({ disabled }) => {
    const { t } = useTranslation();
    const buttonSize = useButtonSize();
    const source = usePlaybackSource();
    const skip = useSkipButtons();
    const audiobookPosition = useAudiobookPosition();
    const audiobookDuration = useAudiobookDuration();
    const audiobookActions = useAudiobookActions();
    const podcastPosition = usePodcastPosition();
    const podcastDuration = usePodcastDuration();
    const podcastActions = usePodcastActions();
    const { mediaSeekToTimestamp, mediaSkipForward } = usePlayer();
    const handleLongFormSkip = (position, duration, seekTo) => {
        const seconds = skip?.skipForwardSeconds ?? 10;
        const unclampedTarget = position + seconds;
        const target = duration > 0 ? Math.min(duration, unclampedTarget) : unclampedTarget;
        seekTo(target);
        mediaSeekToTimestamp(target);
    };
    const handleClick = () => {
        if (source === 'audiobook') {
            handleLongFormSkip(audiobookPosition, audiobookDuration, audiobookActions.seekTo);
            return;
        }
        if (source === 'podcast') {
            handleLongFormSkip(podcastPosition, podcastDuration, podcastActions.seekTo);
            return;
        }
        mediaSkipForward();
    };
    return (_jsx(PlayerButton, { disabled: disabled, icon: _jsx(Icon, { fill: "default", icon: "mediaStepForward", size: buttonSize }), onClick: handleClick, tooltip: {
            label: t('player.skip', {
                context: 'forward',
                postProcess: 'sentenceCase',
            }),
            openDelay: 0,
        }, variant: "secondary" }));
};
const NextButton = ({ disabled }) => {
    const { t } = useTranslation();
    const buttonSize = useButtonSize();
    const { mediaNext } = usePlayer();
    const source = usePlaybackSource();
    const { seekToNextChapter } = useAudiobookActions();
    const { seekToNextEpisode } = usePodcastActions();
    const isAudiobookMode = source === 'audiobook';
    const isPodcastMode = source === 'podcast';
    let handleClick;
    let tooltipLabel;
    if (isAudiobookMode) {
        handleClick = seekToNextChapter;
        tooltipLabel =
            t('player.next', { context: 'chapter', postProcess: 'sentenceCase' }) || 'Next chapter';
    }
    else if (isPodcastMode) {
        handleClick = () => seekToNextEpisode();
        tooltipLabel =
            t('player.next', { context: 'episode', postProcess: 'sentenceCase' }) || 'Next episode';
    }
    else {
        handleClick = mediaNext;
        tooltipLabel = t('player.next', { postProcess: 'sentenceCase' });
    }
    return (_jsx(PlayerButton, { disabled: disabled, icon: _jsx(Icon, { fill: "default", icon: "mediaNext", size: buttonSize }), onClick: handleClick, tooltip: {
            label: tooltipLabel,
            openDelay: 0,
        }, variant: "secondary" }));
};
const RepeatButton = ({ disabled }) => {
    const { t } = useTranslation();
    const buttonSize = useButtonSize();
    const repeat = usePlayerRepeat();
    const { toggleRepeat } = usePlayer();
    return (_jsx(PlayerButton, { disabled: disabled, icon: repeat === PlayerRepeat.ONE ? (_jsx(Icon, { fill: "primary", icon: "mediaRepeatOne", size: buttonSize })) : (_jsx(Icon, { fill: repeat === PlayerRepeat.NONE ? 'default' : 'primary', icon: "mediaRepeat", size: buttonSize })), isActive: repeat !== PlayerRepeat.NONE, onClick: toggleRepeat, tooltip: {
            label: `${repeat === PlayerRepeat.NONE
                ? t('player.repeat', {
                    context: 'off',
                    postProcess: 'sentenceCase',
                })
                : repeat === PlayerRepeat.ALL
                    ? t('player.repeat', {
                        context: 'all',
                        postProcess: 'sentenceCase',
                    })
                    : t('player.repeat', {
                        context: 'one',
                        postProcess: 'sentenceCase',
                    })}`,
            openDelay: 0,
        }, variant: "tertiary" }));
};
const ShuffleAllButton = ({ disabled }) => {
    const { t } = useTranslation();
    const buttonSize = useButtonSize();
    return (_jsx(PlayerButton, { disabled: disabled, icon: _jsx(Icon, { fill: "default", icon: "mediaRandom", size: buttonSize }), onClick: () => openShuffleAllModal(), tooltip: {
            label: t('form.shuffleAll.title', { postProcess: 'sentenceCase' }),
            openDelay: 0,
        }, variant: "tertiary" }));
};
