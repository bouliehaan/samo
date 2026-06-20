import { Box, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { generatePath, useNavigate } from 'react-router';

import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import {
    isSamoLongFormServer,
    listSamoPodcastLibraryItems,
    useLongFormMediaServer,
} from '/@/renderer/api/samo/samo-long-form';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { AppRoute } from '/@/renderer/router/routes';
import { recordRecentPodcast } from '/@/renderer/store';
import {
    useIsLibraryFavorite,
    useLibraryFavoritesActions,
} from '/@/renderer/store/library-favorites.store';
import { AudiobookshelfLibraryItem } from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import {
    buildSamoAuthenticatedImageRequest,
    ServerType,
} from '@samo/core/server';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Image } from '/@/shared/components/image/image';
import { Text } from '/@/shared/components/text/text';

const podcastTitle = (item: AudiobookshelfLibraryItem) =>
    item.media?.metadata?.title || item.name || 'Untitled podcast';

const podcastAuthor = (item: AudiobookshelfLibraryItem) => {
    const meta = item.media?.metadata;
    return meta?.author || meta?.authors?.map((a) => a.name).join(', ') || '';
};

const getPodcastSearchText = (item: AudiobookshelfLibraryItem) =>
    [
        podcastTitle(item),
        podcastAuthor(item),
        item.media?.metadata?.description,
        item.media?.metadata?.genres?.join(' '),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

const PodcastCover = ({ item }: { item: AudiobookshelfLibraryItem }) => {
    const server = useLongFormMediaServer();

    const coverQuery = useQuery({
        enabled: Boolean(server?.id && item.id && !isSamoLongFormServer(server)),
        queryFn: async () =>
            (await audiobookshelfController.getItemCoverDataUrl(server!, item.id)) ?? null,
        queryKey: ['audiobookshelf', 'cover', server?.id, item.id],
        staleTime: 1000 * 60 * 60,
    });

    const coverSrc = isSamoLongFormServer(server)
        ? (item.media?.metadata?.imageUrl ?? undefined)
        : (coverQuery.data ?? undefined);

    const imageRequest = useMemo(() => {
        if (!isSamoLongFormServer(server) || !coverSrc) {
            return undefined;
        }

        return buildSamoAuthenticatedImageRequest(
            {
                credential: server!.credential,
                type: ServerType.SAMO,
                url: server!.url,
            },
            coverSrc,
            ['samo', server!.id, 'podcast-cover', item.id].join(':'),
        );
    }, [coverSrc, item.id, server]);

    return (
        <Image
            alt={podcastTitle(item)}
            enableAnimation
            enableViewport
            imageContainerProps={{
                style: {
                    aspectRatio: '1 / 1',
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                },
            }}
            imageRequest={imageRequest}
            src={coverSrc ?? undefined}
            unloaderIcon="album"
        />
    );
};

const PodcastCard = ({
    item,
    onOpen,
    server,
    serverId,
}: {
    item: AudiobookshelfLibraryItem;
    onOpen: (item: AudiobookshelfLibraryItem) => void;
    server: ReturnType<typeof useLongFormMediaServer>;
    serverId: string | undefined;
}) => {
    const title = podcastTitle(item);
    const author = podcastAuthor(item);
    const isFavorite = useIsLibraryFavorite('podcast', serverId, item.id);
    const { toggle: toggleFavorite } = useLibraryFavoritesActions();

    return (
        <Stack
            gap="xs"
            onClick={() => onOpen(item)}
            onContextMenu={(event) => {
                event.preventDefault();
                if (!server) return;
                ContextMenuController.call({
                    cmd: { items: [item], server, type: 'podcast' },
                    event,
                });
            }}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen(item);
                }
            }}
            role="button"
            style={{ cursor: 'pointer' }}
            tabIndex={0}
        >
            <Box style={{ position: 'relative' }}>
                <PodcastCover item={item} />
                <ActionIcon
                    aria-label={
                        isFavorite ? `Remove ${title} from favorites` : `Add ${title} to favorites`
                    }
                    icon="favorite"
                    iconProps={isFavorite ? { color: 'primary', fill: 'primary' } : undefined}
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!serverId) return;
                        toggleFavorite('podcast', serverId, item.id);
                    }}
                    size="sm"
                    style={{
                        background: 'transparent',
                        position: 'absolute',
                        right: 6,
                        top: 6,
                    }}
                    tooltip={{
                        label: isFavorite ? 'Remove favorite' : 'Add favorite',
                    }}
                    variant="subtle"
                />
            </Box>
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
    );
};

const PodcastsRoute = () => {
    const server = useLongFormMediaServer();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const isSamo = isSamoLongFormServer(server);

    const librariesQuery = useQuery({
        enabled: Boolean(server) && !isSamo,
        queryFn: () => audiobookshelfController.getLibraries(server!),
        queryKey: ['audiobookshelf', 'libraries', server?.id],
    });

    const podcastLibraries =
        librariesQuery.data?.libraries.filter((library) => library.mediaType === 'podcast') ?? [];

    const absItemQueries = useQueries({
        queries: podcastLibraries.map((library) => ({
            enabled: Boolean(server?.id) && !isSamo,
            queryFn: () => audiobookshelfController.getLibraryItems(server!, library.id),
            queryKey: ['audiobookshelf', 'library-items', server?.id, library.id],
        })),
    });

    const samoItemsQuery = useQuery({
        enabled: Boolean(server?.id) && isSamo,
        queryFn: () => listSamoPodcastLibraryItems(server!),
        queryKey: ['samo', 'podcasts', server?.id],
        staleTime: 1000 * 60 * 5,
    });

    const items = isSamo
        ? (samoItemsQuery.data ?? [])
        : absItemQueries.flatMap((query) => query.data?.results ?? []);
    const filteredItems = useMemo(() => {
        const trimmedQuery = searchQuery.trim().toLowerCase();
        if (!trimmedQuery) return items;

        return items.filter((item) => getPodcastSearchText(item).includes(trimmedQuery));
    }, [items, searchQuery]);
    const isLoading = isSamo
        ? samoItemsQuery.isLoading
        : librariesQuery.isLoading || absItemQueries.some((query) => query.isLoading || query.isPending);

    const handleOpen = (item: AudiobookshelfLibraryItem) => {
        if (server) {
            recordRecentPodcast(item, server.id);
        }
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
                        <Text isMuted>
                            {isSamo
                                ? 'Browse podcasts from your Samo server.'
                                : 'Browse your Audiobookshelf podcasts.'}
                        </Text>
                    </Stack>

                    {!server ? (
                        <Text isMuted>Add a Samo or Audiobookshelf server to browse podcasts.</Text>
                    ) : isLoading ? (
                        <Text isMuted>Loading podcasts…</Text>
                    ) : !items.length ? (
                        <Text isMuted>No podcasts found.</Text>
                    ) : (
                        <>
                            <TextInput
                                aria-label="Search podcasts"
                                onChange={(event) => setSearchQuery(event.currentTarget.value)}
                                placeholder="Search podcasts"
                                value={searchQuery}
                            />
                            {!filteredItems.length ? (
                                <Text isMuted>No matching podcasts found.</Text>
                            ) : (
                                <SimpleGrid
                                    cols={{ base: 2, lg: 6, md: 5, sm: 3, xl: 7 }}
                                    spacing="lg"
                                >
                                    {filteredItems.map((item) => (
                                        <Box key={item.id}>
                                            <PodcastCard
                                                item={item}
                                                onOpen={handleOpen}
                                                server={server}
                                                serverId={server?.id}
                                            />
                                        </Box>
                                    ))}
                                </SimpleGrid>
                            )}
                        </>
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
