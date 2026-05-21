import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { forwardRef, Fragment, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import styles from './album-detail-header.module.css';
import { queryKeys } from '/@/renderer/api/query-keys';
import { albumQueries } from '/@/renderer/features/albums/api/album-api';
import { JoinedArtists } from '/@/renderer/features/albums/components/joined-artists';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { LibraryHeader, LibraryHeaderMenu, } from '/@/renderer/features/shared/components/library-header';
import { logFn } from '/@/renderer/utils/logger';
import { useSetFavorite } from '/@/renderer/features/shared/hooks/use-set-favorite';
import { songsQueries } from '/@/renderer/features/songs/api/songs-api';
import { AppRoute } from '/@/renderer/router/routes';
import { recordRecentAlbum, useCurrentServer } from '/@/renderer/store';
import { useArtistRadioCount, usePlayButtonBehavior } from '/@/renderer/store/settings.store';
import { formatDurationString, formatPartialIsoDateUTC, formatSizeString } from '/@/renderer/utils';
import { normalizeReleaseTypes } from '/@/renderer/utils/normalize-release-types';
import { Group } from '/@/shared/components/group/group';
import { Separator } from '/@/shared/components/separator/separator';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';
export const AlbumDetailHeader = forwardRef((_props, ref) => {
    const { albumId } = useParams();
    const { t } = useTranslation();
    const server = useCurrentServer();
    const queryClient = useQueryClient();
    const albumRadioCount = useArtistRadioCount();
    const detailQuery = useQuery(albumQueries.detail({ query: { id: albumId }, serverId: server?.id }));
    const { addToQueueByData, addToQueueByFetch } = usePlayer();
    const playButtonBehavior = usePlayButtonBehavior();
    const setFavorite = useSetFavorite();
    const handleFavorite = () => {
        if (!detailQuery?.data)
            return;
        setFavorite(detailQuery.data._serverId, [detailQuery.data.id], LibraryItem.ALBUM, !detailQuery.data.userFavorite);
    };
    const handlePlay = (type) => {
        if (!server?.id || !albumId)
            return;
        if (detailQuery.data) {
            recordRecentAlbum(detailQuery.data);
        }
        addToQueueByFetch(server.id, [albumId], LibraryItem.ALBUM, type || playButtonBehavior);
    };
    const handleMoreOptions = (e) => {
        if (!detailQuery?.data)
            return;
        ContextMenuController.call({
            cmd: { items: [detailQuery.data], type: LibraryItem.ALBUM },
            event: e,
        });
    };
    const handleAlbumRadio = async () => {
        if (!server?.id || !albumId)
            return;
        try {
            const albumRadioSongs = await queryClient.fetchQuery({
                ...songsQueries.albumRadio({
                    query: {
                        albumId: albumId,
                        count: albumRadioCount,
                    },
                    serverId: server.id,
                }),
                queryKey: queryKeys.player.fetch({ albumId: albumId }),
            });
            if (albumRadioSongs && albumRadioSongs.length > 0) {
                addToQueueByData(albumRadioSongs, Play.NOW);
            }
        }
        catch (error) {
            logFn.error('Failed to load album radio', { meta: { error: error } });
        }
    };
    const releaseYear = detailQuery?.data?.releaseYear;
    const releaseDate = detailQuery?.data?.releaseDate;
    const metadataItems = useMemo(() => {
        const items = [];
        const album = detailQuery?.data;
        if (!album)
            return [];
        const originalDifferentFromRelease = album?.originalDate && album?.originalDate !== album?.releaseDate;
        const originalYearDifferentFromRelease = album.originalYear > 0 &&
            album.releaseYear != null &&
            album.originalYear !== album.releaseYear;
        const playCount = album?.playCount;
        const releasePrefix = originalDifferentFromRelease
            ? t('page.albumDetail.released', { postProcess: 'sentenceCase' })
            : '♫';
        const releaseYearPrefix = originalYearDifferentFromRelease
            ? t('page.albumDetail.released', { postProcess: 'sentenceCase' })
            : '♫';
        if (album.originalDate) {
            if (originalDifferentFromRelease) {
                items.push({
                    id: 'originalDate',
                    value: `♫ ${formatPartialIsoDateUTC(album.originalDate)}`,
                });
            }
            if (releaseDate) {
                items.push({
                    id: 'releaseDate',
                    value: `${releasePrefix} ${formatPartialIsoDateUTC(releaseDate)}`,
                });
            }
        }
        else if (album.originalYear > 0) {
            if (originalYearDifferentFromRelease) {
                items.push({
                    id: 'originalYear',
                    value: `♫ ${album.originalYear}`,
                });
            }
            if (releaseDate) {
                items.push({
                    id: 'releaseDate',
                    value: `${releaseYearPrefix} ${formatPartialIsoDateUTC(releaseDate)}`,
                });
            }
            else if (releaseYear != null && releaseYear > 0) {
                items.push({
                    id: 'releaseYear',
                    value: `${releaseYearPrefix} ${releaseYear}`,
                });
            }
        }
        else if (releaseDate) {
            items.push({
                id: 'releaseDate',
                value: `♫ ${formatPartialIsoDateUTC(releaseDate)}`,
            });
        }
        else if (releaseYear != null && releaseYear > 0) {
            items.push({
                id: 'releaseYear',
                value: `♫ ${releaseYear}`,
            });
        }
        items.push(...[
            {
                id: 'songCount',
                value: t('entity.trackWithCount', { count: detailQuery?.data?.songCount || 0 }),
            },
            {
                id: 'duration',
                value: formatDurationString(detailQuery?.data?.duration || 0),
            },
            {
                id: 'explicitStatus',
                value: detailQuery?.data?.explicitStatus,
            },
            {
                id: 'size',
                value: detailQuery?.data?.size
                    ? formatSizeString(detailQuery?.data?.size)
                    : undefined,
            },
            {
                id: 'playCount',
                value: playCount ? t('entity.play', { count: playCount }) : undefined,
            },
        ]);
        return items.filter((item) => !!item.value);
    }, [detailQuery?.data, releaseDate, releaseYear, t]);
    const headerItem = useMemo(() => {
        const album = detailQuery?.data;
        if (!album)
            return null;
        const releaseTypes = album.releaseType
            ? normalizeReleaseTypes([album.releaseType], t)
            : null;
        const releaseTypeText = releaseTypes?.length ? releaseTypes[0] : null;
        if (releaseTypeText) {
            return (_jsxs(Group, { gap: "sm", children: [_jsx(Text, { component: Link, fw: 600, isLink: true, size: "md", to: AppRoute.LIBRARY_ALBUMS, tt: "uppercase", children: releaseTypeText }), album.version && (_jsxs(_Fragment, { children: [_jsx(Text, { fw: 600, isMuted: true, children: _jsx(Separator, {}) }), _jsx(Text, { children: album.version })] }))] }));
        }
        return null;
    }, [detailQuery?.data, t]);
    return (_jsx(Stack, { ref: ref, children: _jsx(LibraryHeader, { item: {
                children: headerItem,
                explicitStatus: detailQuery?.data?.explicitStatus ?? null,
                imageId: detailQuery?.data?.imageId,
                imageUrl: detailQuery?.data?.imageUrl,
                route: AppRoute.LIBRARY_ALBUMS,
                type: LibraryItem.ALBUM,
            }, title: detailQuery?.data?.name || '', children: _jsxs(Stack, { gap: "md", w: "100%", children: [_jsx(Group, { className: styles.metadataGroup, gap: "xs", children: metadataItems.map((item, index) => (_jsxs(Fragment, { children: [index > 0 && (_jsx(Text, { isMuted: true, isNoSelect: true, children: _jsx(Separator, {}) })), _jsx(Text, { fw: 400, children: item.value })] }, item.id))) }), _jsx(Group, { className: styles.metadataGroup, children: _jsx(JoinedArtists, { artistName: detailQuery?.data?.albumArtistName || '', artists: detailQuery?.data?.albumArtists || [] }) }), _jsx(LibraryHeaderMenu, { favorite: detailQuery?.data?.userFavorite, onAlbumRadio: handleAlbumRadio, onFavorite: handleFavorite, onMore: handleMoreOptions, onPlay: (type) => handlePlay(type) })] }) }) }));
});
