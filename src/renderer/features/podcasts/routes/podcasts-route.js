import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Box, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { generatePath, useNavigate } from 'react-router';
import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { AppRoute } from '/@/renderer/router/routes';
import { recordRecentPodcast, useAudiobookshelfServer } from '/@/renderer/store';
import { useIsLibraryFavorite, useLibraryFavoritesActions, } from '/@/renderer/store/library-favorites.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Image } from '/@/shared/components/image/image';
import { Text } from '/@/shared/components/text/text';
const podcastTitle = (item) => item.media?.metadata?.title || item.name || 'Untitled podcast';
const podcastAuthor = (item) => {
    const meta = item.media?.metadata;
    return meta?.author || meta?.authors?.map((a) => a.name).join(', ') || '';
};
const getPodcastSearchText = (item) => [
    podcastTitle(item),
    podcastAuthor(item),
    item.media?.metadata?.description,
    item.media?.metadata?.genres?.join(' '),
]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
const PodcastCover = ({ item }) => {
    const server = useAudiobookshelfServer();
    const coverQuery = useQuery({
        enabled: Boolean(server?.id && item.id),
        queryFn: async () => (await audiobookshelfController.getItemCoverDataUrl(server, item.id)) ?? null,
        queryKey: ['audiobookshelf', 'cover', server?.id, item.id],
        staleTime: 1000 * 60 * 60,
    });
    return (_jsx(Image, { alt: podcastTitle(item), enableAnimation: true, enableViewport: true, imageContainerProps: {
            style: {
                // Podcast art is square, unlike audiobook covers (2:3).
                aspectRatio: '1 / 1',
                borderRadius: '0.75rem',
                overflow: 'hidden',
            },
        }, src: coverQuery.data ?? undefined, unloaderIcon: "album" }));
};
const PodcastCard = ({ item, onOpen, server, serverId, }) => {
    const title = podcastTitle(item);
    const author = podcastAuthor(item);
    const isFavorite = useIsLibraryFavorite('podcast', serverId, item.id);
    const { toggle: toggleFavorite } = useLibraryFavoritesActions();
    return (_jsxs(Stack, { gap: "xs", onClick: () => onOpen(item), onContextMenu: (event) => {
            event.preventDefault();
            if (!server)
                return;
            ContextMenuController.call({
                cmd: { items: [item], server, type: 'podcast' },
                event,
            });
        }, onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpen(item);
            }
        }, role: "button", style: { cursor: 'pointer' }, tabIndex: 0, children: [_jsxs(Box, { style: { position: 'relative' }, children: [_jsx(PodcastCover, { item: item }), _jsx(ActionIcon, { "aria-label": isFavorite ? `Remove ${title} from favorites` : `Add ${title} to favorites`, icon: "favorite", iconProps: isFavorite ? { color: 'primary', fill: 'primary' } : undefined, onClick: (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!serverId)
                                return;
                            toggleFavorite('podcast', serverId, item.id);
                        }, size: "sm", style: {
                            background: 'transparent',
                            position: 'absolute',
                            right: 6,
                            top: 6,
                        }, tooltip: {
                            label: isFavorite ? 'Remove favorite' : 'Add favorite',
                        }, variant: "subtle" })] }), _jsxs(Stack, { gap: 2, children: [_jsx(Text, { fw: 600, lineClamp: 2, size: "sm", children: title }), author ? (_jsx(Text, { isMuted: true, lineClamp: 1, size: "xs", children: author })) : null, typeof item.numEpisodes === 'number' && item.numEpisodes > 0 ? (_jsxs(Text, { isMuted: true, size: "xs", children: [item.numEpisodes, " episode", item.numEpisodes === 1 ? '' : 's'] })) : null] })] }));
};
const PodcastsRoute = () => {
    const server = useAudiobookshelfServer();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const librariesQuery = useQuery({
        enabled: Boolean(server),
        queryFn: () => audiobookshelfController.getLibraries(server),
        queryKey: ['audiobookshelf', 'libraries', server?.id],
    });
    const podcastLibraries = librariesQuery.data?.libraries.filter((library) => library.mediaType === 'podcast') ?? [];
    const itemQueries = useQueries({
        queries: podcastLibraries.map((library) => ({
            enabled: Boolean(server?.id),
            queryFn: () => audiobookshelfController.getLibraryItems(server, library.id),
            queryKey: ['audiobookshelf', 'library-items', server?.id, library.id],
        })),
    });
    const items = itemQueries.flatMap((query) => query.data?.results ?? []);
    const filteredItems = useMemo(() => {
        const trimmedQuery = searchQuery.trim().toLowerCase();
        if (!trimmedQuery)
            return items;
        return items.filter((item) => getPodcastSearchText(item).includes(trimmedQuery));
    }, [items, searchQuery]);
    const isLoading = librariesQuery.isLoading || itemQueries.some((query) => query.isLoading || query.isPending);
    const handleOpen = (item) => {
        if (server) {
            recordRecentPodcast(item, server.id);
        }
        navigate(generatePath(AppRoute.PODCASTS_DETAIL, { itemId: item.id }));
    };
    return (_jsx(AnimatedPage, { children: _jsx(Box, { h: "100%", style: { overflowY: 'auto' }, children: _jsxs(Stack, { gap: "xl", p: "2rem", pb: "6rem", children: [_jsxs(Stack, { gap: 4, children: [_jsx(Text, { fw: 700, size: "xl", children: "Podcasts" }), _jsx(Text, { isMuted: true, children: "Browse your Audiobookshelf podcasts." })] }), !server ? (_jsx(Text, { isMuted: true, children: "Add an Audiobookshelf server to browse podcasts." })) : isLoading ? (_jsx(Text, { isMuted: true, children: "Loading podcasts\u2026" })) : !items.length ? (_jsx(Text, { isMuted: true, children: "No podcasts found." })) : (_jsxs(_Fragment, { children: [_jsx(TextInput, { "aria-label": "Search podcasts", onChange: (event) => setSearchQuery(event.currentTarget.value), placeholder: "Search podcasts", value: searchQuery }), !filteredItems.length ? (_jsx(Text, { isMuted: true, children: "No matching podcasts found." })) : (_jsx(SimpleGrid, { cols: { base: 2, lg: 6, md: 5, sm: 3, xl: 7 }, spacing: "lg", children: filteredItems.map((item) => (_jsx(Box, { children: _jsx(PodcastCard, { item: item, onOpen: handleOpen, server: server, serverId: server?.id }) }, item.id))) }))] }))] }) }) }));
};
const PodcastsRouteWithBoundary = () => {
    return (_jsx(PageErrorBoundary, { children: _jsx(PodcastsRoute, {}) }));
};
export default PodcastsRouteWithBoundary;
