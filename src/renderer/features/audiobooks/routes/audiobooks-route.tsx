import { Box, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';


import {
    listSamoAudiobookLibraryItems,
    useLongFormMediaServer,
} from '/@/renderer/api/samo/samo-long-form';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { useAudiobookActions } from '/@/renderer/store/audiobook.store';
import {
    useIsLibraryFavorite,
    useLibraryFavoritesActions,
} from '/@/renderer/store/library-favorites.store';
import { LongFormLibraryItem } from '/@/shared/api/long-form-types';
import {
    buildSamoAuthenticatedImageRequest,
    ServerType,
} from '@samo/core/server';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Image } from '/@/shared/components/image/image';
import { Text } from '/@/shared/components/text/text';

const getAudiobookTitle = (item: LongFormLibraryItem) =>
    item.media?.metadata?.title || item.name || 'Untitled audiobook';

const getAudiobookAuthor = (item: LongFormLibraryItem) => {
    const metadata = item.media?.metadata;

    return metadata?.author || metadata?.authors?.map((author) => author.name).join(', ') || '';
};

const getAudiobookSearchText = (item: LongFormLibraryItem) => {
    const metadata = item.media?.metadata;

    return [
        getAudiobookTitle(item),
        getAudiobookAuthor(item),
        metadata?.narratorName,
        metadata?.narrators?.join(' '),
        metadata?.publishedYear,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
};

const AudiobookCover = ({ item }: { item: LongFormLibraryItem }) => {
    const server = useLongFormMediaServer();

    const coverSrc = item.media?.metadata?.imageUrl ?? undefined;

    const imageRequest = useMemo(() => {
        if (!server || !coverSrc) {
            return undefined;
        }

        return buildSamoAuthenticatedImageRequest(
            {
                credential: server.credential,
                type: ServerType.SAMO,
                url: server.url,
            },
            coverSrc,
            ['samo', server.id, 'audiobook-cover', item.id].join(':'),
        );
    }, [coverSrc, item.id, server]);

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
            imageRequest={imageRequest}
            src={coverSrc}
            style={{ objectFit: 'cover', objectPosition: 'center' }}
            unloaderIcon="album"
        />
    );
};

const AudiobookCard = ({
    item,
    onPlay,
    server,
    serverId,
}: {
    item: LongFormLibraryItem;
    onPlay: (item: LongFormLibraryItem) => void;
    server: ReturnType<typeof useLongFormMediaServer>;
    serverId: string | undefined;
}) => {
    const title = getAudiobookTitle(item);
    const author = getAudiobookAuthor(item);
    const year = item.media?.metadata?.publishedYear;
    const isFavorite = useIsLibraryFavorite('audiobook', serverId, item.id);
    const { toggle: toggleFavorite } = useLibraryFavoritesActions();

    return (
        <Stack
            gap="xs"
            onClick={() => onPlay(item)}
            onContextMenu={(event) => {
                event.preventDefault();
                if (!server) return;
                ContextMenuController.call({
                    cmd: { items: [item], server, type: 'audiobook' },
                    event,
                });
            }}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onPlay(item);
                }
            }}
            role="button"
            style={{ cursor: 'pointer' }}
            tabIndex={0}
        >
            <Box style={{ position: 'relative' }}>
                <AudiobookCover item={item} />
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
                        toggleFavorite('audiobook', serverId, item.id);
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
                {year ? (
                    <Text isMuted size="xs">
                        {year}
                    </Text>
                ) : null}
            </Stack>
        </Stack>
    );
};

const AudiobooksRoute = () => {
    const server = useLongFormMediaServer();
    const { play: playAudiobook } = useAudiobookActions();
    const [searchQuery, setSearchQuery] = useState('');

    const samoItemsQuery = useQuery({
        enabled: Boolean(server?.id),
        queryFn: () => listSamoAudiobookLibraryItems(server!),
        queryKey: ['samo', 'audiobooks', server?.id],
        staleTime: 1000 * 60 * 5,
    });

    const items = samoItemsQuery.data ?? [];
    const filteredItems = useMemo(() => {
        const trimmedQuery = searchQuery.trim().toLowerCase();
        if (!trimmedQuery) return items;

        return items.filter((item) => getAudiobookSearchText(item).includes(trimmedQuery));
    }, [items, searchQuery]);
    const isLoading = samoItemsQuery.isLoading;

    const handlePlay = (item: LongFormLibraryItem) => {
        if (!server) {
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
                        <Text isMuted>Browse audiobooks from your Samo server.</Text>
                    </Stack>

                    {!server ? (
                        <Text isMuted>Add a Samo server to browse audiobooks.</Text>
                    ) : isLoading ? (
                        <Text isMuted>Loading audiobooks…</Text>
                    ) : !items.length ? (
                        <Text isMuted>No audiobooks found.</Text>
                    ) : (
                        <>
                            <TextInput
                                aria-label="Search audiobooks"
                                onChange={(event) => setSearchQuery(event.currentTarget.value)}
                                placeholder="Search audiobooks"
                                value={searchQuery}
                            />
                            {!filteredItems.length ? (
                                <Text isMuted>No matching audiobooks found.</Text>
                            ) : (
                                <SimpleGrid
                                    cols={{ base: 2, lg: 6, md: 5, sm: 3, xl: 7 }}
                                    spacing="lg"
                                >
                                    {filteredItems.map((item) => (
                                        <Box key={item.id}>
                                            <AudiobookCard
                                                item={item}
                                                onPlay={handlePlay}
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

const AudiobooksRouteWithBoundary = () => {
    return (
        <PageErrorBoundary>
            <AudiobooksRoute />
        </PageErrorBoundary>
    );
};

export default AudiobooksRouteWithBoundary;
