import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useMemo } from 'react';
import { generatePath, Link, useNavigate } from 'react-router';
import styles from './home-sections.module.css';
import { api } from '/@/renderer/api';
import { GridCarousel, } from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import itemCardControlsStyles from '/@/renderer/components/item-card/item-card-controls.module.css';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { PlayButton } from '/@/renderer/features/shared/components/play-button';
import { AppRoute } from '/@/renderer/router/routes';
import { recordRecentArtist, recordRecentPlaylist, useCurrentServer, useCurrentServerId, } from '/@/renderer/store';
import { useFavoritePlaylistIds, useLibraryFavoritesActions, } from '/@/renderer/store/library-favorites.store';
import { formatDateRelative, formatDurationStringShort } from '/@/renderer/utils/format';
import { Button } from '/@/shared/components/button/button';
import { Icon } from '/@/shared/components/icon/icon';
import { TextTitle } from '/@/shared/components/text-title/text-title';
import { Text } from '/@/shared/components/text/text';
import { AlbumArtistListSort, AlbumListSort, LibraryItem, PlaylistListSort, ServerType, SongListSort, SortOrder, } from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';
const SHELF_LIMIT = 8;
const LIST_LIMIT = 10;
const HomeHeader = ({ title, to }) => (_jsxs("div", { className: styles.sectionHeader, children: [_jsx(TextTitle, { fw: 700, isNoSelect: true, order: 3, children: title }), to ? (_jsx(Button, { component: Link, size: "compact-sm", to: to, variant: "subtle", children: "View all" })) : null] }));
const getSongSubtitle = (song) => [song.artistName, song.album].filter(Boolean).join(' - ') || 'Track';
const getCountText = (count, label) => {
    if (typeof count !== 'number')
        return undefined;
    return `${count} ${label}${count === 1 ? '' : 's'}`;
};
const useAlbums = (sortBy, sortOrder, query, options) => {
    const serverId = useCurrentServerId();
    return useQuery({
        enabled: Boolean(serverId) && (options?.enabled ?? true),
        queryFn: ({ signal }) => api.controller.getAlbumList({
            apiClientProps: { serverId, signal },
            query: {
                limit: SHELF_LIMIT,
                sortBy,
                sortOrder,
                startIndex: 0,
                ...query,
            },
        }),
        queryKey: ['home', 'albums', sortBy, sortOrder, query, serverId],
    });
};
const useArtists = () => {
    const serverId = useCurrentServerId();
    const favoritesQuery = useQuery({
        enabled: Boolean(serverId),
        queryFn: ({ signal }) => api.controller.getAlbumArtistList({
            apiClientProps: { serverId, signal },
            query: {
                favorite: true,
                limit: SHELF_LIMIT,
                sortBy: AlbumArtistListSort.FAVORITED,
                sortOrder: SortOrder.DESC,
                startIndex: 0,
            },
        }),
        queryKey: ['home', 'artists', 'favorites', serverId],
    });
    const recentlyPlayedQuery = useQuery({
        enabled: Boolean(serverId) && favoritesQuery.isSuccess && favoritesQuery.data.items.length === 0,
        queryFn: ({ signal }) => api.controller.getAlbumArtistList({
            apiClientProps: { serverId, signal },
            query: {
                limit: SHELF_LIMIT,
                sortBy: AlbumArtistListSort.RECENTLY_ADDED,
                sortOrder: SortOrder.DESC,
                startIndex: 0,
            },
        }),
        queryKey: ['home', 'artists', 'recently-added', serverId],
    });
    return favoritesQuery.data?.items?.length ? favoritesQuery : recentlyPlayedQuery;
};
const useSongs = (key, sortBy, sortOrder, limit = LIST_LIMIT, query, options) => {
    const serverId = useCurrentServerId();
    return useQuery({
        enabled: Boolean(serverId) && (options?.enabled ?? true),
        queryFn: ({ signal }) => api.controller.getSongList({
            apiClientProps: { serverId, signal },
            query: {
                limit,
                sortBy,
                sortOrder,
                startIndex: 0,
                ...query,
            },
        }),
        queryKey: ['home', 'songs', key, sortBy, sortOrder, query, serverId],
    });
};
export const HomeFavoritePlaylists = ({ containerQuery, }) => {
    const navigate = useNavigate();
    const player = usePlayer();
    const serverId = useCurrentServerId();
    const favoritePlaylistIds = useFavoritePlaylistIds(serverId);
    const favoritesActions = useLibraryFavoritesActions();
    const playlistsQuery = useQuery({
        enabled: Boolean(serverId),
        queryFn: ({ signal }) => api.controller.getPlaylistList({
            apiClientProps: { serverId, signal },
            query: {
                limit: SHELF_LIMIT,
                sortBy: PlaylistListSort.UPDATED_AT,
                sortOrder: SortOrder.DESC,
                startIndex: 0,
            },
        }),
        queryKey: ['home', 'playlists', serverId],
    });
    const playlists = useMemo(() => {
        const allPlaylists = playlistsQuery.data?.items ?? [];
        const favorites = allPlaylists.filter((p) => favoritePlaylistIds.has(p.id));
        const nonFavorites = allPlaylists.filter((p) => !favoritePlaylistIds.has(p.id));
        return [...favorites, ...nonFavorites].slice(0, SHELF_LIMIT);
    }, [favoritePlaylistIds, playlistsQuery.data?.items]);
    if (!playlists.length)
        return null;
    const handlePlay = (playlist, playType) => {
        recordRecentPlaylist(playlist);
        player.addToQueueByFetch(playlist._serverId, [playlist.id], LibraryItem.PLAYLIST, playType);
    };
    const cards = playlists.map((playlist) => ({
        content: (_jsx(PlaylistCard, { isFavorite: favoritePlaylistIds.has(playlist.id), onClick: () => navigate(generatePath(AppRoute.PLAYLISTS_DETAIL_SONGS, {
                playlistId: playlist.id,
            })), onPlay: (playType) => handlePlay(playlist, playType), onToggleFavorite: () => favoritesActions.toggle('playlist', playlist._serverId, playlist.id), playlist: playlist })),
        id: playlist.id,
    }));
    return (_jsx(GridCarousel, { cards: cards, containerQuery: containerQuery, hasNextPage: false, onNextPage: () => { }, onPrevPage: () => { }, rowCount: 1, title: _jsx(HomeHeader, { title: "Playlists", to: AppRoute.PLAYLISTS }) }));
};
const PlaylistCard = ({ isFavorite, onClick, onPlay, onToggleFavorite, playlist, }) => {
    const openContextMenu = (event) => {
        event.preventDefault();
        event.stopPropagation();
        ContextMenuController.call({
            cmd: { items: [playlist], type: LibraryItem.PLAYLIST },
            event,
        });
    };
    return (_jsxs("div", { className: styles.mediaCard, onClick: onClick, onContextMenu: openContextMenu, onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
            }
        }, role: "button", tabIndex: 0, children: [_jsxs("div", { className: styles.mediaArt, children: [playlist.imageId || playlist.imageUrl ? (_jsx(ItemImage, { alt: playlist.name, enableViewport: false, id: playlist.imageId, imageContainerProps: { className: styles.imageContainer }, itemType: LibraryItem.PLAYLIST, serverId: playlist._serverId, src: playlist.imageUrl, type: "itemCard" })) : (_jsx("div", { className: styles.playlistPlaceholder, children: _jsx(Icon, { icon: "playlist", size: "34%" }) })), _jsxs("span", { className: styles.badge, children: [_jsx(Icon, { icon: "playlist", size: "0.78rem" }), "Playlist"] }), _jsxs("span", { className: styles.playlistControls, children: [_jsx(PlayButton, { classNames: clsx(itemCardControlsStyles.playButton, itemCardControlsStyles.primary, styles['playlist-primary-control']), fill: true, onClick: (event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    onPlay(Play.NOW);
                                } }), _jsx(PlayButton, { classNames: clsx(itemCardControlsStyles.playButton, itemCardControlsStyles.secondary, itemCardControlsStyles.right, styles['playlist-secondary-control']), icon: "mediaShuffle", onClick: (event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    onPlay(Play.SHUFFLE);
                                } }), _jsx("button", { className: clsx(styles.overlayBtn, styles.overlayHeart, isFavorite && styles.favoriteActive), onClick: (event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    onToggleFavorite();
                                }, type: "button", children: _jsx(Icon, { icon: "favorite", size: "lg" }) }), _jsx("button", { className: clsx(styles.overlayBtn, styles.overlayOptions), onClick: openContextMenu, type: "button", children: _jsx(Icon, { icon: "ellipsisHorizontal", size: "lg" }) })] })] }), _jsx(Text, { className: styles.title, fw: 600, size: "sm", children: playlist.name }), _jsx(Text, { className: styles.subtitle, isMuted: true, size: "xs", children: getCountText(playlist.songCount, 'track') ?? 'Playlist' })] }));
};
export const HomeFavoriteArtists = ({ containerQuery, }) => {
    const navigate = useNavigate();
    const artistsQuery = useArtists();
    const artists = artistsQuery.data?.items ?? [];
    if (!artists.length)
        return null;
    const cards = artists.map((artist) => ({
        content: (_jsx(ArtistCard, { artist: artist, onClick: () => {
                recordRecentArtist(artist);
                navigate(generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL, {
                    albumArtistId: artist.id,
                }));
            } })),
        id: artist.id,
    }));
    return (_jsx(GridCarousel, { cards: cards, containerQuery: containerQuery, hasNextPage: false, onNextPage: () => { }, onPrevPage: () => { }, rowCount: 1, title: _jsx(HomeHeader, { title: "Artists", to: AppRoute.LIBRARY_ALBUM_ARTISTS }) }));
};
const ArtistCard = ({ artist, onClick }) => (_jsxs("button", { className: styles.artistCard, onClick: onClick, onContextMenu: (event) => {
        event.preventDefault();
        event.stopPropagation();
        ContextMenuController.call({
            cmd: {
                items: [artist],
                type: LibraryItem.ALBUM_ARTIST,
            },
            event,
        });
    }, type: "button", children: [_jsx("div", { className: styles.artistArt, children: _jsx(ItemImage, { alt: artist.name, enableViewport: false, id: artist.imageId, imageContainerProps: { className: styles.imageContainer }, itemType: LibraryItem.ALBUM_ARTIST, serverId: artist._serverId, src: artist.imageUrl, type: "itemCard" }) }), _jsx(Text, { className: styles.title, fw: 650, size: "sm", children: artist.name }), _jsx(Text, { className: styles.subtitle, isMuted: true, size: "xs", children: getCountText(artist.albumCount, 'album') ?? getCountText(artist.songCount, 'track') })] }));
export const HomeFavoriteTracks = () => {
    const serverId = useCurrentServerId();
    const favoritesQuery = useSongs('favorites', SongListSort.FAVORITED, SortOrder.DESC, LIST_LIMIT, {
        favorite: true,
    });
    const recentlyPlayedQuery = useQuery({
        enabled: Boolean(serverId) && favoritesQuery.isSuccess && favoritesQuery.data.items.length === 0,
        queryFn: ({ signal }) => api.controller.getSongList({
            apiClientProps: { serverId, signal },
            query: {
                limit: LIST_LIMIT,
                sortBy: SongListSort.RECENTLY_PLAYED,
                sortOrder: SortOrder.DESC,
                startIndex: 0,
            },
        }),
        queryKey: ['home', 'songs', 'recently-played', serverId],
    });
    const songsQuery = favoritesQuery.data?.items?.length ? favoritesQuery : recentlyPlayedQuery;
    const songs = songsQuery.data?.items ?? [];
    if (!songs.length)
        return null;
    return (_jsxs("section", { className: styles.section, children: [_jsx(HomeHeader, { title: "Tracks", to: AppRoute.LIBRARY_SONGS }), _jsx("div", { className: styles.trackList, children: songs.map((song) => (_jsx(TrackRow, { song: song }, song.id))) })] }));
};
const TrackRow = ({ song }) => {
    const player = usePlayer();
    return (_jsxs("button", { className: styles.trackRow, onClick: () => player.addToQueueByData([song], Play.NOW), onContextMenu: (event) => {
            event.preventDefault();
            event.stopPropagation();
            ContextMenuController.call({
                cmd: {
                    items: [song],
                    type: LibraryItem.SONG,
                },
                event,
            });
        }, type: "button", children: [_jsx("div", { className: styles.trackThumb, children: _jsx(ItemImage, { alt: song.name, enableViewport: false, id: song.imageId, imageContainerProps: { className: styles.imageContainer }, itemType: LibraryItem.SONG, serverId: song._serverId, src: song.imageUrl, type: "itemCard" }) }), _jsxs("div", { className: styles.trackMeta, children: [_jsx(Text, { className: styles.title, fw: 650, size: "sm", children: song.name }), _jsx(Text, { className: styles.subtitle, isMuted: true, size: "xs", children: getSongSubtitle(song) })] }), _jsx(Text, { className: styles.trackExtra, size: "xs", children: formatDurationStringShort(song.duration) })] }));
};
export const HomeRediscoverySection = () => {
    const server = useCurrentServer();
    const isJellyfin = server?.type === ServerType.JELLYFIN;
    const songsQuery = useSongs('rediscovery', SongListSort.RECENTLY_PLAYED, SortOrder.ASC, 6, undefined, { enabled: isJellyfin });
    const albumsQuery = useAlbums(AlbumListSort.RECENTLY_PLAYED, SortOrder.ASC, undefined, {
        enabled: !isJellyfin,
    });
    const songs = isJellyfin ? (songsQuery.data?.items ?? []) : [];
    const albums = !isJellyfin ? (albumsQuery.data?.items ?? []) : [];
    if (!songs.length && !albums.length)
        return null;
    const feature = albums[0] ?? songs[0];
    const support = (albums.length ? albums.slice(1, 6) : songs.slice(1, 6));
    return (_jsxs("section", { className: styles.section, children: [_jsx(HomeHeader, { title: "Haven't Listened in a Long Time" }), _jsxs("div", { className: styles.editorial, children: [_jsx(RediscoveryFeature, { item: feature }), _jsx("div", { className: styles.supportList, children: support.map((item) => (_jsx(RediscoverySupport, { item: item }, item.id))) })] })] }));
};
const getRediscoveryCopy = (item) => {
    if (item.lastPlayedAt)
        return `Last played ${formatDateRelative(item.lastPlayedAt)}`;
    if (item.playCount)
        return `You played this ${item.playCount} times`;
    return 'Rediscover this from your library';
};
const RediscoveryFeature = ({ item }) => {
    const navigate = useNavigate();
    const player = usePlayer();
    const isSong = item._itemType === LibraryItem.SONG;
    const title = item.name;
    const subtitle = isSong ? getSongSubtitle(item) : item.albumArtistName;
    const open = () => {
        if (isSong) {
            player.addToQueueByData([item], Play.NOW);
            return;
        }
        navigate(generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, { albumId: item.id }));
    };
    const handleContextMenu = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (isSong) {
            ContextMenuController.call({
                cmd: {
                    items: [item],
                    type: LibraryItem.SONG,
                },
                event,
            });
        }
        else {
            ContextMenuController.call({
                cmd: {
                    items: [item],
                    type: LibraryItem.ALBUM,
                },
                event,
            });
        }
    };
    return (_jsxs("button", { className: styles.featureCard, onClick: open, onContextMenu: handleContextMenu, type: "button", children: [_jsx("div", { className: styles.featureArt, children: _jsx(ItemImage, { alt: title, enableViewport: false, id: item.imageId, imageContainerProps: { className: styles.imageContainer }, itemType: isSong ? LibraryItem.SONG : LibraryItem.ALBUM, serverId: item._serverId, src: item.imageUrl, type: "itemCard" }) }), _jsxs("div", { className: styles.trackMeta, children: [_jsx(Text, { isMuted: true, size: "xs", children: "Rediscover this" }), _jsx(Text, { className: styles.title, fw: 750, size: "lg", children: title }), _jsx(Text, { className: styles.subtitle, isMuted: true, size: "sm", children: subtitle }), _jsx(Text, { className: styles.tertiary, isMuted: true, size: "xs", children: getRediscoveryCopy(item) })] })] }));
};
const RediscoverySupport = ({ item }) => {
    const player = usePlayer();
    const navigate = useNavigate();
    const isSong = item._itemType === LibraryItem.SONG;
    const open = () => {
        if (isSong) {
            player.addToQueueByData([item], Play.NOW);
            return;
        }
        navigate(generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, { albumId: item.id }));
    };
    const handleContextMenu = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (isSong) {
            ContextMenuController.call({
                cmd: {
                    items: [item],
                    type: LibraryItem.SONG,
                },
                event,
            });
        }
        else {
            ContextMenuController.call({
                cmd: {
                    items: [item],
                    type: LibraryItem.ALBUM,
                },
                event,
            });
        }
    };
    return (_jsxs("button", { className: styles.discoveryCard, onClick: open, onContextMenu: handleContextMenu, type: "button", children: [_jsx("div", { className: styles.trackThumb, children: _jsx(ItemImage, { alt: item.name, enableViewport: false, id: item.imageId, imageContainerProps: { className: styles.imageContainer }, itemType: isSong ? LibraryItem.SONG : LibraryItem.ALBUM, serverId: item._serverId, src: item.imageUrl, type: "itemCard" }) }), _jsxs("div", { className: styles.trackMeta, children: [_jsx(Text, { className: styles.title, fw: 650, size: "sm", children: item.name }), _jsx(Text, { className: styles.subtitle, isMuted: true, size: "xs", children: getRediscoveryCopy(item) })] })] }));
};
export const HomeUnplayedSection = () => {
    const songsQuery = useSongs('unplayed', SongListSort.PLAY_COUNT, SortOrder.ASC, 8);
    const songs = (songsQuery.data?.items ?? []).filter((song) => !song.playCount);
    if (!songs.length)
        return null;
    return (_jsxs("section", { className: styles.section, children: [_jsx(HomeHeader, { title: "Unplayed in Your Library", to: AppRoute.LIBRARY_SONGS }), _jsx("div", { className: styles.discoveryGrid, children: songs.map((song) => (_jsx(TrackRow, { song: song }, song.id))) })] }));
};
export const HomeMostPlayedSection = () => {
    const songsQuery = useSongs('most-played', SongListSort.PLAY_COUNT, SortOrder.DESC, LIST_LIMIT);
    const songs = songsQuery.data?.items ?? [];
    if (!songs.length)
        return null;
    return (_jsxs("section", { className: styles.section, children: [_jsx(HomeHeader, { title: "All-Time Most Played", to: AppRoute.LIBRARY_SONGS }), _jsx("div", { className: styles.rankedList, children: songs.map((song, index) => (_jsx(RankedSongRow, { index: index + 1, song: song }, song.id))) })] }));
};
const RankedSongRow = ({ index, song }) => {
    const player = usePlayer();
    return (_jsxs("button", { className: styles.rankedRow, onClick: () => player.addToQueueByData([song], Play.NOW), onContextMenu: (event) => {
            event.preventDefault();
            event.stopPropagation();
            ContextMenuController.call({
                cmd: {
                    items: [song],
                    type: LibraryItem.SONG,
                },
                event,
            });
        }, type: "button", children: [_jsx("span", { className: styles.rank, children: index }), _jsx("div", { className: styles.trackThumb, children: _jsx(ItemImage, { alt: song.name, enableViewport: false, id: song.imageId, imageContainerProps: { className: styles.imageContainer }, itemType: LibraryItem.SONG, serverId: song._serverId, src: song.imageUrl, type: "itemCard" }) }), _jsxs("div", { className: styles.trackMeta, children: [_jsx(Text, { className: styles.title, fw: 650, size: "sm", children: song.name }), _jsx(Text, { className: styles.subtitle, isMuted: true, size: "xs", children: getSongSubtitle(song) })] }), _jsxs(Text, { className: styles.trackExtra, size: "xs", children: [song.playCount, " plays"] })] }));
};
