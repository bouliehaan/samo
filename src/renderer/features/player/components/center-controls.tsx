import { LONG_FORM_RELATIVE_SKIP_SECONDS } from '@samo/core/mobile';
import { useTranslation } from 'react-i18next';

import styles from './center-controls.module.css';

import { MainPlayButton, PlayerButton } from '/@/renderer/features/player/components/player-button';
import { PlayerbarSlider } from '/@/renderer/features/player/components/playerbar-slider';
import { openShuffleAllModal } from '/@/renderer/features/player/components/shuffle-all-modal';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import {
    useIsPlayingRadio,
    useIsRadioActive,
    useRadioControls,
    useRadioPlayer,
} from '/@/renderer/features/radio/hooks/use-radio-player';
import {
    useButtonSize,
    usePlayerRepeat,
    usePlayerShuffle,
    usePlayerSongProperties,
    usePlayerStatus,
    useSkipButtons,
} from '/@/renderer/store';
import {
    useAudiobookActions,
    useAudiobookContentUrl,
    useAudiobookDuration,
    useAudiobookIsLoading,
    useAudiobookItem,
    useAudiobookPosition,
    useAudiobookServer,
} from '/@/renderer/store/audiobook.store';
import { usePlaybackSource } from '/@/renderer/store/playback-owner.store';
import {
    usePodcastActions,
    usePodcastContentUrl,
    usePodcastDuration,
    usePodcastEpisode,
    usePodcastIsLoading,
    usePodcastItem,
    usePodcastPosition,
    usePodcastServer,
} from '/@/renderer/store/podcast.store';
import { Icon } from '/@/shared/components/icon/icon';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { PlayerRepeat, PlayerShuffle, PlayerStatus } from '/@/shared/types/types';

export const CenterControls = () => {
    const skip = useSkipButtons();

    const isRadioActive = useIsRadioActive();
    const { id: currentSongId } = usePlayerSongProperties(['id']) ?? {};
    const shouldShowRadioControls = isRadioActive && currentSongId === undefined;

    if (shouldShowRadioControls) {
        return (
            <>
                <div className={styles.controlsContainer}>
                    <div className={styles.buttonsContainer}>
                        <RadioStopButton />
                        <ShuffleButton disabled={shouldShowRadioControls} />
                        <PreviousButton disabled={shouldShowRadioControls} />
                        {skip?.enabled && <SkipBackwardButton disabled={shouldShowRadioControls} />}
                        <RadioCenterPlayButton />
                        {skip?.enabled && <SkipForwardButton disabled={shouldShowRadioControls} />}
                        <NextButton disabled={shouldShowRadioControls} />
                        <RepeatButton disabled={shouldShowRadioControls} />
                        <ShuffleAllButton disabled={shouldShowRadioControls} />
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <div className={styles.controlsContainer}>
                <div className={styles.buttonsContainer}>
                    <StopButton />
                    <ShuffleButton />
                    <PreviousButton />
                    {skip?.enabled && <SkipBackwardButton />}
                    <CenterPlayButton />
                    {skip?.enabled && <SkipForwardButton />}
                    <NextButton />
                    <RepeatButton />
                    <ShuffleAllButton />
                </div>
            </div>
            <PlayerbarSlider />
        </>
    );
};

const RadioCenterPlayButton = ({ disabled }: { disabled?: boolean }) => {
    const { currentStreamUrl } = useRadioPlayer();
    const isPlayingRadio = useIsPlayingRadio();
    const { pause, play } = useRadioControls();

    const handleClick = () => {
        if (isPlayingRadio) {
            pause();
        } else if (currentStreamUrl) {
            play();
        }
    };

    return <MainPlayButton disabled={disabled} isPaused={!isPlayingRadio} onClick={handleClick} />;
};

const RadioStopButton = ({ disabled }: { disabled?: boolean }) => {
    const { t } = useTranslation();
    const buttonSize = useButtonSize();
    const { stop } = useRadioControls();

    return (
        <PlayerButton
            disabled={disabled}
            icon={<Icon fill="default" icon="mediaStop" size={buttonSize - 2} />}
            onClick={stop}
            tooltip={{
                label: t('player.stop', { postProcess: 'sentenceCase' }),
                openDelay: 0,
            }}
            variant="tertiary"
        />
    );
};

const StopButton = ({ disabled }: { disabled?: boolean }) => {
    const { t } = useTranslation();
    const buttonSize = useButtonSize();
    const { mediaStop } = usePlayer();

    return (
        <PlayerButton
            disabled={disabled}
            icon={<Icon fill="default" icon="mediaStop" size={buttonSize - 2} />}
            onClick={() => mediaStop()}
            tooltip={{
                label: t('player.stop', { postProcess: 'sentenceCase' }),
                openDelay: 0,
            }}
            variant="tertiary"
        />
    );
};

const ShuffleButton = ({ disabled }: { disabled?: boolean }) => {
    const { t } = useTranslation();
    const buttonSize = useButtonSize();
    const shuffle = usePlayerShuffle();
    const { toggleShuffle } = usePlayer();

    return (
        <PlayerButton
            disabled={disabled}
            icon={
                <Icon
                    fill={shuffle === PlayerShuffle.NONE ? 'default' : 'primary'}
                    icon="mediaShuffle"
                    size={buttonSize}
                />
            }
            isActive={shuffle !== PlayerShuffle.NONE}
            onClick={toggleShuffle}
            tooltip={{
                label:
                    shuffle === PlayerShuffle.NONE
                        ? t('player.shuffle', {
                              context: 'off',
                              postProcess: 'sentenceCase',
                          })
                        : t('player.shuffle', { postProcess: 'sentenceCase' }),
                openDelay: 0,
            }}
            variant="tertiary"
        />
    );
};

const PreviousButton = ({ disabled }: { disabled?: boolean }) => {
    const { t } = useTranslation();
    const buttonSize = useButtonSize();
    const { mediaPrevious } = usePlayer();
    const source = usePlaybackSource();
    const { seekToPreviousChapter } = useAudiobookActions();
    const { seekToPreviousEpisode } = usePodcastActions();

    const isAudiobookMode = source === 'audiobook';
    const isPodcastMode = source === 'podcast';

    let handleClick: () => Promise<void> | void;
    let tooltipLabel: string;

    if (isAudiobookMode) {
        handleClick = seekToPreviousChapter;
        tooltipLabel =
            t('player.previous', { context: 'chapter', postProcess: 'sentenceCase' }) ||
            'Previous chapter';
    } else if (isPodcastMode) {
        handleClick = () => seekToPreviousEpisode();
        tooltipLabel =
            t('player.previous', { context: 'episode', postProcess: 'sentenceCase' }) ||
            'Previous episode';
    } else {
        handleClick = mediaPrevious;
        tooltipLabel = t('player.previous', { postProcess: 'sentenceCase' });
    }

    return (
        <PlayerButton
            disabled={disabled}
            icon={<Icon fill="default" icon="mediaPrevious" size={buttonSize} />}
            onClick={handleClick}
            tooltip={{
                label: tooltipLabel,
                openDelay: 0,
            }}
            variant="secondary"
        />
    );
};

const SkipBackwardButton = ({ disabled }: { disabled?: boolean }) => {
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
        const seconds =
            source === 'audiobook' || source === 'podcast'
                ? LONG_FORM_RELATIVE_SKIP_SECONDS
                : (skip?.skipBackwardSeconds ?? 5);

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

    return (
        <PlayerButton
            disabled={disabled}
            icon={<Icon fill="default" icon="mediaStepBackward" size={buttonSize} />}
            onClick={handleClick}
            tooltip={{
                label:
                    source === 'audiobook' || source === 'podcast'
                        ? `Back ${LONG_FORM_RELATIVE_SKIP_SECONDS} seconds`
                        : t('player.skip', {
                              context: 'back',
                              postProcess: 'sentenceCase',
                          }),
                openDelay: 0,
            }}
            variant="secondary"
        />
    );
};

const CenterPlayButton = ({ disabled }: { disabled?: boolean }) => {
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
    const isStartingLongForm =
        (isAudiobookMode && audiobookIsLoading) || (isPodcastMode && podcastIsLoading);
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
        return (
            <PlayerButton
                disabled
                icon={<Spinner size={20} />}
                tooltip={{ label: 'Starting playback...', openDelay: 0 }}
                variant="main"
            />
        );
    }

    return (
        <MainPlayButton
            disabled={
                disabled ||
                (isAudiobookMode
                    ? !canPlayAudiobook
                    : isPodcastMode
                      ? !canPlayPodcast
                      : currentSongId === undefined)
            }
            isPaused={status === PlayerStatus.PAUSED}
            onClick={handleClick}
        />
    );
};

const SkipForwardButton = ({ disabled }: { disabled?: boolean }) => {
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

    const handleLongFormSkip = (
        position: number,
        duration: number,
        seekTo: (seconds: number) => void,
    ) => {
        const seconds =
            source === 'audiobook' || source === 'podcast'
                ? LONG_FORM_RELATIVE_SKIP_SECONDS
                : (skip?.skipForwardSeconds ?? 10);
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

    return (
        <PlayerButton
            disabled={disabled}
            icon={<Icon fill="default" icon="mediaStepForward" size={buttonSize} />}
            onClick={handleClick}
            tooltip={{
                label:
                    source === 'audiobook' || source === 'podcast'
                        ? `Forward ${LONG_FORM_RELATIVE_SKIP_SECONDS} seconds`
                        : t('player.skip', {
                              context: 'forward',
                              postProcess: 'sentenceCase',
                          }),
                openDelay: 0,
            }}
            variant="secondary"
        />
    );
};

const NextButton = ({ disabled }: { disabled?: boolean }) => {
    const { t } = useTranslation();
    const buttonSize = useButtonSize();
    const { mediaNext } = usePlayer();
    const source = usePlaybackSource();
    const { seekToNextChapter } = useAudiobookActions();
    const { seekToNextEpisode } = usePodcastActions();

    const isAudiobookMode = source === 'audiobook';
    const isPodcastMode = source === 'podcast';

    let handleClick: () => Promise<void> | void;
    let tooltipLabel: string;

    if (isAudiobookMode) {
        handleClick = seekToNextChapter;
        tooltipLabel =
            t('player.next', { context: 'chapter', postProcess: 'sentenceCase' }) || 'Next chapter';
    } else if (isPodcastMode) {
        handleClick = () => seekToNextEpisode();
        tooltipLabel =
            t('player.next', { context: 'episode', postProcess: 'sentenceCase' }) || 'Next episode';
    } else {
        handleClick = mediaNext;
        tooltipLabel = t('player.next', { postProcess: 'sentenceCase' });
    }

    return (
        <PlayerButton
            disabled={disabled}
            icon={<Icon fill="default" icon="mediaNext" size={buttonSize} />}
            onClick={handleClick}
            tooltip={{
                label: tooltipLabel,
                openDelay: 0,
            }}
            variant="secondary"
        />
    );
};

const RepeatButton = ({ disabled }: { disabled?: boolean }) => {
    const { t } = useTranslation();
    const buttonSize = useButtonSize();
    const repeat = usePlayerRepeat();
    const { toggleRepeat } = usePlayer();

    return (
        <PlayerButton
            disabled={disabled}
            icon={
                repeat === PlayerRepeat.ONE ? (
                    <Icon fill="primary" icon="mediaRepeatOne" size={buttonSize} />
                ) : (
                    <Icon
                        fill={repeat === PlayerRepeat.NONE ? 'default' : 'primary'}
                        icon="mediaRepeat"
                        size={buttonSize}
                    />
                )
            }
            isActive={repeat !== PlayerRepeat.NONE}
            onClick={toggleRepeat}
            tooltip={{
                label: `${
                    repeat === PlayerRepeat.NONE
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
                            })
                }`,
                openDelay: 0,
            }}
            variant="tertiary"
        />
    );
};

const ShuffleAllButton = ({ disabled }: { disabled?: boolean }) => {
    const { t } = useTranslation();
    const buttonSize = useButtonSize();

    return (
        <PlayerButton
            disabled={disabled}
            icon={<Icon fill="default" icon="mediaRandom" size={buttonSize} />}
            onClick={() => openShuffleAllModal()}
            tooltip={{
                label: t('form.shuffleAll.title', { postProcess: 'sentenceCase' }),
                openDelay: 0,
            }}
            variant="tertiary"
        />
    );
};
