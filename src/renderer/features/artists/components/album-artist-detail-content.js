import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useQuery, useQueryClient, } from '@tanstack/react-query';
import { logFn } from '/@/renderer/utils/logger';
import { motion } from 'motion/react';
import { memo, Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createSearchParams, generatePath, Link, useLocation, useParams } from 'react-router';
import styles from './album-artist-detail-content.module.css';
import { queryKeys } from '/@/renderer/api/query-keys';
import { MemoizedItemCard } from '/@/renderer/components/item-card/item-card';
import { useDefaultItemListControls } from '/@/renderer/components/item-list/helpers/item-list-controls';
import { useGridRows } from '/@/renderer/components/item-list/helpers/use-grid-rows';
import { useItemListColumnReorder } from '/@/renderer/components/item-list/helpers/use-item-list-column-reorder';
import { useItemListColumnResize } from '/@/renderer/components/item-list/helpers/use-item-list-column-resize';
import { SONG_TABLE_COLUMNS } from '/@/renderer/components/item-list/item-table-list/default-columns';
import { ItemTableList } from '/@/renderer/components/item-list/item-table-list/item-table-list';
import { ItemTableListColumn } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { artistsQueries } from '/@/renderer/features/artists/api/artists-api';
import { AlbumArtistGridCarousel } from '/@/renderer/features/artists/components/album-artist-grid-carousel';
import { useIsPlayerFetching, usePlayer } from '/@/renderer/features/player/context/player-context';
import { ListConfigMenu, SONG_DISPLAY_TYPES, } from '/@/renderer/features/shared/components/list-config-menu';
import { CLIENT_SIDE_ALBUM_FILTERS, CLIENT_SIDE_SONG_FILTERS, ListSortByDropdownControlled, } from '/@/renderer/features/shared/components/list-sort-by-dropdown';
import { ListSortOrderToggleButtonControlled } from '/@/renderer/features/shared/components/list-sort-order-toggle-button';
import { LONG_PRESS_PLAY_BEHAVIOR, PlayTooltip, } from '/@/renderer/features/shared/components/play-button-group';
import { usePlayButtonClick } from '/@/renderer/features/shared/hooks/use-play-button-click';
import { searchLibraryItems } from '/@/renderer/features/shared/utils';
import { songsQueries } from '/@/renderer/features/songs/api/songs-api';
import { useContainerQuery } from '/@/renderer/hooks';
import { useGenreRoute } from '/@/renderer/hooks/use-genre-route';
import { AppRoute } from '/@/renderer/router/routes';
import { useAppStore, useCurrentServer, useCurrentServerId, usePlayerSong, } from '/@/renderer/store';
import { useArtistItems, useArtistRadioCount, useExternalLinks, useSettingsStore, } from '/@/renderer/store/settings.store';
import { sanitize } from '/@/renderer/utils/sanitize';
import { sortAlbumList, sortSongList } from '/@/shared/api/utils';
import { ActionIcon, ActionIconGroup } from '/@/shared/components/action-icon/action-icon';
import { Badge } from '/@/shared/components/badge/badge';
import { Button } from '/@/shared/components/button/button';
import { DropdownMenu } from '/@/shared/components/dropdown-menu/dropdown-menu';
import { Grid } from '/@/shared/components/grid/grid';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { SegmentedControl } from '/@/shared/components/segmented-control/segmented-control';
import { Skeleton } from '/@/shared/components/skeleton/skeleton';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Spoiler } from '/@/shared/components/spoiler/spoiler';
import { Stack } from '/@/shared/components/stack/stack';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { TextTitle } from '/@/shared/components/text-title/text-title';
import { Text } from '/@/shared/components/text/text';
import { useDebouncedValue } from '/@/shared/hooks/use-debounced-value';
import { useHotkeys } from '/@/shared/hooks/use-hotkeys';
import { useLocalStorage } from '/@/shared/hooks/use-local-storage';
import { LibraryItem, ServerType, } from '/@/shared/types/domain-types';
import { ItemListKey, ListDisplayType, Play } from '/@/shared/types/types';
const AlbumArtistActionButtons = ({ artistDiscographyLink, artistSongsLink, onArtistRadio, }) => {
    const { t } = useTranslation();
    const isPlayerFetching = useIsPlayerFetching();
    return (_jsx(_Fragment, { children: _jsxs(Group, { gap: "lg", children: [_jsx(Button, { component: Link, p: 0, size: "compact-md", to: artistDiscographyLink, variant: "transparent", children: String(t('page.albumArtistDetail.viewDiscography')).toUpperCase() }), _jsx(Button, { component: Link, p: 0, size: "compact-md", to: artistSongsLink, variant: "transparent", children: String(t('page.albumArtistDetail.viewAllTracks')).toUpperCase() }), onArtistRadio && (_jsx(Button, { disabled: isPlayerFetching, leftSection: isPlayerFetching ? (_jsx(Spinner, { color: "white", size: 16 })) : (_jsx(Icon, { icon: "radio", size: "lg" })), onClick: onArtistRadio, p: 0, size: "compact-md", variant: "transparent", children: String(t('player.artistRadio', {
                        postProcess: 'sentenceCase',
                    })).toUpperCase() }))] }) }));
};
const AlbumArtistMetadataGenres = ({ genres, order }) => {
    const { t } = useTranslation();
    const genrePath = useGenreRoute();
    if (!genres || genres.length === 0)
        return null;
    return (_jsx(Grid.Col, { order: order, span: 12, children: _jsxs(Stack, { gap: "xs", children: [_jsx(Text, { fw: 600, isNoSelect: true, size: "sm", tt: "uppercase", children: t('entity.genre', {
                        count: genres.length,
                    }) }), _jsx(Group, { gap: "sm", children: genres.map((genre) => (_jsx(Button, { component: Link, radius: "md", size: "compact-md", to: generatePath(genrePath, {
                            albumArtistId: null,
                            albumId: null,
                            artistId: null,
                            genreId: genre.id,
                            itemId: null,
                            itemType: null,
                            playlistId: null,
                        }), variant: "outline", children: genre.name }, `genre-${genre.id}`))) })] }) }));
};
const AlbumArtistMetadataBiography = ({ artistName, order, routeId, }) => {
    const { t } = useTranslation();
    const server = useCurrentServer();
    const artistInfoQuery = useQuery({
        ...artistsQueries.albumArtistInfo({
            query: { id: routeId, limit: 10 },
            serverId: server?.id,
        }),
        enabled: Boolean(server?.id && routeId),
    });
    const detailQuery = useQuery({
        ...artistsQueries.albumArtistDetail({
            query: { id: routeId },
            serverId: server?.id,
        }),
        enabled: Boolean(server?.id && routeId),
    });
    const biography = artistInfoQuery.data?.biography || detailQuery.data?.biography;
    const isLoading = !biography && (artistInfoQuery.isLoading || detailQuery.isLoading);
    const sanitizedBiography = biography ? sanitize(biography) : '';
    if (isLoading) {
        return (_jsx(Grid.Col, { order: order, span: 12, children: _jsxs("section", { style: { maxWidth: '1280px' }, children: [_jsx(TextTitle, { fw: 700, order: 3, children: t('page.albumArtistDetail.about', {
                            artist: artistName,
                        }) }), _jsxs(Stack, { gap: "xs", children: [_jsx(Skeleton, { enableAnimation: true, height: "1rem", width: "100%" }), _jsx(Skeleton, { enableAnimation: true, height: "1rem", width: "98%" }), _jsx(Skeleton, { enableAnimation: true, height: "1rem", width: "60%" })] })] }) }));
    }
    if (!biography) {
        return null;
    }
    return (_jsx(Grid.Col, { order: order, span: 12, children: _jsxs("section", { style: { maxWidth: '1280px' }, children: [_jsx(TextTitle, { fw: 700, order: 3, children: t('page.albumArtistDetail.about', {
                        artist: artistName,
                    }) }), _jsx(Spoiler, { children: _jsx(Text, { dangerouslySetInnerHTML: { __html: sanitizedBiography } }) })] }) }));
};
const TABLE_ROW_HEIGHT = {
    compact: 40,
    default: 64,
    large: 88,
};
const TABLE_HEADER_HEIGHT = 40;
function getTableRowHeight(size) {
    return size ? TABLE_ROW_HEIGHT[size] : TABLE_ROW_HEIGHT.default;
}
const SongTableListContainer = ({ children, enableHeader = true, itemCount, maxRows = 5, tableSize = 'default', }) => {
    const rowHeight = getTableRowHeight(tableSize);
    const headerOffset = enableHeader ? TABLE_HEADER_HEIGHT : 0;
    const height = headerOffset + rowHeight * Math.min(itemCount, maxRows);
    return _jsx("div", { style: { height }, children: children });
};
const AlbumArtistMetadataTopSongsContent = ({ detailQuery, order, routeId, }) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 300);
    const [topSongsQueryType, setTopSongsQueryType] = useLocalStorage({
        defaultValue: 'community',
        key: 'album-artist-top-songs-query-type',
    });
    const tableConfig = useSettingsStore((state) => state.lists[ItemListKey.SONG]?.table);
    const currentSong = usePlayerSong();
    const player = usePlayer();
    const serverId = useCurrentServerId();
    const server = useCurrentServer();
    const canStartQuery = server?.type === ServerType.JELLYFIN || !!detailQuery.data?.name;
    const topSongsQuery = useQuery({
        ...artistsQueries.topSongs({
            query: {
                artist: detailQuery.data?.name || '',
                artistId: routeId,
                type: topSongsQueryType,
            },
            serverId: serverId,
        }),
        enabled: canStartQuery,
    });
    const songs = useMemo(() => topSongsQuery.data?.items || [], [topSongsQuery.data?.items]);
    const columns = useMemo(() => {
        return tableConfig?.columns || [];
    }, [tableConfig?.columns]);
    const filteredSongs = useMemo(() => {
        return searchLibraryItems(songs, debouncedSearchTerm, LibraryItem.SONG);
    }, [songs, debouncedSearchTerm]);
    const { handleColumnReordered } = useItemListColumnReorder({
        itemListKey: ItemListKey.SONG,
    });
    const { handleColumnResized } = useItemListColumnResize({
        itemListKey: ItemListKey.SONG,
    });
    const overrideControls = useMemo(() => {
        return {
            onDoubleClick: ({ index, internalState, item, meta }) => {
                if (!item) {
                    return;
                }
                const playType = meta?.playType || Play.NOW;
                const items = internalState?.getData();
                if (index !== undefined) {
                    player.addToQueueByData(items, playType, item.id);
                }
            },
        };
    }, [player]);
    const handlePlay = useCallback((playType) => {
        if (songs.length === 0)
            return;
        player.addToQueueByData(songs, playType);
    }, [songs, player]);
    const handlePlayNext = usePlayButtonClick({
        onClick: () => handlePlay(Play.NEXT),
        onLongPress: () => handlePlay(LONG_PRESS_PLAY_BEHAVIOR[Play.NEXT]),
    });
    const handlePlayNow = usePlayButtonClick({
        onClick: () => handlePlay(Play.NOW),
        onLongPress: () => handlePlay(LONG_PRESS_PLAY_BEHAVIOR[Play.NOW]),
    });
    const handlePlayLast = usePlayButtonClick({
        onClick: () => handlePlay(Play.LAST),
        onLongPress: () => handlePlay(LONG_PRESS_PLAY_BEHAVIOR[Play.LAST]),
    });
    const isLoading = topSongsQuery.isLoading || !topSongsQuery.data;
    if (!isLoading && !tableConfig)
        return null;
    if (!isLoading && songs.length === 0)
        return null;
    const currentSongId = currentSong?.id;
    return (_jsx(Grid.Col, { order: order, span: 12, children: _jsx("section", { children: _jsxs(Stack, { gap: "md", children: [_jsxs("div", { className: styles.albumSectionTitle, children: [_jsxs(Group, { children: [_jsx(TextTitle, { fw: 700, order: 3, children: t('page.albumArtistDetail.topSongs', {
                                            postProcess: 'sentenceCase',
                                        }) }), !isLoading && _jsx(Badge, { children: songs.length })] }), _jsxs("div", { className: styles.albumSectionDividerContainer, children: [_jsx("div", { className: styles.albumSectionDivider }), _jsx(Button, { component: Link, size: "compact-md", to: generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL_TOP_SONGS, {
                                            albumArtistId: routeId,
                                        }), uppercase: true, variant: "subtle", children: t('page.albumArtistDetail.viewAll', {
                                            postProcess: 'sentenceCase',
                                        }) }), songs.length > 0 && (_jsxs(ActionIconGroup, { children: [_jsx(PlayTooltip, { type: Play.NOW, children: _jsx(ActionIcon, { icon: "mediaPlay", iconProps: { size: 'md' }, size: "xs", variant: "subtle", ...handlePlayNow.handlers, ...handlePlayNow.props, disabled: isLoading }) }), _jsx(PlayTooltip, { type: Play.NEXT, children: _jsx(ActionIcon, { icon: "mediaPlayNext", iconProps: { size: 'md' }, size: "xs", variant: "subtle", ...handlePlayNext.handlers, ...handlePlayNext.props, disabled: isLoading }) }), _jsx(PlayTooltip, { type: Play.LAST, children: _jsx(ActionIcon, { icon: "mediaPlayLast", iconProps: { size: 'md' }, size: "xs", variant: "subtle", ...handlePlayLast.handlers, ...handlePlayLast.props, disabled: isLoading }) })] }))] })] }), isLoading ? (_jsx(Group, { justify: "center", py: "md", children: _jsx(Spinner, { container: true }) })) : tableConfig ? (_jsxs(_Fragment, { children: [_jsxs(Group, { gap: "sm", w: "100%", children: [_jsx(TextInput, { flex: 1, leftSection: _jsx(Icon, { icon: "search" }), onChange: (e) => setSearchTerm(e.target.value), placeholder: t('common.search', {
                                            postProcess: 'sentenceCase',
                                        }), radius: "xl", rightSection: searchTerm ? (_jsx(ActionIcon, { icon: "x", onClick: () => setSearchTerm(''), size: "sm", variant: "transparent" })) : null, styles: {
                                            input: {
                                                background: 'transparent',
                                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                            },
                                        }, value: searchTerm }), _jsx(SegmentedControl, { data: [
                                            {
                                                label: t('page.albumArtistDetail.topSongsCommunity', {
                                                    postProcess: 'sentenceCase',
                                                }),
                                                value: 'community',
                                            },
                                            {
                                                label: t('page.albumArtistDetail.topSongsPersonal', {
                                                    postProcess: 'sentenceCase',
                                                }),
                                                value: 'personal',
                                            },
                                        ], onChange: (value) => setTopSongsQueryType(value), size: "xs", value: topSongsQueryType }), _jsx(ListConfigMenu, { displayTypes: [
                                            { hidden: true, value: ListDisplayType.GRID },
                                            ...SONG_DISPLAY_TYPES,
                                        ], listKey: ItemListKey.SONG, optionsConfig: {
                                            table: {
                                                itemsPerPage: { hidden: true },
                                                pagination: { hidden: true },
                                            },
                                        }, tableColumnsData: SONG_TABLE_COLUMNS })] }), _jsx(SongTableListContainer, { enableHeader: tableConfig.enableHeader, itemCount: filteredSongs.length, maxRows: 5, tableSize: tableConfig.size, children: _jsx(ItemTableList, { activeRowId: currentSongId, autoFitColumns: tableConfig.autoFitColumns, CellComponent: ItemTableListColumn, columns: columns, data: filteredSongs, enableAlternateRowColors: tableConfig.enableAlternateRowColors, enableDrag: true, enableDragScroll: false, enableExpansion: false, enableHeader: tableConfig.enableHeader, enableHorizontalBorders: tableConfig.enableHorizontalBorders, enableRowHoverHighlight: tableConfig.enableRowHoverHighlight, enableSelection: true, enableSelectionDialog: false, enableVerticalBorders: tableConfig.enableVerticalBorders, itemType: LibraryItem.SONG, onColumnReordered: handleColumnReordered, onColumnResized: handleColumnResized, overrideControls: overrideControls, size: tableConfig.size }) })] })) : null] }) }) }));
};
const AlbumArtistMetadataTopSongs = ({ detailQuery, order, routeId, }) => {
    const server = useCurrentServer();
    const location = useLocation();
    const artistName = location.state?.item?.name || detailQuery.data?.name;
    const canStartQuery = server?.type === ServerType.JELLYFIN || !!artistName;
    return (_jsx(Suspense, { fallback: null, children: canStartQuery ? (_jsx(AlbumArtistMetadataTopSongsContent, { detailQuery: detailQuery, order: order, routeId: routeId })) : null }));
};
const AlbumArtistMetadataFavoriteSongs = ({ order, routeId, }) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 300);
    const albumArtistDetailFavoriteSongsSort = useAppStore((state) => state.albumArtistDetailFavoriteSongsSort);
    const setAlbumArtistDetailFavoriteSongsSort = useAppStore((state) => state.actions.setAlbumArtistDetailFavoriteSongsSort);
    const sortBy = albumArtistDetailFavoriteSongsSort.sortBy;
    const sortOrder = albumArtistDetailFavoriteSongsSort.sortOrder;
    const tableConfig = useSettingsStore((state) => state.lists[ItemListKey.SONG]?.table);
    const currentSong = usePlayerSong();
    const player = usePlayer();
    const serverId = useCurrentServerId();
    const favoriteSongsQuery = useQuery({
        ...artistsQueries.favoriteSongs({
            query: {
                artistId: routeId,
            },
            serverId: serverId,
        }),
    });
    const songs = useMemo(() => favoriteSongsQuery.data?.items || [], [favoriteSongsQuery.data?.items]);
    const columns = useMemo(() => {
        return tableConfig?.columns || [];
    }, [tableConfig?.columns]);
    const filteredSongs = useMemo(() => {
        return sortSongList(searchLibraryItems(songs, debouncedSearchTerm, LibraryItem.SONG), sortBy, sortOrder);
    }, [songs, debouncedSearchTerm, sortBy, sortOrder]);
    const { handleColumnReordered } = useItemListColumnReorder({
        itemListKey: ItemListKey.SONG,
    });
    const { handleColumnResized } = useItemListColumnResize({
        itemListKey: ItemListKey.SONG,
    });
    const overrideControls = useMemo(() => {
        return {
            onDoubleClick: ({ index, internalState, item, meta }) => {
                if (!item) {
                    return;
                }
                const playType = meta?.playType || Play.NOW;
                const items = internalState?.getData();
                if (index !== undefined) {
                    player.addToQueueByData(items, playType, item.id);
                }
            },
        };
    }, [player]);
    const handlePlay = useCallback((playType) => {
        if (songs.length === 0)
            return;
        player.addToQueueByData(songs, playType);
    }, [songs, player]);
    const handlePlayNext = usePlayButtonClick({
        onClick: () => handlePlay(Play.NEXT),
        onLongPress: () => handlePlay(LONG_PRESS_PLAY_BEHAVIOR[Play.NEXT]),
    });
    const handlePlayNow = usePlayButtonClick({
        onClick: () => handlePlay(Play.NOW),
        onLongPress: () => handlePlay(LONG_PRESS_PLAY_BEHAVIOR[Play.NOW]),
    });
    const handlePlayLast = usePlayButtonClick({
        onClick: () => handlePlay(Play.LAST),
        onLongPress: () => handlePlay(LONG_PRESS_PLAY_BEHAVIOR[Play.LAST]),
    });
    const isLoading = favoriteSongsQuery.isLoading || !favoriteSongsQuery.data;
    if (!isLoading && !tableConfig)
        return null;
    if (!isLoading && songs.length === 0)
        return null;
    const currentSongId = currentSong?.id;
    return (_jsx(Grid.Col, { order: order, span: 12, children: _jsx("section", { children: _jsxs(Stack, { gap: "md", children: [_jsxs("div", { className: styles.albumSectionTitle, children: [_jsxs(Group, { children: [_jsx(TextTitle, { fw: 700, order: 3, children: t('page.albumArtistDetail.favoriteSongs', {
                                            postProcess: 'sentenceCase',
                                        }) }), !isLoading && _jsx(Badge, { children: songs.length })] }), _jsxs("div", { className: styles.albumSectionDividerContainer, children: [_jsx("div", { className: styles.albumSectionDivider }), _jsx(Button, { component: Link, size: "compact-md", to: generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL_FAVORITE_SONGS, {
                                            albumArtistId: routeId,
                                        }), uppercase: true, variant: "subtle", children: t('page.albumArtistDetail.viewAll', {
                                            postProcess: 'sentenceCase',
                                        }) }), songs.length > 0 && (_jsxs(ActionIconGroup, { children: [_jsx(PlayTooltip, { type: Play.NOW, children: _jsx(ActionIcon, { icon: "mediaPlay", iconProps: { size: 'md' }, size: "xs", variant: "subtle", ...handlePlayNow.handlers, ...handlePlayNow.props, disabled: isLoading }) }), _jsx(PlayTooltip, { type: Play.NEXT, children: _jsx(ActionIcon, { icon: "mediaPlayNext", iconProps: { size: 'md' }, size: "xs", variant: "subtle", ...handlePlayNext.handlers, ...handlePlayNext.props, disabled: isLoading }) }), _jsx(PlayTooltip, { type: Play.LAST, children: _jsx(ActionIcon, { icon: "mediaPlayLast", iconProps: { size: 'md' }, size: "xs", variant: "subtle", ...handlePlayLast.handlers, ...handlePlayLast.props, disabled: isLoading }) })] }))] })] }), isLoading ? (_jsx(Group, { justify: "center", py: "md", children: _jsx(Spinner, {}) })) : tableConfig ? (_jsxs(_Fragment, { children: [_jsxs(Group, { gap: "sm", w: "100%", children: [_jsx(TextInput, { flex: 1, leftSection: _jsx(Icon, { icon: "search" }), onChange: (e) => setSearchTerm(e.target.value), placeholder: t('common.search', {
                                            postProcess: 'sentenceCase',
                                        }), radius: "xl", rightSection: searchTerm ? (_jsx(ActionIcon, { icon: "x", onClick: () => setSearchTerm(''), size: "sm", variant: "transparent" })) : null, styles: {
                                            input: {
                                                background: 'transparent',
                                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                            },
                                        }, value: searchTerm }), _jsx(ListSortByDropdownControlled, { filters: CLIENT_SIDE_SONG_FILTERS, itemType: LibraryItem.SONG, setSortBy: (value) => setAlbumArtistDetailFavoriteSongsSort(value, sortOrder), sortBy: sortBy }), _jsx(ListSortOrderToggleButtonControlled, { setSortOrder: (value) => setAlbumArtistDetailFavoriteSongsSort(sortBy, value), sortOrder: sortOrder }), _jsx(ListConfigMenu, { displayTypes: [
                                            { hidden: true, value: ListDisplayType.GRID },
                                            ...SONG_DISPLAY_TYPES,
                                        ], listKey: ItemListKey.SONG, optionsConfig: {
                                            table: {
                                                itemsPerPage: { hidden: true },
                                                pagination: { hidden: true },
                                            },
                                        }, tableColumnsData: SONG_TABLE_COLUMNS })] }), _jsx(SongTableListContainer, { enableHeader: tableConfig.enableHeader, itemCount: filteredSongs.length, maxRows: 5, tableSize: tableConfig.size, children: _jsx(ItemTableList, { activeRowId: currentSongId, autoFitColumns: tableConfig.autoFitColumns, CellComponent: ItemTableListColumn, columns: columns, data: filteredSongs, enableAlternateRowColors: tableConfig.enableAlternateRowColors, enableDrag: true, enableDragScroll: false, enableExpansion: false, enableHeader: tableConfig.enableHeader, enableHorizontalBorders: tableConfig.enableHorizontalBorders, enableRowHoverHighlight: tableConfig.enableRowHoverHighlight, enableSelection: true, enableSelectionDialog: false, enableVerticalBorders: tableConfig.enableVerticalBorders, itemType: LibraryItem.SONG, onColumnReordered: handleColumnReordered, onColumnResized: handleColumnResized, overrideControls: overrideControls, size: tableConfig.size }) })] })) : null] }) }) }));
};
const getListenBrainzUrl = (mbzId, artistName) => {
    if (mbzId) {
        return `https://listenbrainz.org/artist/${mbzId}`;
    }
    if (artistName) {
        return `https://listenbrainz.org/search/?search_term=${encodeURIComponent(artistName)}`;
    }
    return null;
};
const getQobuzUrl = (artistName) => {
    if (artistName) {
        return `https://www.qobuz.com/us-en/search/artists/${encodeURIComponent(artistName)}`;
    }
    return null;
};
const AlbumArtistMetadataExternalLinks = ({ artistName, externalLinks, lastFM, listenBrainz, mbzId, musicBrainz, nativeSpotify, order, qobuz, spotify, }) => {
    const { t } = useTranslation();
    const listenBrainzUrl = getListenBrainzUrl(mbzId || null, artistName);
    const qobuzUrl = getQobuzUrl(artistName);
    if (!externalLinks || (!lastFM && !listenBrainz && !musicBrainz && !qobuz && !spotify)) {
        return null;
    }
    return (_jsx(Grid.Col, { order: order, span: 12, children: _jsxs(Stack, { gap: "xs", children: [_jsx(Text, { fw: 600, isNoSelect: true, size: "sm", tt: "uppercase", children: t('common.externalLinks', {
                        postProcess: 'sentenceCase',
                    }) }), _jsxs(Group, { gap: "xs", children: [lastFM && (_jsx(ActionIcon, { component: "a", href: `https://www.last.fm/music/${encodeURIComponent(artistName || '')}`, icon: "brandLastfm", iconProps: {
                                size: '2xl',
                            }, rel: "noopener noreferrer", target: "_blank", tooltip: {
                                label: t('action.openIn.lastfm'),
                            }, variant: "subtle" })), mbzId && musicBrainz ? (_jsx(ActionIcon, { component: "a", href: `https://musicbrainz.org/artist/${mbzId}`, icon: "brandMusicBrainz", iconProps: {
                                size: '2xl',
                            }, rel: "noopener noreferrer", target: "_blank", tooltip: {
                                label: t('action.openIn.musicbrainz'),
                            }, variant: "subtle" })) : null, listenBrainz && listenBrainzUrl && (_jsx(ActionIcon, { component: "a", href: listenBrainzUrl, icon: "brandListenBrainz", iconProps: {
                                size: '2xl',
                            }, rel: "noopener noreferrer", target: "_blank", tooltip: {
                                label: t('action.openIn.listenbrainz'),
                            }, variant: "subtle" })), qobuz && qobuzUrl && (_jsx(ActionIcon, { component: "a", href: qobuzUrl, icon: "brandQobuz", iconProps: {
                                size: '2xl',
                            }, rel: "noopener noreferrer", target: "_blank", tooltip: {
                                label: t('action.openIn.qobuz'),
                            }, variant: "subtle" })), spotify && (_jsx(ActionIcon, { component: "a", href: nativeSpotify
                                ? `spotify:search:${encodeURIComponent(artistName || '')}`
                                : `https://open.spotify.com/search/${encodeURIComponent(artistName || '')}`, icon: "brandSpotify", iconProps: {
                                size: '2xl',
                            }, rel: "noopener noreferrer", target: nativeSpotify ? undefined : '_blank', tooltip: {
                                label: t('action.openIn.spotify'),
                            }, variant: "subtle" }))] })] }) }));
};
const AlbumArtistMetadataSimilarArtists = ({ order, routeId, }) => {
    const { t } = useTranslation();
    const server = useCurrentServer();
    const serverId = useCurrentServerId();
    const artistInfoQuery = useQuery({
        ...artistsQueries.albumArtistInfo({
            query: { id: routeId, limit: 10 },
            serverId: server?.id,
        }),
        enabled: Boolean(server?.id && routeId),
    });
    const relatedArtists = artistInfoQuery.data?.similarArtists ?? null;
    const similarArtists = useMemo(() => {
        if (!relatedArtists || relatedArtists.length === 0) {
            return [];
        }
        return relatedArtists.map((relatedArtist) => ({
            _itemType: LibraryItem.ALBUM_ARTIST,
            _serverId: serverId || '',
            _serverType: server?.type || ServerType.JELLYFIN,
            albumCount: null,
            biography: null,
            duration: null,
            genres: [],
            id: relatedArtist.id,
            imageId: relatedArtist.imageId,
            imageUrl: relatedArtist.imageUrl,
            lastPlayedAt: null,
            mbz: null,
            name: relatedArtist.name,
            playCount: null,
            similarArtists: null,
            songCount: null,
            userFavorite: relatedArtist.userFavorite,
            userRating: relatedArtist.userRating,
        }));
    }, [relatedArtists, server?.type, serverId]);
    const carouselTitle = useMemo(() => (_jsxs("div", { className: styles.similarArtistsTitle, children: [_jsx(TextTitle, { fw: 700, order: 3, children: t('page.albumArtistDetail.relatedArtists', {
                    postProcess: 'sentenceCase',
                }) }), _jsx("div", { className: styles.albumSectionDividerContainer, children: _jsx("div", { className: styles.albumSectionDivider }) })] })), [t]);
    if (!artistInfoQuery.isLoading && similarArtists.length === 0) {
        return null;
    }
    return (_jsx(Grid.Col, { order: order, span: 12, children: _jsx(AlbumArtistGridCarousel, { data: similarArtists, excludeIds: [routeId], isLoading: artistInfoQuery.isLoading, rowCount: 1, title: carouselTitle }) }));
};
export const AlbumArtistDetailContent = ({ albumsQuery, detailQuery, }) => {
    const artistItems = useArtistItems();
    const artistRadioCount = useArtistRadioCount();
    const { externalLinks, lastFM, listenBrainz, musicBrainz, nativeSpotify, qobuz, spotify } = useExternalLinks();
    const { albumArtistId, artistId } = useParams();
    const routeId = (artistId || albumArtistId);
    const server = useCurrentServer();
    const { addToQueueByData } = usePlayer();
    const queryClient = useQueryClient();
    const [enabledItem, itemOrder] = useMemo(() => {
        const enabled = {};
        const order = {};
        for (const [idx, item] of artistItems.entries()) {
            enabled[item.id] = !item.disabled;
            order[item.id] = idx + 1;
        }
        return [enabled, order];
    }, [artistItems]);
    const artistDiscographyLink = useMemo(() => `${generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL_DISCOGRAPHY, {
        albumArtistId: routeId,
    })}?${createSearchParams({
        artistId: routeId,
        artistName: detailQuery.data?.name || '',
    })}`, [routeId, detailQuery.data?.name]);
    const artistSongsLink = useMemo(() => `${generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL_SONGS, {
        albumArtistId: routeId,
    })}?${createSearchParams({
        artistId: routeId,
        artistName: detailQuery.data?.name || '',
    })}`, [routeId, detailQuery.data?.name]);
    const mbzId = detailQuery.data?.mbz;
    const handleArtistRadio = useCallback(async () => {
        if (!server?.id || !routeId)
            return;
        try {
            const artistRadioSongs = await queryClient.fetchQuery({
                ...songsQueries.artistRadio({
                    query: {
                        artistId: routeId,
                        count: artistRadioCount,
                    },
                    serverId: server.id,
                }),
                queryKey: queryKeys.player.fetch({ artistId: routeId }),
            });
            if (artistRadioSongs && artistRadioSongs.length > 0) {
                addToQueueByData(artistRadioSongs, Play.NOW);
            }
        }
        catch (error) {
            logFn.error('Failed to load artist radio', { meta: { error: error } });
        }
    }, [addToQueueByData, artistRadioCount, queryClient, routeId, server.id]);
    // Calculate order for genres and external links (show before other sections)
    // Use a very low order number to ensure they appear first
    const genresOrder = 0;
    const externalLinksOrder = 0.5;
    return (_jsx("div", { className: styles.contentContainer, children: _jsxs("div", { className: styles.detailContainer, children: [_jsx(AlbumArtistActionButtons, { artistDiscographyLink: artistDiscographyLink, artistSongsLink: artistSongsLink, onArtistRadio: handleArtistRadio }), _jsxs(Grid, { gutter: "2xl", children: [_jsx(AlbumArtistMetadataGenres, { genres: detailQuery.data?.genres, order: genresOrder }), externalLinks &&
                            (lastFM || listenBrainz || musicBrainz || qobuz || spotify) && (_jsx(AlbumArtistMetadataExternalLinks, { artistName: detailQuery.data?.name, externalLinks: externalLinks, lastFM: lastFM, listenBrainz: listenBrainz, mbzId: mbzId, musicBrainz: musicBrainz, nativeSpotify: nativeSpotify, order: externalLinksOrder, qobuz: qobuz, spotify: spotify })), enabledItem.biography && (_jsx(AlbumArtistMetadataBiography, { artistName: detailQuery.data?.name, order: itemOrder.biography, routeId: routeId })), _jsx(ArtistAlbums, { albumsQuery: albumsQuery, order: itemOrder.recentAlbums }), enabledItem.similarArtists && (_jsx(AlbumArtistMetadataSimilarArtists, { order: itemOrder.similarArtists, routeId: routeId })), enabledItem.topSongs && (_jsx(AlbumArtistMetadataTopSongs, { detailQuery: detailQuery, order: itemOrder.topSongs, routeId: routeId })), enabledItem.favoriteSongs && (_jsx(AlbumArtistMetadataFavoriteSongs, { order: itemOrder.favoriteSongs, routeId: routeId }))] })] }) }));
};
const MAX_SECTION_CARDS = 100;
const getItemsPerRow = (cq) => {
    // Match grid carousel breakpoints: is3xl: 8, is2xl: 7, isXl: 6, isLg: 5, isMd: 4, isSm: 3, default: 2
    if (cq.is3xl)
        return 8;
    if (cq.is2xl)
        return 7;
    if (cq.isXl)
        return 6;
    if (cq.isLg)
        return 5;
    if (cq.isMd)
        return 4;
    if (cq.isSm)
        return 3;
    if (cq.isXs)
        return 2;
    return 2;
};
const AlbumSection = memo(function AlbumSection({ albums, controls, enableExpansion, itemsPerRow, releaseType, rows, title, }) {
    const { t } = useTranslation();
    const albumCount = albums.length;
    const [showAll, setShowAll] = useState(false);
    const player = usePlayer();
    const serverId = useCurrentServerId();
    const displayedAlbums = showAll ? albums : albums.slice(0, MAX_SECTION_CARDS);
    const hasMoreAlbums = albums.length > MAX_SECTION_CARDS;
    const handlePlay = useCallback((playType) => {
        if (albums.length === 0)
            return;
        const albumIds = albums.map((album) => album.id);
        player.addToQueueByFetch(serverId, albumIds, LibraryItem.ALBUM, playType);
    }, [albums, player, serverId]);
    const handlePlayNext = usePlayButtonClick({
        onClick: () => {
            handlePlay(Play.NEXT);
        },
        onLongPress: () => {
            handlePlay(LONG_PRESS_PLAY_BEHAVIOR[Play.NEXT]);
        },
    });
    const handlePlayNow = usePlayButtonClick({
        onClick: () => {
            handlePlay(Play.NOW);
        },
        onLongPress: () => {
            handlePlay(LONG_PRESS_PLAY_BEHAVIOR[Play.NOW]);
        },
    });
    const handlePlayLast = usePlayButtonClick({
        onClick: () => {
            handlePlay(Play.LAST);
        },
        onLongPress: () => {
            handlePlay(LONG_PRESS_PLAY_BEHAVIOR[Play.LAST]);
        },
    });
    const DisplayedAlbumsMemo = useMemo(() => {
        return displayedAlbums.map((album) => (_jsx(motion.div, { className: styles.albumGridItem, layoutId: `${releaseType}-${album.id}`, children: _jsx(MemoizedItemCard, { controls: controls, data: album, enableDrag: true, enableExpansion: enableExpansion ?? true, itemType: LibraryItem.ALBUM, rows: rows, type: "poster", withControls: true }) }, album.id)));
    }, [controls, displayedAlbums, enableExpansion, releaseType, rows]);
    return (_jsxs(Stack, { gap: "md", children: [_jsxs("div", { className: styles.albumSectionTitle, children: [_jsxs(Group, { gap: "md", children: [_jsx(TextTitle, { fw: 700, order: 3, children: title }), _jsx(Badge, { variant: "default", children: albumCount })] }), _jsxs("div", { className: styles.albumSectionDividerContainer, children: [_jsx("div", { className: styles.albumSectionDivider }), albumCount > 0 && (_jsxs(ActionIconGroup, { children: [_jsx(PlayTooltip, { type: Play.NOW, children: _jsx(ActionIcon, { icon: "mediaPlay", iconProps: {
                                                size: 'md',
                                            }, size: "xs", variant: "subtle", ...handlePlayNow.handlers, ...handlePlayNow.props }) }), _jsx(PlayTooltip, { type: Play.NEXT, children: _jsx(ActionIcon, { icon: "mediaPlayNext", iconProps: {
                                                size: 'md',
                                            }, size: "xs", variant: "subtle", ...handlePlayNext.handlers, ...handlePlayNext.props }) }), _jsx(PlayTooltip, { type: Play.LAST, children: _jsx(ActionIcon, { icon: "mediaPlayLast", iconProps: {
                                                size: 'md',
                                            }, size: "xs", variant: "subtle", ...handlePlayLast.handlers, ...handlePlayLast.props }) })] }))] })] }), _jsx("div", { className: styles.albumGrid, style: {
                    '--items-per-row': itemsPerRow,
                }, children: DisplayedAlbumsMemo }), hasMoreAlbums && !showAll && (_jsx(Group, { justify: "center", w: "100%", children: _jsx(Button, { onClick: () => setShowAll(true), variant: "subtle", children: t('action.viewMore', { postProcess: 'sentenceCase' }) }) }))] }));
});
import { useArtistAlbumsGrouped } from '/@/renderer/features/artists/hooks/use-artist-albums-grouped';
const ArtistAlbums = ({ albumsQuery, order }) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm] = useDebouncedValue(searchTerm, 300);
    const albumArtistDetailSort = useAppStore((state) => state.albumArtistDetailSort);
    const setAlbumArtistDetailSort = useAppStore((state) => state.actions.setAlbumArtistDetailSort);
    const sortBy = albumArtistDetailSort.sortBy;
    const sortOrder = albumArtistDetailSort.sortOrder;
    const { albumArtistId, artistId } = useParams();
    const routeId = (artistId || albumArtistId);
    const rows = useGridRows(LibraryItem.ALBUM, ItemListKey.ALBUM);
    const filteredAndSortedAlbums = useMemo(() => {
        const albums = albumsQuery.data?.items || [];
        const searched = searchLibraryItems(albums, debouncedSearchTerm, LibraryItem.ALBUM);
        return sortAlbumList(searched, sortBy, sortOrder);
    }, [albumsQuery.data?.items, debouncedSearchTerm, sortBy, sortOrder]);
    const controls = useDefaultItemListControls();
    const { releaseTypeEntries } = useArtistAlbumsGrouped(filteredAndSortedAlbums, routeId);
    const cq = useContainerQuery({
        '2xl': 1280,
        '3xl': 1440,
        lg: 960,
        md: 720,
        sm: 520,
        xl: 1152,
        xs: 360,
    });
    const binding = useSettingsStore((state) => state.hotkeys.bindings.localSearch);
    const searchInputRef = useRef(null);
    useHotkeys([
        [
            binding.hotkey,
            () => {
                searchInputRef.current?.focus();
            },
        ],
    ]);
    const itemsPerRow = getItemsPerRow(cq);
    const ReleaseTypeEntriesMemo = useMemo(() => {
        return releaseTypeEntries.map(({ albums, displayName, releaseType }) => (_jsx(AlbumSection, { albums: albums, controls: controls, enableExpansion: true, itemsPerRow: itemsPerRow, releaseType: releaseType, rows: rows, title: displayName }, releaseType)));
    }, [releaseTypeEntries, itemsPerRow, controls, rows]);
    return (_jsx(Grid.Col, { order: order, span: 12, children: _jsxs(Stack, { gap: "md", children: [_jsxs(Group, { gap: "sm", w: "100%", children: [_jsx(TextInput, { flex: 1, leftSection: _jsx(Icon, { icon: "search" }), onChange: (e) => setSearchTerm(e.target.value), placeholder: t('common.search', { postProcess: 'sentenceCase' }), radius: "xl", ref: searchInputRef, rightSection: searchTerm ? (_jsx(ActionIcon, { icon: "x", onClick: () => setSearchTerm(''), size: "sm", variant: "transparent" })) : null, styles: {
                                input: {
                                    background: 'transparent',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                },
                            }, value: searchTerm }), _jsx(ListSortByDropdownControlled, { filters: CLIENT_SIDE_ALBUM_FILTERS, itemType: LibraryItem.ALBUM, setSortBy: (value) => setAlbumArtistDetailSort(value, sortOrder), sortBy: sortBy }), _jsx(ListSortOrderToggleButtonControlled, { setSortOrder: (value) => setAlbumArtistDetailSort(sortBy, value), sortOrder: sortOrder }), _jsx(GroupingTypeSelector, {})] }), releaseTypeEntries.length > 0 && (_jsx("div", { className: styles.albumSectionContainer, ref: cq.ref, children: cq.isCalculated && _jsx(_Fragment, { children: ReleaseTypeEntriesMemo }) }))] }) }));
};
function GroupingTypeSelector() {
    const { t } = useTranslation();
    const groupingType = useAppStore((state) => state.albumArtistDetailSort.groupingType);
    const setAlbumArtistDetailGroupingType = useAppStore((state) => state.actions.setAlbumArtistDetailGroupingType);
    return (_jsxs(DropdownMenu, { children: [_jsx(DropdownMenu.Target, { children: _jsx(ActionIcon, { icon: "settings", variant: "subtle" }) }), _jsxs(DropdownMenu.Dropdown, { children: [_jsx(DropdownMenu.Item, { isSelected: groupingType === 'all', onClick: () => setAlbumArtistDetailGroupingType('all'), children: t('page.albumArtistDetail.groupingTypeAll', {
                            postProcess: 'sentenceCase',
                        }) }), _jsx(DropdownMenu.Item, { isSelected: groupingType === 'primary', onClick: () => setAlbumArtistDetailGroupingType('primary'), children: t('page.albumArtistDetail.groupingTypePrimary', {
                            postProcess: 'sentenceCase',
                        }) })] })] }));
}
