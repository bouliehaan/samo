import { Box, Group, Stack } from '@mantine/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import formatDuration from 'format-duration';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router';

import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import {
    isSamoBackedLibraryItem,
    isSamoLongFormServer,
    loadSamoPodcastLibraryItem,
    useLongFormMediaServer,
} from '/@/renderer/api/samo/samo-long-form';
import { samoFetch } from '/@/renderer/api/samo/samo-fetch';
import { attachSamoPodcastShowFeed } from '@samo/core/server';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import {
    useIsLibraryFavorite,
    useLibraryFavoritesActions,
} from '/@/renderer/store/library-favorites.store';
import { usePodcastActions } from '/@/renderer/store/podcast.store';
import {
    AudiobookshelfLibraryItem,
    AudiobookshelfPodcastEpisode,
} from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import {
    buildSamoAuthenticatedImageRequest,
    ServerType,
} from '@samo/core/server';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Button } from '/@/shared/components/button/button';
import { Image } from '/@/shared/components/image/image';
import { Text } from '/@/shared/components/text/text';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { toast } from '/@/shared/components/toast/toast';

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

const PodcastCover = ({
    alt,
    imageUrl,
    itemId,
}: {
    alt: string;
    imageUrl?: string;
    itemId: string;
}) => {
    const server = useLongFormMediaServer();

    const coverQuery = useQuery({
        enabled: Boolean(server?.id && itemId && !isSamoLongFormServer(server)),
        queryFn: async () =>
            (await audiobookshelfController.getItemCoverDataUrl(server!, itemId)) ?? null,
        queryKey: ['audiobookshelf', 'cover', server?.id, itemId],
        staleTime: 1000 * 60 * 60,
    });

    const coverSrc = isSamoLongFormServer(server)
        ? imageUrl
        : (coverQuery.data ?? undefined);

    const imageRequest = useMemo(() => {
        if (!isSamoLongFormServer(server) || !coverSrc) {
            return undefined;
        }

        return buildSamoAuthenticatedImageRequest(
            {
                credential: server!.credential,
                ndCredential: server!.ndCredential,
                type: ServerType.SAMO,
                url: server!.url,
            },
            coverSrc,
            ['samo', server!.id, 'podcast-cover', itemId].join(':'),
        );
    }, [coverSrc, itemId, server]);

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
            imageRequest={imageRequest}
            src={coverSrc ?? undefined}
            unloaderIcon="album"
        />
    );
};

const getEpisodeProgressFraction = (episode: AudiobookshelfPodcastEpisode) => {
    if (episode.completed) {
        return 1;
    }

    const duration = episode.duration ?? episode.audioFile?.duration;
    const position = episode.progressSeconds;

    if (!duration || !position || position <= 0) {
        return undefined;
    }

    const fraction = position / duration;
    if (fraction <= 0.02) {
        return undefined;
    }

    return Math.min(1, fraction);
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
    const progressFraction = getEpisodeProgressFraction(episode);

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
                <Group gap="xs" justify="space-between" wrap="nowrap">
                    <Text fw={600} lineClamp={1} size="sm" style={{ flex: 1, minWidth: 0 }}>
                        {episode.title || 'Untitled episode'}
                    </Text>
                    {episode.completed ? (
                        <Text c="primary" size="xs">
                            Played
                        </Text>
                    ) : null}
                </Group>
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
                {progressFraction !== undefined ? (
                    <Box
                        h={3}
                        style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            borderRadius: 999,
                            overflow: 'hidden',
                        }}
                    >
                        <Box
                            h="100%"
                            style={{
                                background: episode.completed
                                    ? 'var(--theme-colors-primary)'
                                    : 'rgba(202, 160, 79, 0.85)',
                                borderRadius: 999,
                                width: `${progressFraction * 100}%`,
                            }}
                        />
                    </Box>
                ) : null}
            </Stack>
        </button>
    );
};

const PodcastDetailRoute = () => {
    const { itemId } = useParams<{ itemId: string }>();
    const server = useLongFormMediaServer();
    const isSamo = isSamoLongFormServer(server);
    const queryClient = useQueryClient();
    const { play: playPodcast } = usePodcastActions();
    const isFavorite = useIsLibraryFavorite('podcast', server?.id, itemId ?? '');
    const { toggle: toggleFavorite } = useLibraryFavoritesActions();
    const [rssFeedUrl, setRssFeedUrl] = useState('');
    const [isLinkingFeed, setIsLinkingFeed] = useState(false);

    const itemQuery = useQuery({
        enabled: Boolean(server?.id && itemId),
        queryFn: () =>
            isSamo
                ? loadSamoPodcastLibraryItem(server!, itemId!)
                : audiobookshelfController.getItem(server!, itemId!),
        queryKey: [isSamo ? 'samo' : 'audiobookshelf', 'item', server?.id, itemId],
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

    const canLinkRss =
        isSamo &&
        isSamoBackedLibraryItem(item) &&
        Boolean(item.samoPath && !item.samoPath.startsWith('samo://')) &&
        !item.samoRssFeed;
    const hasLinkedRss = isSamoBackedLibraryItem(item) && Boolean(item.samoRssFeed?.id);

    const handleLinkRssFeed = async () => {
        if (!server || !itemId || !rssFeedUrl.trim()) return;

        setIsLinkingFeed(true);
        try {
            await attachSamoPodcastShowFeed(
                samoFetch,
                {
                    credential: server.credential,
                    ndCredential: server.ndCredential,
                    type: ServerType.SAMO,
                    url: server.url,
                },
                itemId,
                { url: rssFeedUrl.trim() },
            );
            toast.success({ message: 'RSS feed linked. Episode dates will update from the feed.' });
            await queryClient.invalidateQueries({
                queryKey: ['samo', 'item', server.id, itemId],
            });
        } catch (error) {
            toast.error({
                message: error instanceof Error ? error.message : 'Failed to link RSS feed',
            });
        } finally {
            setIsLinkingFeed(false);
        }
    };

    return (
        <AnimatedPage>
            <Box h="100%" style={{ overflowY: 'auto' }}>
                <Stack gap="xl" p="2rem" pb="6rem">
                    {!server ? (
                        <Text isMuted>Add a Samo or Audiobookshelf server to browse podcasts.</Text>
                    ) : itemQuery.isLoading ? (
                        <Text isMuted>Loading podcast…</Text>
                    ) : !item ? (
                        <Text isMuted>Podcast not found.</Text>
                    ) : (
                        <>
                            <Group align="flex-start" gap="xl" wrap="nowrap">
                                <PodcastCover
                                    alt={podcastTitle(item)}
                                    imageUrl={item.media?.metadata?.imageUrl}
                                    itemId={item.id}
                                />
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
                                    {hasLinkedRss && item.samoRssFeed?.feedUrl ? (
                                        <Text isMuted size="sm">
                                            RSS linked: {item.samoRssFeed.feedUrl}
                                        </Text>
                                    ) : null}
                                    {canLinkRss ? (
                                        <Stack gap="xs" mt="sm">
                                            <Text isMuted size="sm">
                                                Link an RSS feed to fix episode release dates and
                                                receive new episodes while keeping your downloaded
                                                files.
                                            </Text>
                                            <TextInput
                                                onChange={(event) =>
                                                    setRssFeedUrl(event.currentTarget.value)
                                                }
                                                placeholder="https://feeds.example.com/podcast.xml"
                                                value={rssFeedUrl}
                                            />
                                            <Button
                                                disabled={!rssFeedUrl.trim() || isLinkingFeed}
                                                loading={isLinkingFeed}
                                                onClick={() => void handleLinkRssFeed()}
                                            >
                                                Link RSS feed
                                            </Button>
                                        </Stack>
                                    ) : null}
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
