import { Box, Group, Stack } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import formatDuration from 'format-duration';
import { useParams } from 'react-router';

import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { useAudiobookshelfServer } from '/@/renderer/store';
import {
    useIsLibraryFavorite,
    useLibraryFavoritesActions,
} from '/@/renderer/store/library-favorites.store';
import { usePodcastActions } from '/@/renderer/store/podcast.store';
import {
    AudiobookshelfLibraryItem,
    AudiobookshelfPodcastEpisode,
} from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Image } from '/@/shared/components/image/image';
import { Text } from '/@/shared/components/text/text';

const podcastTitle = (item: AudiobookshelfLibraryItem) =>
    item.media?.metadata?.title || item.name || 'Untitled podcast';

const podcastAuthor = (item: AudiobookshelfLibraryItem) => {
    const meta = item.media?.metadata;
    return meta?.author || meta?.authors?.map((a) => a.name).join(', ') || '';
};

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

const formatEpisodeDuration = (episode: AudiobookshelfPodcastEpisode) => {
    const seconds = episode.duration ?? episode.audioFile?.duration;
    if (!seconds || !isFinite(seconds)) return null;
    return formatDuration(seconds * 1000);
};

const PodcastCover = ({ alt, itemId }: { alt: string; itemId: string }) => {
    const server = useAudiobookshelfServer();
    const coverQuery = useQuery({
        enabled: Boolean(server?.id && itemId),
        queryFn: async () =>
            (await audiobookshelfController.getItemCoverDataUrl(server!, itemId)) ?? null,
        queryKey: ['audiobookshelf', 'cover', server?.id, itemId],
        staleTime: 1000 * 60 * 60,
    });

    return (
        <Image
            alt={alt}
            enableAnimation
            imageContainerProps={{
                style: {
                    aspectRatio: '1 / 1',
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                    width: '14rem',
                },
            }}
            src={coverQuery.data ?? undefined}
            unloaderIcon="album"
        />
    );
};

const EpisodeRow = ({
    episode,
    onPlay,
}: {
    episode: AudiobookshelfPodcastEpisode;
    onPlay: (episode: AudiobookshelfPodcastEpisode) => void;
}) => {
    const date = formatEpisodeDate(episode.publishedAt);
    const duration = formatEpisodeDuration(episode);

    return (
        <button
            aria-label={`Play ${episode.title || 'episode'}`}
            onClick={() => onPlay(episode)}
            style={{
                background: 'transparent',
                border: 0,
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                color: 'inherit',
                cursor: 'pointer',
                display: 'block',
                padding: '0.75rem 0',
                textAlign: 'left',
                width: '100%',
            }}
            type="button"
        >
            <Stack gap={4}>
                <Text fw={600} lineClamp={1} size="sm">
                    {episode.title || 'Untitled episode'}
                </Text>
                <Group gap="xs" wrap="nowrap">
                    {date ? (
                        <Text isMuted size="xs">
                            {date}
                        </Text>
                    ) : null}
                    {date && duration ? (
                        <Text isMuted size="xs">
                            ·
                        </Text>
                    ) : null}
                    {duration ? (
                        <Text isMuted size="xs">
                            {duration}
                        </Text>
                    ) : null}
                </Group>
                {episode.subtitle || episode.description ? (
                    <Text isMuted lineClamp={2} size="xs">
                        {episode.subtitle || episode.description}
                    </Text>
                ) : null}
            </Stack>
        </button>
    );
};

const PodcastDetailRoute = () => {
    const { itemId } = useParams<{ itemId: string }>();
    const server = useAudiobookshelfServer();
    const { play: playPodcast } = usePodcastActions();
    const isFavorite = useIsLibraryFavorite('podcast', server?.id, itemId ?? '');
    const { toggle: toggleFavorite } = useLibraryFavoritesActions();

    const itemQuery = useQuery({
        enabled: Boolean(server?.id && itemId),
        queryFn: () => audiobookshelfController.getItem(server!, itemId!),
        queryKey: ['audiobookshelf', 'item', server?.id, itemId],
    });

    const item = itemQuery.data;
    // ABS sorts episodes oldest-first by default; flip to newest-first which is
    // how listeners actually browse a podcast.
    const episodes = (item?.media?.episodes ?? [])
        .slice()
        .sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0));

    const handlePlay = (episode: AudiobookshelfPodcastEpisode) => {
        if (!server || !item) return;
        playPodcast(server, item, episode);
    };

    return (
        <AnimatedPage>
            <Box h="100%" style={{ overflowY: 'auto' }}>
                <Stack gap="xl" p="2rem" pb="6rem">
                    {!server ? (
                        <Text isMuted>Add an Audiobookshelf server to browse podcasts.</Text>
                    ) : itemQuery.isLoading ? (
                        <Text isMuted>Loading podcast…</Text>
                    ) : !item ? (
                        <Text isMuted>Podcast not found.</Text>
                    ) : (
                        <>
                            <Group align="flex-start" gap="xl" wrap="nowrap">
                                <PodcastCover alt={podcastTitle(item)} itemId={item.id} />
                                <Stack gap="sm" style={{ flex: 1, minWidth: 0 }}>
                                    <Text fw={700} size="xl">
                                        {podcastTitle(item)}
                                    </Text>
                                    {podcastAuthor(item) ? (
                                        <Text isMuted size="sm">
                                            {podcastAuthor(item)}
                                        </Text>
                                    ) : null}
                                    {item.media?.metadata?.description ? (
                                        <Text isMuted lineClamp={5} size="sm">
                                            {item.media.metadata.description}
                                        </Text>
                                    ) : null}
                                    <Group gap="xs">
                                        <ActionIcon
                                            aria-label={
                                                isFavorite
                                                    ? `Remove ${podcastTitle(item)} from favorites`
                                                    : `Add ${podcastTitle(item)} to favorites`
                                            }
                                            icon="favorite"
                                            iconProps={
                                                isFavorite
                                                    ? { color: 'primary', fill: 'primary' }
                                                    : undefined
                                            }
                                            onClick={() => {
                                                if (!server?.id || !itemId) return;
                                                toggleFavorite('podcast', server.id, itemId);
                                            }}
                                            tooltip={{
                                                label: isFavorite
                                                    ? 'Remove favorite'
                                                    : 'Add favorite',
                                            }}
                                            variant="subtle"
                                        />
                                    </Group>
                                </Stack>
                            </Group>

                            <Stack gap={0}>
                                <Text fw={600} size="md">
                                    {episodes.length} Episode{episodes.length === 1 ? '' : 's'}
                                </Text>
                                {episodes.length === 0 ? (
                                    <Text isMuted size="sm">
                                        No episodes available.
                                    </Text>
                                ) : (
                                    <Stack gap={0}>
                                        {episodes.map((episode) => (
                                            <EpisodeRow
                                                episode={episode}
                                                key={episode.id}
                                                onPlay={handlePlay}
                                            />
                                        ))}
                                    </Stack>
                                )}
                            </Stack>
                        </>
                    )}
                </Stack>
            </Box>
        </AnimatedPage>
    );
};

const PodcastDetailRouteWithBoundary = () => {
    return (
        <PageErrorBoundary>
            <PodcastDetailRoute />
        </PageErrorBoundary>
    );
};

export default PodcastDetailRouteWithBoundary;
