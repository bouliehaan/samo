import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useCallback, useMemo } from 'react';

import podcastFeedStyles from './home-podcast-feed.module.css';

import {
    fetchSamoHomePodcastFeed,
    isSamoLongFormServer,
    loadSamoPodcastLibraryItem,
    samoPodcastEpisodeToAbsEpisode,
    type SamoPodcastFeedEntry,
} from '/@/renderer/api/samo/samo-long-form';
import {
    GridCarousel,
    useGridCarouselContainerQuery,
} from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import itemCardControlsStyles from '/@/renderer/components/item-card/item-card-controls.module.css';
import { HomeSectionTitle } from '/@/renderer/features/home/components/home-section-title';
import { LongFormCoverImage } from '/@/renderer/features/player/components/long-form-cover-image';
import { PlayButton } from '/@/renderer/features/shared/components/play-button';
import { AppRoute } from '/@/renderer/router/routes';
import {
    getServerById,
    recordRecentPodcast,
    useCurrentServer,
    useCurrentServerId,
} from '/@/renderer/store';
import { usePodcastActions } from '/@/renderer/store/podcast.store';
import { formatDateRelative } from '/@/renderer/utils/format';
import { Box } from '/@/shared/components/box/box';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { ServerType } from '/@/shared/types/domain-types';

const formatPublishedDate = (publishedAt?: string) => {
    if (!publishedAt) {
        return undefined;
    }

    const parsed = Date.parse(publishedAt);
    if (!Number.isFinite(parsed)) {
        return undefined;
    }

    return new Intl.DateTimeFormat(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(parsed);
};

const getEpisodeProgressFraction = (entry: SamoPodcastFeedEntry) => {
    const progress = entry.episode.progress ?? entry.episode.playback;
    if (progress?.completed) {
        return 1;
    }

    const duration = entry.episode.duration;
    const position = progress?.progressSeconds;
    if (!duration || !position || position <= 0) {
        return undefined;
    }

    const fraction = position / duration;
    if (fraction <= 0.02) {
        return undefined;
    }

    return Math.min(1, fraction);
};

const getFeedSubtitle = (entry: SamoPodcastFeedEntry) => {
    const showTitle = entry.episode.podcastTitle?.trim();
    const releaseDate = formatPublishedDate(entry.episode.publishedAt);

    return [showTitle, releaseDate].filter(Boolean).join(' · ');
};

const PodcastFeedCard = ({
    entry,
    onPlay,
}: {
    entry: SamoPodcastFeedEntry;
    onPlay: () => void;
}) => {
    const title = entry.episode.title ?? entry.episode.name ?? 'Untitled episode';
    const showId = entry.episode.podcastId ?? entry.episode.id;
    const progressFraction = getEpisodeProgressFraction(entry);
    const isCompleted = entry.episode.progress?.completed ?? entry.episode.playback?.completed;

    return (
        <div
            aria-label={`Play ${title}`}
            className={podcastFeedStyles.cardButton}
            onClick={() => void onPlay()}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    void onPlay();
                }
            }}
            role="button"
            tabIndex={0}
        >
            <div className={podcastFeedStyles.artWrap}>
                <LongFormCoverImage
                    alt={title}
                    fallbackIcon="microphone"
                    imageUrl={entry.artworkUrl}
                    itemId={showId}
                />
                <div
                    className={clsx(
                        itemCardControlsStyles.overlayControls,
                        podcastFeedStyles.overlayControls,
                    )}
                >
                    <PlayButton
                        classNames={clsx(itemCardControlsStyles.overlayPlay)}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onPlay();
                        }}
                    />
                </div>
            </div>
            <Text className={podcastFeedStyles.title} fw={650} lineClamp={2} size="sm">
                {title}
            </Text>
            <Text className={podcastFeedStyles.subtitle} isMuted lineClamp={1} size="sm">
                {getFeedSubtitle(entry) || formatDateRelative(entry.episode.publishedAt ?? null)}
            </Text>
            {isCompleted ? (
                <Text c="primary" size="sm">
                    Played
                </Text>
            ) : null}
            {progressFraction !== undefined ? (
                <Box
                    h={3}
                    mt={4}
                    style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: 999,
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        h="100%"
                        style={{
                            background: isCompleted
                                ? 'var(--theme-colors-primary)'
                                : 'rgba(202, 160, 79, 0.85)',
                            borderRadius: 999,
                            width: `${progressFraction * 100}%`,
                        }}
                    />
                </Box>
            ) : null}
        </div>
    );
};

export const HomePodcastFeedSection = ({
    containerQuery,
}: {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
}) => {
    const serverId = useCurrentServerId();
    const server = useCurrentServer();
    const samoServer = useMemo(
        () => (server?.type === ServerType.SAMO ? getServerById(serverId) : undefined),
        [server?.type, serverId],
    );
    const { play: playPodcast } = usePodcastActions();

    const feedQuery = useQuery({
        enabled: Boolean(samoServer),
        gcTime: 1000 * 60 * 10,
        queryFn: ({ signal }) => fetchSamoHomePodcastFeed(samoServer!, signal),
        queryKey: ['home', 'podcast-feed', samoServer?.id],
        staleTime: 1000 * 60,
    });

    const entries = feedQuery.data ?? [];

    const playEntry = useCallback(
        async (entry: SamoPodcastFeedEntry) => {
            const showId = entry.episode.podcastId;
            if (!samoServer || !showId || !isSamoLongFormServer(samoServer)) {
                return;
            }

            try {
                const showItem = await loadSamoPodcastLibraryItem(samoServer, showId);
                const absEpisode = samoPodcastEpisodeToAbsEpisode(entry.episode);
                const episode =
                    showItem.media?.episodes?.find((candidate) => candidate.id === absEpisode.id) ??
                    absEpisode;

                recordRecentPodcast(showItem, samoServer.id);
                await playPodcast(samoServer, showItem, episode);
            } catch (error) {
                toast.error({
                    message:
                        error instanceof Error ? error.message : 'Could not play this episode.',
                });
            }
        },
        [playPodcast, samoServer],
    );

    const cards = useMemo(
        () =>
            entries.map((entry) => ({
                content: <PodcastFeedCard entry={entry} onPlay={() => void playEntry(entry)} />,
                id: entry.episode.id,
            })),
        [entries, playEntry],
    );

    if (!samoServer) {
        return null;
    }

    if (feedQuery.isPending) {
        return (
            <section>
                <HomeSectionTitle title="Podcast Feed" to={AppRoute.PODCASTS} />
            </section>
        );
    }

    if (!entries.length) {
        return null;
    }

    return (
        <GridCarousel
            cards={cards}
            containerQuery={containerQuery}
            hasNextPage={false}
            onNextPage={() => {}}
            onPrevPage={() => {}}
            rowCount={1}
            title={<HomeSectionTitle title="Podcast Feed" to={AppRoute.PODCASTS} />}
        />
    );
};
