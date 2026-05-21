import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSuspenseQuery } from '@tanstack/react-query';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath, Link, useParams } from 'react-router';
import styles from './dummy-album-detail-route.module.css';
import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { useItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { LibraryContainer } from '/@/renderer/features/shared/components/library-container';
import { LibraryHeader } from '/@/renderer/features/shared/components/library-header';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { DefaultPlayButton } from '/@/renderer/features/shared/components/play-button';
import { useCreateFavorite } from '/@/renderer/features/shared/mutations/create-favorite-mutation';
import { useDeleteFavorite } from '/@/renderer/features/shared/mutations/delete-favorite-mutation';
import { useFastAverageColor } from '/@/renderer/hooks';
import { queryClient } from '/@/renderer/lib/react-query';
import { AppRoute } from '/@/renderer/router/routes';
import { useCurrentServer } from '/@/renderer/store';
import { usePlayButtonBehavior } from '/@/renderer/store/settings.store';
import { formatDurationString } from '/@/renderer/utils';
import { replaceURLWithHTMLLinks } from '/@/renderer/utils/linkify';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Button } from '/@/shared/components/button/button';
import { Center } from '/@/shared/components/center/center';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Spoiler } from '/@/shared/components/spoiler/spoiler';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';
import { logFn } from '/@/renderer/utils/logger';
const DummyAlbumDetailRoute = () => {
    const { t } = useTranslation();
    const { albumId } = useParams();
    const server = useCurrentServer();
    const queryKey = queryKeys.songs.detail(server?.id || '', albumId);
    const detailQuery = useSuspenseQuery({
        queryFn: ({ signal }) => {
            return api.controller.getSongDetail({
                apiClientProps: { serverId: server?.id || '', signal },
                query: { id: albumId },
            });
        },
        queryKey,
    });
    const { background, colorId } = useFastAverageColor({
        id: albumId,
        src: detailQuery.data?.imageUrl,
        srcLoaded: Boolean(detailQuery.data?.imageUrl),
    });
    const { addToQueueByFetch } = usePlayer();
    const playButtonBehavior = usePlayButtonBehavior();
    const createFavoriteMutation = useCreateFavorite({});
    const deleteFavoriteMutation = useDeleteFavorite({});
    const handleFavorite = async () => {
        if (!detailQuery?.data)
            return;
        const wasFavorite = detailQuery.data.userFavorite;
        try {
            if (wasFavorite) {
                await deleteFavoriteMutation.mutateAsync({
                    apiClientProps: { serverId: detailQuery.data._serverId },
                    query: {
                        id: [detailQuery.data.id],
                        type: LibraryItem.SONG,
                    },
                });
            }
            else {
                await createFavoriteMutation.mutateAsync({
                    apiClientProps: { serverId: detailQuery.data._serverId },
                    query: {
                        id: [detailQuery.data.id],
                        type: LibraryItem.SONG,
                    },
                });
            }
            queryClient.setQueryData(queryKey, {
                ...detailQuery.data,
                userFavorite: !wasFavorite,
            });
        }
        catch (error) {
            logFn.error(error instanceof Error ? error.message : String(error), { meta: { error: error } });
        }
    };
    const showGenres = detailQuery?.data?.genres ? detailQuery?.data?.genres.length !== 0 : false;
    const comment = detailQuery?.data?.comment;
    const handlePlay = () => {
        if (!server?.id)
            return;
        addToQueueByFetch(server.id, [albumId], LibraryItem.SONG, playButtonBehavior);
    };
    const metadataItems = [
        {
            id: 'releaseYear',
            secondary: false,
            value: detailQuery?.data?.releaseYear,
        },
        {
            id: 'duration',
            secondary: false,
            value: detailQuery?.data?.duration && formatDurationString(detailQuery.data.duration),
        },
    ];
    const imageUrl = useItemImageUrl({
        id: detailQuery?.data?.imageId || undefined,
        itemType: LibraryItem.ALBUM,
        type: 'header',
    });
    return (_jsx(AnimatedPage, { children: _jsxs(LibraryContainer, { children: [_jsx(Stack, { children: _jsx(LibraryHeader, { imageUrl: imageUrl, item: {
                            explicitStatus: detailQuery?.data?.explicitStatus ?? null,
                            imageId: detailQuery?.data?.imageId,
                            imageUrl: detailQuery?.data?.imageUrl,
                            route: AppRoute.LIBRARY_SONGS,
                            type: LibraryItem.SONG,
                        }, loading: !background || colorId !== albumId, title: detailQuery?.data?.name || '', children: _jsxs(Stack, { gap: "sm", children: [_jsx(Group, { gap: "sm", children: metadataItems.map((item, index) => (_jsxs(Fragment, { children: [index > 0 && _jsx(Text, { isNoSelect: true, children: "\u2022" }), _jsx(Text, { isMuted: item.secondary, children: item.value })] }, `item-${item.id}-${index}`))) }), _jsx(Group, { gap: "md", mah: "4rem", style: {
                                        overflow: 'hidden',
                                        WebkitBoxOrient: 'vertical',
                                        WebkitLineClamp: 2,
                                    }, children: detailQuery?.data?.albumArtists.map((artist) => (_jsx(Text, { component: Link, fw: 600, isLink: true, size: "md", to: generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL, {
                                            albumArtistId: artist.id,
                                        }), variant: "subtle", children: artist.name }, `artist-${artist.id}`))) })] }) }) }), _jsxs("div", { className: styles.detailContainer, children: [_jsx("section", { children: _jsx(Group, { gap: "sm", justify: "space-between", children: _jsxs(Group, { children: [_jsx(DefaultPlayButton, { onClick: () => handlePlay() }), _jsx(ActionIcon, { icon: "favorite", iconProps: {
                                                fill: detailQuery?.data?.userFavorite
                                                    ? 'primary'
                                                    : undefined,
                                            }, loading: createFavoriteMutation.isPending ||
                                                deleteFavoriteMutation.isPending, onClick: handleFavorite, variant: "subtle" }), _jsx(ActionIcon, { icon: "ellipsisHorizontal", onClick: () => {
                                                if (!detailQuery?.data)
                                                    return;
                                            }, variant: "subtle" })] }) }) }), showGenres && (_jsx("section", { children: _jsx(Group, { gap: "sm", children: detailQuery?.data?.genres?.map((genre) => (_jsx(Button, { component: Link, radius: 0, size: "compact-md", to: generatePath(AppRoute.LIBRARY_GENRES_DETAIL, {
                                        genreId: genre.id,
                                    }), variant: "outline", children: genre.name }, `genre-${genre.id}`))) }) })), comment && (_jsx("section", { children: _jsx(Spoiler, { maxHeight: 75, children: _jsx(Text, { pb: "md", children: replaceURLWithHTMLLinks(comment) }) }) })), _jsx("section", { children: _jsxs(Center, { children: [_jsx(Group, { mr: 5, children: _jsx(Icon, { fill: "error", icon: "error", size: 30 }) }), _jsx("h2", { children: t('error.badAlbum', { postProcess: 'sentenceCase' }) })] }) })] })] }) }, `dummy-album-detail-${albumId}`));
};
const DummyAlbumDetailRouteWithBoundary = () => {
    return (_jsx(PageErrorBoundary, { children: _jsx(DummyAlbumDetailRoute, {}) }));
};
export default DummyAlbumDetailRouteWithBoundary;
