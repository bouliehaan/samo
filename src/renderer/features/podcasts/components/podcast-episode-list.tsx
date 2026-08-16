import formatDuration from 'format-duration';
import { MouseEvent, ReactElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AutoSizer from 'react-virtualized-auto-sizer';
import { List, RowComponentProps } from 'react-window-v2';

import styles from './podcast-episode-list.module.css';

import { getEpisodeProgressFraction } from '/@/renderer/features/podcasts/utils/episode-progress';
import { virtualListStyle } from '/@/renderer/utils/virtual-list-style';
import { LongFormPodcastEpisode } from '/@/shared/api/long-form-types';
import { Text } from '/@/shared/components/text/text';

const ROW_HEIGHT = 104;

const formatEpisodeDate = (publishedAt?: number) => {
    if (!publishedAt) return null;
    try {
        return new Date(publishedAt).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return null;
    }
};

const formatEpisodeDuration = (episode: LongFormPodcastEpisode) => {
    const seconds = episode.duration ?? episode.audioFile?.duration;
    if (!seconds || !Number.isFinite(seconds)) return null;
    return formatDuration(seconds * 1000);
};

interface RowData {
    activeEpisodeId?: string;
    episodes: LongFormPodcastEpisode[];
    onContextMenu?: (episode: LongFormPodcastEpisode, event: MouseEvent<HTMLButtonElement>) => void;
    onPlay: (episode: LongFormPodcastEpisode) => void;
    playedLabel: string;
    untitledLabel: string;
}

const EpisodeRow = ({
    activeEpisodeId,
    episodes,
    index,
    onContextMenu,
    onPlay,
    playedLabel,
    style,
    untitledLabel,
}: RowComponentProps<RowData>) => {
    const episode = episodes[index];
    if (!episode) return null;

    const date = formatEpisodeDate(episode.publishedAt);
    const duration = formatEpisodeDuration(episode);
    const progressFraction = getEpisodeProgressFraction(episode);
    const isActive = activeEpisodeId === episode.id;

    return (
        <div style={style}>
            <button
                aria-current={isActive ? 'true' : undefined}
                className={styles.row}
                onClick={() => onPlay(episode)}
                onContextMenu={(event) => onContextMenu?.(episode, event)}
                type="button"
            >
                <span className={styles.header}>
                    <span className={styles.title}>{episode.title || untitledLabel}</span>
                    {episode.completed ? (
                        <span className={styles.played}>{playedLabel}</span>
                    ) : null}
                </span>
                <span className={styles.meta}>
                    {date ? <span>{date}</span> : null}
                    {date && duration ? <span aria-hidden>·</span> : null}
                    {duration ? <span>{duration}</span> : null}
                </span>
                {episode.subtitle || episode.description ? (
                    <span className={styles.description}>
                        {episode.subtitle || episode.description}
                    </span>
                ) : null}
                {progressFraction !== undefined ? (
                    <span className={styles.progressTrack}>
                        <span
                            className={
                                episode.completed ? styles.progressBarDone : styles.progressBar
                            }
                            style={{ width: `${progressFraction * 100}%` }}
                        />
                    </span>
                ) : null}
            </button>
        </div>
    );
};

interface PodcastEpisodeListProps {
    activeEpisodeId?: string;
    episodes: LongFormPodcastEpisode[];
    onContextMenu?: (episode: LongFormPodcastEpisode, event: MouseEvent<HTMLButtonElement>) => void;
    onPlay: (episode: LongFormPodcastEpisode) => void;
}

/**
 * Virtualized episode list. A long-running show can carry thousands of
 * episodes, and the previous list gave every one of them a DOM node whether or
 * not it was on screen.
 */
export const PodcastEpisodeList = ({
    activeEpisodeId,
    episodes,
    onContextMenu,
    onPlay,
}: PodcastEpisodeListProps) => {
    const { t } = useTranslation();

    const rowProps = useMemo<RowData>(
        () => ({
            activeEpisodeId,
            episodes,
            onContextMenu,
            onPlay,
            playedLabel: t('common.played', { postProcess: 'sentenceCase' }),
            untitledLabel: t('entity.untitledEpisode', { postProcess: 'sentenceCase' }),
        }),
        [activeEpisodeId, episodes, onContextMenu, onPlay, t],
    );

    if (!episodes.length) {
        return (
            <Text isMuted size="sm">
                {t('error.noEpisodesAvailable', { postProcess: 'sentenceCase' })}
            </Text>
        );
    }

    return (
        <div className={styles.container}>
            <AutoSizer>
                {({ height, width }) =>
                    !height || !width ? null : (
                        <List
                            rowComponent={
                                EpisodeRow as (props: RowComponentProps<RowData>) => ReactElement
                            }
                            rowCount={episodes.length}
                            rowHeight={ROW_HEIGHT}
                            rowProps={rowProps}
                            style={virtualListStyle(height, width)}
                        />
                    )
                }
            </AutoSizer>
        </div>
    );
};
