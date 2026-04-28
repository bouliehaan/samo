import { Box, SimpleGrid, Stack } from '@mantine/core';
import { useQueries, useQuery } from '@tanstack/react-query';

import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { useAudiobookshelfServer } from '/@/renderer/store';
import { useAudiobookActions } from '/@/renderer/store/audiobook.store';
import { AudiobookshelfLibraryItem } from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { Image } from '/@/shared/components/image/image';
import { Text } from '/@/shared/components/text/text';

const getAudiobookTitle = (item: AudiobookshelfLibraryItem) =>
    item.media?.metadata?.title || item.name || 'Untitled audiobook';

const getAudiobookAuthor = (item: AudiobookshelfLibraryItem) => {
    const metadata = item.media?.metadata;

    return metadata?.author || metadata?.authors?.map((author) => author.name).join(', ') || '';
};

const AudiobookCover = ({ item }: { item: AudiobookshelfLibraryItem }) => {
    const server = useAudiobookshelfServer();

    const coverQuery = useQuery({
        enabled: Boolean(server?.id && item.id),
        queryFn: () => audiobookshelfController.getItemCoverDataUrl(server!, item.id),
        queryKey: ['audiobookshelf', 'cover', server?.id, item.id],
        staleTime: 1000 * 60 * 60,
    });

    return (
        <Image
            alt={getAudiobookTitle(item)}
            enableAnimation
            enableViewport
            imageContainerProps={{
                style: {
                    aspectRatio: '1 / 1',
                    background: 'var(--theme-colors-surface)',
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                },
            }}
            src={coverQuery.data}
            style={{ objectFit: 'cover', objectPosition: 'center' }}
            unloaderIcon="album"
        />
    );
};

const AudiobookCard = ({
    item,
    onPlay,
}: {
    item: AudiobookshelfLibraryItem;
    onPlay: (item: AudiobookshelfLibraryItem) => void;
}) => {
    const title = getAudiobookTitle(item);
    const author = getAudiobookAuthor(item);
    const year = item.media?.metadata?.publishedYear;

    return (
        <button
            aria-label={`Play ${title}`}
            onClick={() => onPlay(item)}
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
                <AudiobookCover item={item} />
                <Stack gap={2}>
                    <Text fw={600} lineClamp={2} size="sm">
                        {title}
                    </Text>
                    {author ? (
                        <Text isMuted lineClamp={1} size="xs">
                            {author}
                        </Text>
                    ) : null}
                    {year ? (
                        <Text isMuted size="xs">
                            {year}
                        </Text>
                    ) : null}
                </Stack>
            </Stack>
        </button>
    );
};

const AudiobooksRoute = () => {
    const server = useAudiobookshelfServer();
    const { play: playAudiobook } = useAudiobookActions();

    const librariesQuery = useQuery({
        enabled: Boolean(server),
        queryFn: () => audiobookshelfController.getLibraries(server!),
        queryKey: ['audiobookshelf', 'libraries', server?.id],
    });

    const audiobookLibraries =
        librariesQuery.data?.libraries.filter((library) => library.mediaType === 'book') ?? [];

    const itemQueries = useQueries({
        queries: audiobookLibraries.map((library) => ({
            enabled: Boolean(server?.id),
            queryFn: () => audiobookshelfController.getLibraryItems(server!, library.id),
            queryKey: ['audiobookshelf', 'library-items', server?.id, library.id],
        })),
    });

    const items = itemQueries.flatMap((query) => query.data?.results ?? []);
    const isLoading =
        librariesQuery.isLoading || itemQueries.some((query) => query.isLoading || query.isPending);

    const handlePlay = (item: AudiobookshelfLibraryItem) => {
        console.log('[audiobooks-route] handlePlay clicked', {
            hasServer: Boolean(server),
            itemId: item.id,
            title: item.media?.metadata?.title || item.name,
        });

        if (!server) {
            console.warn('[audiobooks-route] no audiobookshelf server configured');
            return;
        }

        // Delegates session fetch, arbiter claim, and resume-position resolution to the store.
        playAudiobook(server, item);
    };

    return (
        <AnimatedPage>
            <Box h="100%" style={{ overflowY: 'auto' }}>
                <Stack gap="xl" p="2rem" pb="6rem">
                    <Stack gap={4}>
                        <Text fw={700} size="xl">
                            Audiobooks
                        </Text>
                        <Text isMuted>Browse your Audiobookshelf library.</Text>
                    </Stack>

                    {!server ? (
                        <Text isMuted>Add an Audiobookshelf server to browse audiobooks.</Text>
                    ) : isLoading ? (
                        <Text isMuted>Loading audiobooks…</Text>
                    ) : !items.length ? (
                        <Text isMuted>No audiobooks found.</Text>
                    ) : (
                        <SimpleGrid cols={{ base: 2, lg: 6, md: 5, sm: 3, xl: 7 }} spacing="lg">
                            {items.map((item) => (
                                <Box key={item.id}>
                                    <AudiobookCard item={item} onPlay={handlePlay} />
                                </Box>
                            ))}
                        </SimpleGrid>
                    )}
                </Stack>
            </Box>
        </AnimatedPage>
    );
};

const AudiobooksRouteWithBoundary = () => {
    return (
        <PageErrorBoundary>
            <AudiobooksRoute />
        </PageErrorBoundary>
    );
};

export default AudiobooksRouteWithBoundary;
