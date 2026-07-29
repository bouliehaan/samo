import { useSuspenseQuery, UseSuspenseQueryResult } from '@tanstack/react-query';
import { forwardRef, Fragment, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import styles from './album-artist-detail-header.module.css';

import { artistsQueries } from '/@/renderer/features/artists/api/artists-api';
import { getArtistAlbumsGrouped } from '/@/renderer/features/artists/hooks/use-artist-albums-grouped';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import {
    LibraryHeader,
    LibraryHeaderMenu,
} from '/@/renderer/features/shared/components/library-header';
import { useSetFavorite } from '/@/renderer/features/shared/hooks/use-set-favorite';
import { AppRoute } from '/@/renderer/router/routes';
import { recordRecentArtist, useAppStore, useCurrentServer } from '/@/renderer/store';
import { useArtistReleaseTypeItems, usePlayButtonBehavior } from '/@/renderer/store/settings.store';
import { formatDurationString } from '/@/renderer/utils';
import { SEPARATOR_STRING, sortAlbumList } from '/@/shared/api/utils';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { AlbumListResponse, LibraryItem } from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';

interface AlbumArtistDetailHeaderProps {
    albumsQuery: UseSuspenseQueryResult<AlbumListResponse, Error>;
}

export const AlbumArtistDetailHeader = forwardRef<HTMLDivElement, AlbumArtistDetailHeaderProps>(
    ({ albumsQuery }, ref) => {
        const { albumArtistId, artistId } = useParams() as {
            albumArtistId?: string;
            artistId?: string;
        };
        const routeId = (artistId || albumArtistId) as string;
        const server = useCurrentServer();
        const { t } = useTranslation();
        const detailQuery = useSuspenseQuery(
            artistsQueries.albumArtistDetail({
                query: { id: routeId },
                serverId: server?.id,
            }),
        );

        const albumCount = detailQuery.data?.albumCount;
        const songCount = detailQuery.data?.songCount;
        const duration = detailQuery.data?.duration;
        const durationEnabled = duration !== null && duration !== undefined;

        const metadataItems = [
            {
                enabled: albumCount !== null && albumCount !== undefined,
                id: 'albumCount',
                secondary: false,
                value: t('entity.albumWithCount', { count: albumCount || 0 }),
            },
            {
                enabled: songCount !== null && songCount !== undefined,
                id: 'songCount',
                secondary: false,
                value: t('entity.trackWithCount', { count: songCount || 0 }),
            },
            {
                enabled: durationEnabled,
                id: 'duration',
                secondary: true,
                value: durationEnabled && formatDurationString(duration),
            },
        ];

        const { addToQueueByFetch } = usePlayer();
        const playButtonBehavior = usePlayButtonBehavior();
        const setFavorite = useSetFavorite();

        const albumArtistDetailSort = useAppStore((state) => state.albumArtistDetailSort);
        const sortBy = albumArtistDetailSort.sortBy;
        const sortOrder = albumArtistDetailSort.sortOrder;
        const groupingType = albumArtistDetailSort.groupingType;
        const artistReleaseTypeItems = useArtistReleaseTypeItems();

        const handlePlay = useCallback(
            (type?: Play) => {
                if (!server?.id || !routeId) return;
                if (detailQuery.data) {
                    recordRecentArtist(detailQuery.data);
                }

                const albums = albumsQuery.data?.items || [];
                const sortedAlbums = sortAlbumList(albums, sortBy, sortOrder);

                const { flatSortedAlbums } = getArtistAlbumsGrouped(
                    sortedAlbums,
                    routeId,
                    groupingType,
                    artistReleaseTypeItems,
                    t,
                );

                const albumIds = flatSortedAlbums.map((album) => album.id);
                if (albumIds.length === 0) return;
                addToQueueByFetch(
                    server.id,
                    albumIds,
                    LibraryItem.ALBUM,
                    type || playButtonBehavior,
                );
            },
            [
                addToQueueByFetch,
                albumsQuery.data?.items,
                artistReleaseTypeItems,
                detailQuery.data,
                groupingType,
                playButtonBehavior,
                routeId,
                server.id,
                sortBy,
                sortOrder,
                t,
            ],
        );

        const handleFavorite = useCallback(() => {
            if (!detailQuery.data) return;
            setFavorite(
                detailQuery.data._serverId,
                [detailQuery.data.id],
                LibraryItem.ALBUM_ARTIST,
                !detailQuery.data.userFavorite,
            );
        }, [detailQuery.data, setFavorite]);

        const handleMoreOptions = useCallback(
            (e: React.MouseEvent<HTMLButtonElement>) => {
                if (!detailQuery.data) return;
                ContextMenuController.call({
                    cmd: { items: [detailQuery.data], type: LibraryItem.ALBUM_ARTIST },
                    event: e,
                });
            },
            [detailQuery.data],
        );

        return (
            <LibraryHeader
                item={{
                    imageId: detailQuery.data?.imageId,
                    imageUrl: detailQuery.data?.imageUrl,
                    route: AppRoute.LIBRARY_ALBUM_ARTISTS,
                    type: LibraryItem.ALBUM_ARTIST,
                }}
                ref={ref}
                title={detailQuery.data?.name || ''}
            >
                <Stack gap="md" w="100%">
                    <Group className={styles.metadataGroup}>
                        {metadataItems
                            .filter((i) => i.enabled)
                            .map((item, index) => (
                                <Fragment key={`item-${item.id}-${index}`}>
                                    {index > 0 && (
                                        <Text isMuted isNoSelect>
                                            {SEPARATOR_STRING}
                                        </Text>
                                    )}
                                    <Text isMuted={item.secondary}>{item.value}</Text>
                                </Fragment>
                            ))}
                    </Group>
                    <LibraryHeaderMenu
                        favorite={detailQuery.data?.userFavorite}
                        onFavorite={handleFavorite}
                        onMore={handleMoreOptions}
                        onPlay={(type) => handlePlay(type)}
                        onShuffle={() => handlePlay(Play.SHUFFLE)}
                    />
                </Stack>
            </LibraryHeader>
        );
    },
);
