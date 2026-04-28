import { Box, SimpleGrid, Stack } from '@mantine/core';
import { useQueries, useQuery } from '@tanstack/react-query';
import { generatePath, useNavigate } from 'react-router';

import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { AppRoute } from '/@/renderer/router/routes';
import { useAudiobookshelfServer } from '/@/renderer/store';
import { AudiobookshelfLibraryItem } from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { Image } from '/@/shared/components/image/image';
import { Text } from '/@/shared/components/text/text';

const podcastTitle = (item: AudiobookshelfLibraryItem) =>
    item.media?.metadata?.title || item.name || 'Untitled podcast';

const podcastAuthor = (item: AudiobookshelfLibraryItem) => {
    const meta = item.media?.metadata;
    return meta?.author || meta?.authors?.map((a) => a.name).join(', ') || '';
};

const PodcastCover = ({ item }: { item: AudiobookshelfLibraryItem }) => {
    const server = useAudiobookshelfServer();

    const coverQuery = useQuery({
        enabled: Boolean(server?.id && item.id),
        queryFn: async () =>
            (await audiobookshelfController.getItemCoverDataUrl(server!, item.id)) ?? null,
        queryKey: ['audiobookshelf', 'cover', server?.id, item.id],
        staleTime: 1000 * 60 * 60,
    });

    return (
        <Image
            alt={podcastTitle(item)}
            enableAnimation
            enableViewport
            imageContainerProps={{
                style: {
                    // Podcast art is square, unlike audiobook covers (2:3).
                    aspectRatio: '1 / 1',
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                },
            }}
            src={coverQuery.data ?? undefined}
            unloaderIcon="album"
        />
    );
};

const PodcastCard = ({
    item,
    onOpen,
}: {
    item: AudiobookshelfLibraryItem;
    onOpen: (item: AudiobookshelfLibraryItem) => void;
}) => {
    const title = podcastTitle(item);
    const author = podcastAuthor(item);

    return (
        <button
            aria-label={`Open ${title}`}
            onClick={() => onOpen(item)}
            style={{
                background: 'transparent',
                border: 0,
                color: 'inherit',
                cursor: 'pointer',
                display: 'block',
                padding: 0,
                textAlign: 'left',
                width: '100%',
            }}
            type="button"
        >
            <Stack gap="xs">
                <PodcastCover item={item} />
                <Stack gap={2}>
                    <Text fw={600} lineClamp={2} size="sm">
                        {title}
                    </Text>
                    {author ? (
                        <Text isMuted lineClamp={1} size="xs">
                            {author}
                        </Text>
                    ) : null}
                    {typeof item.numEpisodes === 'number' && item.numEpisodes > 0 ? (
                        <Text isMuted size="xs">
                            {item.numEpisodes} episode{item.numEpisodes === 1 ? '' : 's'}
                        </Text>
                    ) : null}
                </Stack>
            </Stack>
        </button>
    );
};

const PodcastsRoute = () => {
    const server = useAudiobookshelfServer();
    const navigate = useNavigate();

    const librariesQuery = useQuery({
        enabled: Boolean(server),
        queryFn: () => audiobookshelfController.getLibraries(server!),
        queryKey: ['audiobookshelf', 'libraries', server?.id],
    });

    const podcastLibraries =
        librariesQuery.data?.libraries.filter((library) => library.mediaType === 'podcast') ?? [];

    const itemQueries = useQueries({
        queries: podcastLibraries.map((library) => ({
            enabled: Boolean(server?.id),
            queryFn: () => audiobookshelfController.getLibraryItems(server!, library.id),
            queryKey: ['audiobookshelf', 'library-items', server?.id, library.id],
        })),
    });

    const items = itemQueries.flatMap((query) => query.data?.results ?? []);
    const isLoading =
        librariesQuery.isLoading ||
        itemQueries.some((query) => query.isLoading || query.isPending);

    const handleOpen = (item: AudiobookshelfLibraryItem) => {
        navigate(generatePath(AppRoute.PODCASTS_DETAIL, { itemId: item.id }));
    };

    return (
        <AnimatedPage>
            <Box h="100%" style={{ overflowY: 'auto' }}>
                <Stack gap="xl" p="2rem" pb="6rem">
                    <Stack gap={4}>
                        <Text fw={700} size="xl">
                            Podcasts
                        </Text>
                        <Text isMuted>Browse your Audiobookshelf podcasts.</Text>
                    </Stack>

                    {!server ? (
                        <Text isMuted>Add an Audiobookshelf server to browse podcasts.</Text>
                    ) : isLoading ? (
                        <Text isMuted>Loading podcasts…</Text>
                    ) : !items.length ? (
                        <Text isMuted>No podcasts found.</Text>
                    ) : (
                        <SimpleGrid cols={{ base: 2, lg: 6, md: 5, sm: 3, xl: 7 }} spacing="lg">
                            {items.map((item) => (
                                <Box key={item.id}>
                                    <PodcastCard item={item} onOpen={handleOpen} />
                                </Box>
                            ))}
                        </SimpleGrid>
                    )}
                </Stack>
            </Box>
        </AnimatedPage>
    );
};

const PodcastsRouteWithBoundary = () => {
    return (
        <PageErrorBoundary>
            <PodcastsRoute />
        </PageErrorBoundary>
    );
};

export default PodcastsRouteWithBoundary;
