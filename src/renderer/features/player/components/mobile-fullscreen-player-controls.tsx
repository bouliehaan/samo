import { LONG_FORM_RELATIVE_SKIP_SECONDS } from '@samo/core/mobile';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './mobile-fullscreen-player.module.css';

import { MainPlayButton, PlayerButton } from '/@/renderer/features/player/components/player-button';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { usePlayerStatus } from '/@/renderer/store';
import {
    useAudiobookActions,
    useAudiobookDuration,
    useAudiobookPosition,
} from '/@/renderer/store/audiobook.store';
import { usePlaybackSource } from '/@/renderer/store/playback-owner.store';
import {
    usePodcastActions,
    usePodcastDuration,
    usePodcastPosition,
} from '/@/renderer/store/podcast.store';
import { Icon } from '/@/shared/components/icon/icon';
import { QueueSong } from '/@/shared/types/domain-types';
import { PlayerStatus } from '/@/shared/types/types';

interface MobileFullscreenPlayerControlsProps {
    currentSong?: QueueSong;
}

export const MobileFullscreenPlayerControls = memo(
    ({ currentSong }: MobileFullscreenPlayerControlsProps) => {
        const currentSongId = currentSong?.id;
        const { t } = useTranslation();
        const status = usePlayerStatus();
        const source = usePlaybackSource();
        const isLongForm = source === 'audiobook' || source === 'podcast';
        const audiobookPosition = useAudiobookPosition();
        const audiobookDuration = useAudiobookDuration();
        const audiobookActions = useAudiobookActions();
        const podcastPosition = usePodcastPosition();
        const podcastDuration = usePodcastDuration();
        const podcastActions = usePodcastActions();
        const {
            mediaNext,
            mediaPrevious,
            mediaSeekToTimestamp,
            mediaSkipBackward,
            mediaSkipForward,
            mediaTogglePlayPause,
        } = usePlayer();

        const skipLongForm = (delta: number) => {
            if (source === 'audiobook') {
                const target = Math.max(
                    0,
                    Math.min(
                        audiobookDuration > 0 ? audiobookDuration : Number.POSITIVE_INFINITY,
                        audiobookPosition + delta,
                    ),
                );
                audiobookActions.seekTo(target);
                mediaSeekToTimestamp(target);
                return;
            }

            if (source === 'podcast') {
                const target = Math.max(
                    0,
                    Math.min(
                        podcastDuration > 0 ? podcastDuration : Number.POSITIVE_INFINITY,
                        podcastPosition + delta,
                    ),
                );
                podcastActions.seekTo(target);
                mediaSeekToTimestamp(target);
            }
        };

        const skipBackLabel = isLongForm
            ? `−${LONG_FORM_RELATIVE_SKIP_SECONDS}s`
            : t('player.skip', { context: 'back', postProcess: 'sentenceCase' });
        const skipForwardLabel = isLongForm
            ? `+${LONG_FORM_RELATIVE_SKIP_SECONDS}s`
            : t('player.skip', { context: 'forward', postProcess: 'sentenceCase' });

        return (
            <div className={styles.controlsContainer}>
                <PlayerButton
                    icon={<Icon fill="default" icon="mediaPrevious" size="xl" />}
                    onClick={mediaPrevious}
                    tooltip={{
                        label: t('player.previous', { postProcess: 'sentenceCase' }),
                        openDelay: 0,
                    }}
                    variant="secondary"
                />
                <PlayerButton
                    icon={
                        isLongForm ? (
                            <span className={styles.longFormSkipLabel}>{skipBackLabel}</span>
                        ) : (
                            <Icon fill="default" icon="mediaStepBackward" size="xl" />
                        )
                    }
                    onClick={() =>
                        isLongForm
                            ? skipLongForm(-LONG_FORM_RELATIVE_SKIP_SECONDS)
                            : mediaSkipBackward()
                    }
                    tooltip={{
                        label: skipBackLabel,
                        openDelay: 0,
                    }}
                    variant="tertiary"
                />
                <MainPlayButton
                    disabled={currentSongId === undefined && !isLongForm}
                    isPaused={status === PlayerStatus.PAUSED}
                    onClick={mediaTogglePlayPause}
                    style={{
                        height: '50px',
                        width: '50px',
                    }}
                />
                <PlayerButton
                    icon={
                        isLongForm ? (
                            <span className={styles.longFormSkipLabel}>{skipForwardLabel}</span>
                        ) : (
                            <Icon fill="default" icon="mediaStepForward" size="xl" />
                        )
                    }
                    onClick={() =>
                        isLongForm
                            ? skipLongForm(LONG_FORM_RELATIVE_SKIP_SECONDS)
                            : mediaSkipForward()
                    }
                    tooltip={{
                        label: skipForwardLabel,
                        openDelay: 0,
                    }}
                    variant="tertiary"
                />
                <PlayerButton
                    icon={<Icon fill="default" icon="mediaNext" size="xl" />}
                    onClick={mediaNext}
                    tooltip={{
                        label: t('player.next', { postProcess: 'sentenceCase' }),
                        openDelay: 0,
                    }}
                    variant="secondary"
                />
            </div>
        );
    },
);

MobileFullscreenPlayerControls.displayName = 'MobileFullscreenPlayerControls';
