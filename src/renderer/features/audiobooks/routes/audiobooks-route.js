import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Box, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { useAudiobookshelfServer } from '/@/renderer/store';
import { useAudiobookActions } from '/@/renderer/store/audiobook.store';
import { useIsLibraryFavorite, useLibraryFavoritesActions, } from '/@/renderer/store/library-favorites.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Image } from '/@/shared/components/image/image';
import { Text } from '/@/shared/components/text/text';
const getAudiobookTitle = (item) => item.media?.metadata?.title || item.name || 'Untitled audiobook';
const getAudiobookAuthor = (item) => {
    const metadata = item.media?.metadata;
    return metadata?.author || metadata?.authors?.map((author) => author.name).join(', ') || '';
};
const getAudiobookSearchText = (item) => {
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
const AudiobookCover = ({ item }) => {
    const server = useAudiobookshelfServer();
    const coverQuery = useQuery({
        enabled: Boolean(server?.id && item.id),
        queryFn: () => audiobookshelfController.getItemCoverDataUrl(server, item.id),
        queryKey: ['audiobookshelf', 'cover', server?.id, item.id],
        staleTime: 1000 * 60 * 60,
    });
    return (_jsx(Image, { alt: getAudiobookTitle(item), enableAnimation: true, enableViewport: true, imageContainerProps: {
            style: {
                aspectRatio: '1 / 1',
                background: 'var(--theme-colors-surface)',
                borderRadius: '0.75rem',
                overflow: 'hidden',
            },
        }, src: coverQuery.data, style: { objectFit: 'cover', objectPosition: 'center' }, unloaderIcon: "album" }));
};
const AudiobookCard = ({ item, onPlay, server, serverId, }) => {
    const title = getAudiobookTitle(item);
    const author = getAudiobookAuthor(item);
    const year = item.media?.metadata?.publishedYear;
    const isFavorite = useIsLibraryFavorite('audiobook', serverId, item.id);
    const { toggle: toggleFavorite } = useLibraryFavoritesActions();
    return (_jsxs(Stack, { gap: "xs", onClick: () => onPlay(item), onContextMenu: (event) => {
            event.preventDefault();
            if (!server)
                return;
            ContextMenuController.call({
                cmd: { items: [item], server, type: 'audiobook' },
                event,
            });
        }, onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onPlay(item);
            }
        }, role: "button", style: { cursor: 'pointer' }, tabIndex: 0, children: [_jsxs(Box, { style: { position: 'relative' }, children: [_jsx(AudiobookCover, { item: item }), _jsx(ActionIcon, { "aria-label": isFavorite ? `Remove ${title} from favorites` : `Add ${title} to favorites`, icon: "favorite", iconProps: isFavorite ? { color: 'primary', fill: 'primary' } : undefined, onClick: (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            if (!serverId)
                                return;
                            toggleFavorite('audiobook', serverId, item.id);
                        }, size: "sm", style: {
                            background: 'transparent',
                            position: 'absolute',
                            right: 6,
                            top: 6,
                        }, tooltip: {
                            label: isFavorite ? 'Remove favorite' : 'Add favorite',
                        }, variant: "subtle" })] }), _jsxs(Stack, { gap: 2, children: [_jsx(Text, { fw: 600, lineClamp: 2, size: "sm", children: title }), author ? (_jsx(Text, { isMuted: true, lineClamp: 1, size: "xs", children: author })) : null, year ? (_jsx(Text, { isMuted: true, size: "xs", children: year })) : null] })] }));
};
const AudiobooksRoute = () => {
    const server = useAudiobookshelfServer();
    const { play: playAudiobook } = useAudiobookActions();
    const [searchQuery, setSearchQuery] = useState('');
    const librariesQuery = useQuery({
        enabled: Boolean(server),
        queryFn: () => audiobookshelfController.getLibraries(server),
        queryKey: ['audiobookshelf', 'libraries', server?.id],
    });
    const audiobookLibraries = librariesQuery.data?.libraries.filter((library) => library.mediaType === 'book') ?? [];
    const itemQueries = useQueries({
        queries: audiobookLibraries.map((library) => ({
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
        return items.filter((item) => getAudiobookSearchText(item).includes(trimmedQuery));
    }, [items, searchQuery]);
    const isLoading = librariesQuery.isLoading || itemQueries.some((query) => query.isLoading || query.isPending);
    const handlePlay = (item) => {
        if (!server) {
            return;
        }
        // Delegates session fetch, arbiter claim, and resume-position resolution to the store.
        playAudiobook(server, item);
    };
    return (_jsx(AnimatedPage, { children: _jsx(Box, { h: "100%", style: { overflowY: 'auto' }, children: _jsxs(Stack, { gap: "xl", p: "2rem", pb: "6rem", children: [_jsxs(Stack, { gap: 4, children: [_jsx(Text, { fw: 700, size: "xl", children: "Audiobooks" }), _jsx(Text, { isMuted: true, children: "Browse your Audiobookshelf library." })] }), !server ? (_jsx(Text, { isMuted: true, children: "Add an Audiobookshelf server to browse audiobooks." })) : isLoading ? (_jsx(Text, { isMuted: true, children: "Loading audiobooks\u2026" })) : !items.length ? (_jsx(Text, { isMuted: true, children: "No audiobooks found." })) : (_jsxs(_Fragment, { children: [_jsx(TextInput, { "aria-label": "Search audiobooks", onChange: (event) => setSearchQuery(event.currentTarget.value), placeholder: "Search audiobooks", value: searchQuery }), !filteredItems.length ? (_jsx(Text, { isMuted: true, children: "No matching audiobooks found." })) : (_jsx(SimpleGrid, { cols: { base: 2, lg: 6, md: 5, sm: 3, xl: 7 }, spacing: "lg", children: filteredItems.map((item) => (_jsx(Box, { children: _jsx(AudiobookCard, { item: item, onPlay: handlePlay, server: server, serverId: server?.id }) }, item.id))) }))] }))] }) }) }));
};
const AudiobooksRouteWithBoundary = () => {
    return (_jsx(PageErrorBoundary, { children: _jsx(AudiobooksRoute, {}) }));
};
export default AudiobooksRouteWithBoundary;
