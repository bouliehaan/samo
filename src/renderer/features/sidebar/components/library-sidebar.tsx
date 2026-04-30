import { useQueries, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { MouseEvent, ReactNode, useCallback, useMemo, useRef, useState } from 'react';
import { generatePath, useLocation, useNavigate } from 'react-router';

import styles from './library-sidebar.module.css';

import { audiobookshelfController } from '/@/renderer/api/audiobookshelf/audiobookshelf-controller';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { albumQueries } from '/@/renderer/features/albums/api/album-api';
import { artistsQueries } from '/@/renderer/features/artists/api/artists-api';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { playlistsQueries } from '/@/renderer/features/playlists/api/playlists-api';
import { openCreatePlaylistModal } from '/@/renderer/features/playlists/components/create-playlist-form';
import { radioQueries } from '/@/renderer/features/radio/api/radio-api';
import { openCreateRadioStationModal } from '/@/renderer/features/radio/components/create-radio-station-form';
import {
    useRadioControls,
    useRadioPlayer,
} from '/@/renderer/features/radio/hooks/use-radio-player';
import { AbsCoverImage } from '/@/renderer/features/search/components/abs-cover-image';
import { songsQueries } from '/@/renderer/features/songs/api/songs-api';
import { AppRoute } from '/@/renderer/router/routes';
import {
    playHistoryKey,
    RecentItem,
    recordRecentItem,
    useAudiobookActions,
    useAudiobookItem,
    useAudiobookshelfServer,
    useCurrentServer,
    usePermissions,
    usePlaybackSource,
    usePlayerSong,
    usePlayerStatus,
    usePodcastItem,
    useRecentItems,
} from '/@/renderer/store';
import {
    AudiobookshelfLibrary,
    AudiobookshelfLibraryItem,
} from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { type AppIconSelection, Icon } from '/@/shared/components/icon/icon';
import {
    Album,
    AlbumArtist,
    AlbumArtistListSort,
    AlbumListSort,
    InternetRadioStation,
    LibraryItem,
    Playlist,
    PlaylistListSort,
    Song,
    SongListSort,
    SortOrder,
} from '/@/shared/types/domain-types';
import { Play, PlayerStatus } from '/@/shared/types/types';

const SIDEBAR_ITEM_LIMIT = 40;
const SIDEBAR_TYPE_VIEW_LIMIT = 1000;
const ABS_LIBRARY_STALE_TIME_MS = 1000 * 60 * 5;
const ABS_LIBRARY_GC_TIME_MS = 1000 * 60 * 30;

interface AbsLibraryEntry {
    item: AudiobookshelfLibraryItem;
    mediaType?: string;
}

type LibraryFilter =
    | 'albums'
    | 'all'
    | 'artists'
    | 'audiobooks'
    | 'playlists'
    | 'podcasts'
    | 'radio'
    | 'songs';

type LibrarySidebarItem = {
    artwork: RecentItem['artwork'];
    fallbackIconKey?: AppIconSelection;
    id: string;
    isPlaying?: boolean;
    isSelected?: boolean;
    mediaType: LibrarySidebarMediaType;
    onClick: () => void;
    onContextMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
    selectedAt: number;
    subtitle: string;
    title: string;
};

type LibrarySidebarMediaType = RecentItem['mediaType'];

const FILTERS: Array<{ id: LibraryFilter; label: string; mediaType?: LibrarySidebarMediaType }> = [
    { id: 'all', label: 'All' },
    { id: 'playlists', label: 'Playlists', mediaType: 'playlist' },
    { id: 'podcasts', label: 'Podcasts', mediaType: 'podcast' },
    { id: 'audiobooks', label: 'Audiobooks', mediaType: 'audiobook' },
    { id: 'albums', label: 'Albums', mediaType: 'album' },
    { id: 'artists', label: 'Artists', mediaType: 'artist' },
    { id: 'songs', label: 'Songs', mediaType: 'song' },
    { id: 'radio', label: 'Radio', mediaType: 'radio' },
];

const FILTER_BROWSE_TARGETS: Partial<Record<LibraryFilter, string>> = {
    albums: AppRoute.LIBRARY_ALBUMS,
    artists: AppRoute.LIBRARY_ALBUM_ARTISTS,
    audiobooks: AppRoute.AUDIOBOOKS,
    playlists: AppRoute.PLAYLISTS,
    podcasts: AppRoute.PODCASTS,
    radio: AppRoute.RADIO,
    songs: AppRoute.LIBRARY_SONGS,
};

const mediaTypeForFilter: Partial<Record<LibraryFilter, LibrarySidebarMediaType>> = {
    albums: 'album',
    artists: 'artist',
    audiobooks: 'audiobook',
    playlists: 'playlist',
    podcasts: 'podcast',
    radio: 'radio',
    songs: 'song',
};

const isSelectedRoute = (pathname: string, routeTarget?: string) =>
    Boolean(
        routeTarget &&
        routeTarget !== AppRoute.HOME &&
        (pathname === routeTarget || pathname.startsWith(`${routeTarget}/`)),
    );

const getRecentRouteTarget = (item: RecentItem) => {
    switch (item.mediaType) {
        case 'album':
            return generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, { albumId: item.itemId });
        case 'artist':
            return generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL, {
                albumArtistId: item.itemId,
            });
        case 'audiobook':
            return AppRoute.AUDIOBOOKS;
        case 'playlist':
            return generatePath(AppRoute.PLAYLISTS_DETAIL_SONGS, { playlistId: item.itemId });
        case 'podcast':
            return generatePath(AppRoute.PODCASTS_DETAIL, { itemId: item.itemId });
        case 'radio':
            return AppRoute.RADIO;
        case 'song':
            return item.song?.albumId
                ? generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, { albumId: item.song.albumId })
                : AppRoute.LIBRARY_SONGS;
    }
};

const getFallbackIcon = (mediaType: LibrarySidebarMediaType): AppIconSelection => {
    switch (mediaType) {
        case 'album':
            return 'album';
        case 'artist':
            return 'artist';
        case 'audiobook':
            return 'metadata';
        case 'playlist':
            return 'playlist';
        case 'podcast':
            return 'microphone';
        case 'radio':
            return 'radio';
        case 'song':
            return 'track';
    }
};

const countText = (count: null | number | undefined, singular: string) => {
    if (typeof count !== 'number') return undefined;
    return `${count} ${singular}${count === 1 ? '' : 's'}`;
};

const withDetail = (type: string, detail?: null | number | string) =>
    detail ? `${type} • ${detail}` : type;

const recentKey = (mediaType: LibrarySidebarMediaType, serverId: string, itemId: string) =>
    playHistoryKey({ itemId, serverId, type: mediaType });

const recentPlaylistFromLibrary = (playlist: Playlist, selectedAt = 0): RecentItem => ({
    artwork: {
        imageId: playlist.imageId,
        imageItemType: LibraryItem.PLAYLIST,
        imageUrl: playlist.imageUrl,
        kind: 'music',
        serverId: playlist._serverId,
    },
    itemId: playlist.id,
    key: recentKey('playlist', playlist._serverId, playlist.id),
    mediaType: 'playlist',
    selectedAt,
    serverId: playlist._serverId,
    subtitle: withDetail('Playlist', countText(playlist.songCount, 'song')),
    title: playlist.name,
});

const recentAlbumFromLibrary = (album: Album, selectedAt = 0): RecentItem => ({
    artwork: {
        imageId: album.imageId,
        imageItemType: LibraryItem.ALBUM,
        imageUrl: album.imageUrl,
        kind: 'music',
        serverId: album._serverId,
    },
    itemId: album.id,
    key: recentKey('album', album._serverId, album.id),
    mediaType: 'album',
    selectedAt,
    serverId: album._serverId,
    subtitle: withDetail('Album', album.albumArtistName || countText(album.songCount, 'song')),
    title: album.name,
});

const recentArtistFromLibrary = (artist: AlbumArtist, selectedAt = 0): RecentItem => ({
    artwork: {
        imageId: artist.imageId,
        imageItemType: LibraryItem.ALBUM_ARTIST,
        imageUrl: artist.imageUrl,
        kind: 'music',
        serverId: artist._serverId,
        shape: 'circle',
    },
    itemId: artist.id,
    key: recentKey('artist', artist._serverId, artist.id),
    mediaType: 'artist',
    selectedAt,
    serverId: artist._serverId,
    subtitle: withDetail('Artist', countText(artist.albumCount, 'album')),
    title: artist.name,
});

const recentSongFromLibrary = (song: Song, selectedAt = 0): RecentItem => ({
    artwork: {
        imageId: song.imageId,
        imageItemType: LibraryItem.SONG,
        imageUrl: song.imageUrl,
        kind: 'music',
        serverId: song._serverId,
    },
    itemId: song.id,
    key: recentKey('song', song._serverId, song.id),
    mediaType: 'song',
    selectedAt,
    serverId: song._serverId,
    song,
    subtitle: withDetail('Song', song.artistName || song.album),
    title: song.name,
});

const recentRadioFromLibrary = (
    station: InternetRadioStation,
    serverId: string,
    selectedAt = 0,
): RecentItem => ({
    artwork: {
        imageId: station.imageId,
        imageItemType: LibraryItem.RADIO_STATION,
        imageUrl: station.imageUrl,
        kind: 'music',
        serverId,
    },
    itemId: station.id,
    key: recentKey('radio', serverId, station.id),
    mediaType: 'radio',
    radioStreamUrl: station.streamUrl,
    selectedAt,
    serverId,
    subtitle: withDetail('Radio', station.homepageUrl || 'Internet station'),
    title: station.name,
});

const getAbsTitle = (item: AudiobookshelfLibraryItem) =>
    item.media?.metadata?.title ?? item.name ?? 'Untitled';

const getAbsAuthor = (item: AudiobookshelfLibraryItem) => {
    const meta = item.media?.metadata;
    return (
        meta?.author ??
        meta?.authorName ??
        item.media?.authorName ??
        meta?.authors?.map((author) => author.name).join(', ') ??
        item.media?.authors?.map((author) => author.name).join(', ') ??
        ''
    );
};

const recentAudiobookFromLibrary = (
    item: AudiobookshelfLibraryItem,
    serverId: string,
    selectedAt = 0,
): RecentItem => {
    const publishedYear =
        item.media?.metadata?.publishedYear ?? item.media?.publishedYear ?? undefined;

    return {
        artwork: {
            fallbackIcon: 'metadata',
            itemId: item.id,
            kind: 'abs',
        },
        itemId: item.id,
        key: recentKey('audiobook', serverId, item.id),
        mediaType: 'audiobook',
        rawAbsItem: item,
        selectedAt,
        serverId,
        subtitle: withDetail('Audiobook', getAbsAuthor(item) || publishedYear),
        title: getAbsTitle(item),
    };
};

const recentPodcastFromLibrary = (
    item: AudiobookshelfLibraryItem,
    serverId: string,
    selectedAt = 0,
): RecentItem => ({
    artwork: {
        fallbackIcon: 'microphone',
        itemId: item.id,
        kind: 'abs',
    },
    itemId: item.id,
    key: recentKey('podcast', serverId, item.id),
    mediaType: 'podcast',
    rawAbsItem: item,
    selectedAt,
    serverId,
    subtitle: withDetail('Podcast', countText(item.numEpisodes, 'episode') || getAbsAuthor(item)),
    title: getAbsTitle(item),
});

const mergeLibraryItemsWithRecents = (
    libraryItems: RecentItem[],
    recentItems: RecentItem[],
    mediaType: LibrarySidebarMediaType,
) => {
    const libraryKeys = new Set(libraryItems.map((item) => item.key));
    const orphanedRecentItems = recentItems.filter(
        (item) => item.mediaType === mediaType && !libraryKeys.has(item.key),
    );

    return [...libraryItems, ...orphanedRecentItems].sort((a, b) => {
        if (a.selectedAt !== b.selectedAt) return b.selectedAt - a.selectedAt;
        return a.title.localeCompare(b.title);
    });
};

export const LibrarySidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const musicServer = useCurrentServer();
    const audiobookshelfServer = useAudiobookshelfServer();
    const permissions = usePermissions();
    const recentItems = useRecentItems();
    const radioControls = useRadioControls();
    const { currentStreamUrl, isPlaying: isRadioPlaying } = useRadioPlayer();
    const audiobookActions = useAudiobookActions();
    const currentSong = usePlayerSong();
    const player = usePlayer();
    const playerStatus = usePlayerStatus();
    const playbackSource = usePlaybackSource();
    const activeAudiobookItem = useAudiobookItem();
    const activePodcastItem = usePodcastItem();
    const [activeFilter, setActiveFilter] = useState<LibraryFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const musicServerId = musicServer?.id ?? '';
    const absServerId = audiobookshelfServer?.id ?? '';
    const hasMusicServer = Boolean(musicServerId);
    const hasAbsServer = Boolean(absServerId);
    const playerIsPlaying = playerStatus === PlayerStatus.PLAYING;
    const shouldLoadAbsTypeView =
        hasAbsServer && (activeFilter === 'audiobooks' || activeFilter === 'podcasts');

    const playlistsQuery = useQuery({
        ...playlistsQueries.list({
            query: {
                limit: SIDEBAR_TYPE_VIEW_LIMIT,
                sortBy: PlaylistListSort.UPDATED_AT,
                sortOrder: SortOrder.DESC,
                startIndex: 0,
            },
            serverId: musicServerId,
        }),
        enabled: hasMusicServer && activeFilter === 'playlists',
        staleTime: 1000 * 60 * 5,
    });

    const radioQuery = useQuery({
        ...radioQueries.list({
            query: undefined,
            serverId: musicServerId,
        }),
        enabled: hasMusicServer && activeFilter === 'radio',
        staleTime: 1000 * 60 * 5,
    });

    const albumsQuery = useQuery({
        ...albumQueries.list({
            query: {
                limit: SIDEBAR_TYPE_VIEW_LIMIT,
                sortBy: AlbumListSort.NAME,
                sortOrder: SortOrder.ASC,
                startIndex: 0,
            },
            serverId: musicServerId,
        }),
        enabled: hasMusicServer && activeFilter === 'albums',
        staleTime: 1000 * 60 * 5,
    });

    const artistsQuery = useQuery({
        ...artistsQueries.albumArtistList({
            query: {
                limit: SIDEBAR_TYPE_VIEW_LIMIT,
                sortBy: AlbumArtistListSort.NAME,
                sortOrder: SortOrder.ASC,
                startIndex: 0,
            },
            serverId: musicServerId,
        }),
        enabled: hasMusicServer && activeFilter === 'artists',
        staleTime: 1000 * 60 * 5,
    });

    const songsQuery = useQuery({
        ...songsQueries.list({
            query: {
                limit: SIDEBAR_TYPE_VIEW_LIMIT,
                sortBy: SongListSort.NAME,
                sortOrder: SortOrder.ASC,
                startIndex: 0,
            },
            serverId: musicServerId,
        }),
        enabled: hasMusicServer && activeFilter === 'songs',
        staleTime: 1000 * 60 * 5,
    });

    const absLibrariesQuery = useQuery({
        enabled: shouldLoadAbsTypeView,
        gcTime: ABS_LIBRARY_GC_TIME_MS,
        queryFn: () => audiobookshelfController.getLibraries(audiobookshelfServer!),
        queryKey: ['audiobookshelf', 'libraries', absServerId],
        staleTime: ABS_LIBRARY_STALE_TIME_MS,
    });

    const absLibraries = useMemo(
        () => absLibrariesQuery.data?.libraries ?? [],
        [absLibrariesQuery.data?.libraries],
    );

    const absTypeLibraries = useMemo<AudiobookshelfLibrary[]>(() => {
        if (activeFilter === 'audiobooks') {
            return absLibraries.filter((library) => library.mediaType === 'book');
        }
        if (activeFilter === 'podcasts') {
            return absLibraries.filter((library) => library.mediaType === 'podcast');
        }
        return [];
    }, [absLibraries, activeFilter]);

    const absItemQueries = useQueries({
        queries: absTypeLibraries.map((library) => ({
            enabled: shouldLoadAbsTypeView,
            gcTime: ABS_LIBRARY_GC_TIME_MS,
            queryFn: () =>
                audiobookshelfController.getLibraryItems(audiobookshelfServer!, library.id),
            queryKey: ['audiobookshelf', 'library-items', absServerId, library.id],
            staleTime: ABS_LIBRARY_STALE_TIME_MS,
        })),
    });

    const absEntries = useMemo<AbsLibraryEntry[]>(
        () =>
            absItemQueries.flatMap((query, index) => {
                const library = absTypeLibraries[index];
                return (query.data?.results ?? []).map((item) => ({
                    item,
                    mediaType: item.mediaType ?? library?.mediaType,
                }));
            }),
        [absItemQueries, absTypeLibraries],
    );

    const audiobookEntries = useMemo(
        () =>
            absEntries.filter(
                (entry) => entry.mediaType === 'book' || entry.item.mediaType === 'book',
            ),
        [absEntries],
    );

    const podcastEntries = useMemo(
        () =>
            absEntries.filter(
                (entry) =>
                    entry.mediaType === 'podcast' ||
                    entry.item.mediaType === 'podcast' ||
                    Boolean(entry.item.media?.episodes),
            ),
        [absEntries],
    );

    const currentMusicArtistIds = useMemo(
        () =>
            new Set(
                [...(currentSong?.albumArtists ?? []), ...(currentSong?.artists ?? [])].map(
                    (artist) => artist.id,
                ),
            ),
        [currentSong?.albumArtists, currentSong?.artists],
    );

    const openRecentItem = useCallback(
        (item: RecentItem) => {
            switch (item.mediaType) {
                case 'album':
                    navigate(
                        generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, { albumId: item.itemId }),
                    );
                    return;
                case 'artist':
                    navigate(
                        generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL, {
                            albumArtistId: item.itemId,
                        }),
                    );
                    recordRecentItem({ ...item, selectedAt: Date.now() });
                    return;
                case 'playlist':
                    navigate(
                        generatePath(AppRoute.PLAYLISTS_DETAIL_SONGS, {
                            playlistId: item.itemId,
                        }),
                    );
                    recordRecentItem({ ...item, selectedAt: Date.now() });
                    return;
                case 'podcast':
                    navigate(generatePath(AppRoute.PODCASTS_DETAIL, { itemId: item.itemId }));
                    recordRecentItem({ ...item, selectedAt: Date.now() });
                    return;
                case 'radio':
                    if (!item.radioStreamUrl) {
                        navigate(AppRoute.RADIO);
                        return;
                    }
                    if (currentStreamUrl === item.radioStreamUrl && isRadioPlaying) {
                        radioControls.stop();
                        return;
                    }
                    recordRecentItem({ ...item, selectedAt: Date.now() });
                    radioControls.play(item.radioStreamUrl, item.title, {
                        id: item.itemId,
                        imageId: item.artwork.kind === 'music' ? item.artwork.imageId : undefined,
                        imageUrl: item.artwork.kind === 'music' ? item.artwork.imageUrl : undefined,
                        serverId: item.serverId,
                    });
                    return;
                case 'song':
                    if (item.song) {
                        player.addToQueueByData([item.song], Play.NOW);
                    }
                    return;
                case 'audiobook':
                    if (audiobookshelfServer && item.rawAbsItem) {
                        audiobookActions.play(audiobookshelfServer, item.rawAbsItem);
                    } else {
                        navigate(AppRoute.AUDIOBOOKS);
                    }
            }
        },
        [
            audiobookActions,
            audiobookshelfServer,
            currentStreamUrl,
            isRadioPlaying,
            navigate,
            player,
            radioControls,
        ],
    );

    const recentItemsByKey = useMemo(
        () => new Map(recentItems.map((item) => [item.key, item])),
        [recentItems],
    );

    const toSidebarItem = useCallback(
        (item: RecentItem): LibrarySidebarItem => {
            const routeTarget = getRecentRouteTarget(item);
            const isCurrentSong =
                playbackSource === 'music' &&
                item.mediaType === 'song' &&
                currentSong?.id === item.itemId;
            const isCurrentAlbum =
                playbackSource === 'music' &&
                item.mediaType === 'album' &&
                currentSong?.albumId === item.itemId;
            const isCurrentArtist =
                playbackSource === 'music' &&
                item.mediaType === 'artist' &&
                currentMusicArtistIds.has(item.itemId);
            const isCurrentRadio =
                item.mediaType === 'radio' && currentStreamUrl === item.radioStreamUrl;
            const isCurrentAudiobook =
                playbackSource === 'audiobook' &&
                item.mediaType === 'audiobook' &&
                activeAudiobookItem?.id === item.itemId;
            const isCurrentPodcast =
                playbackSource === 'podcast' &&
                item.mediaType === 'podcast' &&
                activePodcastItem?.id === item.itemId;

            return {
                artwork: item.artwork,
                fallbackIconKey: getFallbackIcon(item.mediaType),
                id: item.key,
                isPlaying:
                    (isCurrentRadio && isRadioPlaying) ||
                    ((isCurrentSong ||
                        isCurrentAlbum ||
                        isCurrentArtist ||
                        isCurrentAudiobook ||
                        isCurrentPodcast) &&
                        playerIsPlaying),
                isSelected: isSelectedRoute(location.pathname, routeTarget),
                mediaType: item.mediaType,
                onClick: () => openRecentItem(item),
                onContextMenu: item.song
                    ? (event) => {
                          event.preventDefault();
                          ContextMenuController.call({
                              cmd: { items: [item.song!], type: LibraryItem.SONG },
                              event,
                          });
                      }
                    : undefined,
                selectedAt: item.selectedAt,
                subtitle: item.subtitle,
                title: item.title,
            };
        },
        [
            activeAudiobookItem?.id,
            activePodcastItem?.id,
            currentMusicArtistIds,
            currentSong?.albumId,
            currentSong?.id,
            currentStreamUrl,
            isRadioPlaying,
            location.pathname,
            openRecentItem,
            playbackSource,
            playerIsPlaying,
        ],
    );

    const recentSidebarItems = useMemo(
        () =>
            recentItems
                .slice()
                .sort((a, b) => b.selectedAt - a.selectedAt)
                .map(toSidebarItem),
        [recentItems, toSidebarItem],
    );

    const playlistSidebarItems = useMemo(() => {
        const libraryItems = (playlistsQuery.data?.items ?? []).map((playlist) => {
            const key = recentKey('playlist', playlist._serverId, playlist.id);
            return recentPlaylistFromLibrary(playlist, recentItemsByKey.get(key)?.selectedAt ?? 0);
        });

        return mergeLibraryItemsWithRecents(libraryItems, recentItems, 'playlist').map(
            toSidebarItem,
        );
    }, [playlistsQuery.data?.items, recentItems, recentItemsByKey, toSidebarItem]);

    const radioSidebarItems = useMemo(() => {
        const libraryItems = (radioQuery.data ?? []).map((station) => {
            const key = recentKey('radio', musicServerId, station.id);
            return recentRadioFromLibrary(
                station,
                musicServerId,
                recentItemsByKey.get(key)?.selectedAt ?? 0,
            );
        });

        return mergeLibraryItemsWithRecents(libraryItems, recentItems, 'radio').map(toSidebarItem);
    }, [musicServerId, radioQuery.data, recentItems, recentItemsByKey, toSidebarItem]);

    const albumSidebarItems = useMemo(() => {
        const libraryItems = (albumsQuery.data?.items ?? []).map((album) => {
            const key = recentKey('album', album._serverId, album.id);
            return recentAlbumFromLibrary(album, recentItemsByKey.get(key)?.selectedAt ?? 0);
        });
        return mergeLibraryItemsWithRecents(libraryItems, recentItems, 'album').map(toSidebarItem);
    }, [albumsQuery.data?.items, recentItems, recentItemsByKey, toSidebarItem]);

    const artistSidebarItems = useMemo(() => {
        const libraryItems = (artistsQuery.data?.items ?? []).map((artist) => {
            const key = recentKey('artist', artist._serverId, artist.id);
            return recentArtistFromLibrary(artist, recentItemsByKey.get(key)?.selectedAt ?? 0);
        });
        return mergeLibraryItemsWithRecents(libraryItems, recentItems, 'artist').map(toSidebarItem);
    }, [artistsQuery.data?.items, recentItems, recentItemsByKey, toSidebarItem]);

    const songSidebarItems = useMemo(() => {
        const libraryItems = (songsQuery.data?.items ?? []).map((song) => {
            const key = recentKey('song', song._serverId, song.id);
            return recentSongFromLibrary(song, recentItemsByKey.get(key)?.selectedAt ?? 0);
        });
        return mergeLibraryItemsWithRecents(libraryItems, recentItems, 'song').map(toSidebarItem);
    }, [songsQuery.data?.items, recentItems, recentItemsByKey, toSidebarItem]);

    const audiobookSidebarItems = useMemo(() => {
        const libraryItems = audiobookEntries.map(({ item }) => {
            const key = recentKey('audiobook', absServerId, item.id);
            return recentAudiobookFromLibrary(
                item,
                absServerId,
                recentItemsByKey.get(key)?.selectedAt ?? 0,
            );
        });

        return mergeLibraryItemsWithRecents(libraryItems, recentItems, 'audiobook').map(
            toSidebarItem,
        );
    }, [absServerId, audiobookEntries, recentItems, recentItemsByKey, toSidebarItem]);

    const podcastSidebarItems = useMemo(() => {
        const libraryItems = podcastEntries.map(({ item }) => {
            const key = recentKey('podcast', absServerId, item.id);
            return recentPodcastFromLibrary(
                item,
                absServerId,
                recentItemsByKey.get(key)?.selectedAt ?? 0,
            );
        });

        return mergeLibraryItemsWithRecents(libraryItems, recentItems, 'podcast').map(
            toSidebarItem,
        );
    }, [absServerId, podcastEntries, recentItems, recentItemsByKey, toSidebarItem]);

    const baseRows = useMemo(() => {
        if (activeFilter === 'playlists') return playlistSidebarItems;
        if (activeFilter === 'radio') return radioSidebarItems;
        if (activeFilter === 'audiobooks') return audiobookSidebarItems;
        if (activeFilter === 'podcasts') return podcastSidebarItems;
        if (activeFilter === 'albums') return albumSidebarItems;
        if (activeFilter === 'artists') return artistSidebarItems;
        if (activeFilter === 'songs') return songSidebarItems;

        const mediaType = mediaTypeForFilter[activeFilter];
        const filteredRows = mediaType
            ? recentSidebarItems.filter((item) => item.mediaType === mediaType)
            : recentSidebarItems;
        return filteredRows.slice(0, SIDEBAR_ITEM_LIMIT);
    }, [
        activeFilter,
        albumSidebarItems,
        artistSidebarItems,
        audiobookSidebarItems,
        playlistSidebarItems,
        podcastSidebarItems,
        radioSidebarItems,
        recentSidebarItems,
        songSidebarItems,
    ]);

    const rows = useMemo(() => {
        const trimmed = searchQuery.trim().toLowerCase();
        if (!trimmed) return baseRows;
        return baseRows.filter(
            (row) =>
                row.title.toLowerCase().includes(trimmed) ||
                row.subtitle.toLowerCase().includes(trimmed),
        );
    }, [baseRows, searchQuery]);

    const availableFilters = useMemo(() => {
        const availableTypes = new Set(recentSidebarItems.map((item) => item.mediaType));

        return FILTERS.filter((filter) => {
            if (filter.id === 'all') return true;
            if (filter.mediaType && availableTypes.has(filter.mediaType)) return true;

            if (filter.id === 'playlists') return hasMusicServer;
            if (filter.id === 'albums') return hasMusicServer;
            if (filter.id === 'artists') return hasMusicServer;
            if (filter.id === 'songs') return hasMusicServer;
            if (filter.id === 'radio') return hasMusicServer;
            if (filter.id === 'audiobooks') return hasAbsServer;
            if (filter.id === 'podcasts') return hasAbsServer;

            return false;
        });
    }, [hasAbsServer, hasMusicServer, recentSidebarItems]);

    const browseTarget = FILTER_BROWSE_TARGETS[activeFilter];
    const isLoading =
        (activeFilter === 'playlists' && playlistsQuery.isLoading) ||
        (activeFilter === 'radio' && radioQuery.isLoading) ||
        (activeFilter === 'albums' && albumsQuery.isLoading) ||
        (activeFilter === 'artists' && artistsQuery.isLoading) ||
        (activeFilter === 'songs' && songsQuery.isLoading) ||
        (shouldLoadAbsTypeView &&
            (absLibrariesQuery.isLoading ||
                absItemQueries.some((query) => query.isLoading || query.isPending)));
    const createAction =
        activeFilter === 'all' || activeFilter === 'playlists'
            ? {
                  label: 'Create playlist',
                  onClick: (event: MouseEvent<HTMLButtonElement>) =>
                      openCreatePlaylistModal(musicServer, event),
              }
            : activeFilter === 'radio' && permissions.radio.create
              ? {
                    label: 'Create radio station',
                    onClick: (event: MouseEvent<HTMLButtonElement>) =>
                        openCreateRadioStationModal(musicServer, event),
                }
              : null;

    return (
        <div className={styles.libraryShell}>
            <LibrarySidebarHeader
                browseTarget={browseTarget}
                createAction={createAction}
                onBrowse={(target) => navigate(target)}
            />

            <LibraryFilterChips
                activeFilter={activeFilter}
                filters={availableFilters}
                onChange={setActiveFilter}
            />

            <LibrarySidebarToolbar
                onChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
                value={searchQuery}
            />

            <div className={styles.rowList}>
                {isLoading && rows.length === 0 ? (
                    <LibraryState label="Loading library..." />
                ) : rows.length === 0 ? (
                    <LibraryState label="Nothing to show yet." />
                ) : (
                    rows.map((row) => <LibrarySidebarRow item={row} key={row.id} />)
                )}
            </div>
        </div>
    );
};

const LibrarySidebarHeader = ({
    browseTarget,
    createAction,
    onBrowse,
}: {
    browseTarget?: string;
    createAction: null | {
        label: string;
        onClick: (event: MouseEvent<HTMLButtonElement>) => void;
    };
    onBrowse: (target: string) => void;
}) => (
    <div className={styles.header}>
        <div className={styles.titleGroup}>
            <span className={styles.titleIcon}>
                <Icon icon="library" size="lg" />
            </span>
            <h2 className={styles.title}>Your Library</h2>
        </div>
        <div className={styles.headerActions}>
            {createAction ? (
                <ActionIcon
                    icon="plus"
                    onClick={createAction.onClick}
                    size="sm"
                    tooltip={{
                        label: createAction.label,
                        openDelay: 500,
                    }}
                    variant="subtle"
                />
            ) : null}
            {browseTarget ? (
                <ActionIcon
                    icon="layoutList"
                    onClick={() => onBrowse(browseTarget)}
                    size="sm"
                    tooltip={{
                        label: 'Open full view',
                        openDelay: 500,
                    }}
                    variant="subtle"
                />
            ) : null}
        </div>
    </div>
);

const LibraryFilterChips = ({
    activeFilter,
    filters,
    onChange,
}: {
    activeFilter: LibraryFilter;
    filters: Array<{ id: LibraryFilter; label: string }>;
    onChange: (filter: LibraryFilter) => void;
}) => (
    <div aria-label="Library filters" className={styles.filterPills}>
        {filters.map((filter) => (
            <button
                className={clsx(styles.filterPill, {
                    [styles.filterPillActive]: activeFilter === filter.id,
                })}
                key={filter.id}
                onClick={() => onChange(filter.id)}
                type="button"
            >
                {filter.label}
            </button>
        ))}
    </div>
);

const LibrarySidebarToolbar = ({
    onChange,
    onClear,
    value,
}: {
    onChange: (value: string) => void;
    onClear: () => void;
    value: string;
}) => {
    const [isExpanded, setIsExpanded] = useState(value.length > 0);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const openSearch = useCallback(() => {
        setIsExpanded(true);
        // Defer focus until the input is mounted by React.
        requestAnimationFrame(() => inputRef.current?.focus());
    }, []);

    const closeSearch = useCallback(() => {
        onClear();
        setIsExpanded(false);
    }, [onClear]);

    if (isExpanded) {
        return (
            <div aria-label="Library tools" className={styles.utilityRow}>
                <input
                    aria-label="Filter library"
                    className={styles.utilitySearchInput}
                    onBlur={() => {
                        if (!value) setIsExpanded(false);
                    }}
                    onChange={(event) => onChange(event.currentTarget.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                            closeSearch();
                        }
                    }}
                    placeholder="Search in library..."
                    ref={inputRef}
                    type="text"
                    value={value}
                />
                <button
                    aria-label="Close search"
                    className={styles.utilityIconButton}
                    onClick={closeSearch}
                    type="button"
                >
                    <Icon icon="x" size="sm" />
                </button>
            </div>
        );
    }

    return (
        <div aria-label="Library tools" className={styles.utilityRow}>
            <button
                aria-label="Search library"
                className={styles.utilityIconButton}
                onClick={openSearch}
                type="button"
            >
                <Icon icon="search" size="sm" />
            </button>
            <span className={styles.utilitySort}>
                <Icon icon="sortDesc" size="sm" />
                Recents
            </span>
        </div>
    );
};

const LibraryState = ({ label }: { label: string }) => (
    <div className={styles.state}>
        <Icon icon="library" size="lg" />
        <span>{label}</span>
    </div>
);

const LibrarySidebarRow = ({ item }: { item: LibrarySidebarItem }) => (
    <button
        className={clsx(styles.row, {
            [styles.rowCircleArt]: item.artwork.kind === 'music' && item.artwork.shape === 'circle',
            [styles.rowPlaying]: item.isPlaying,
            [styles.rowSelected]: item.isSelected,
        })}
        onClick={item.onClick}
        onContextMenu={item.onContextMenu}
        type="button"
    >
        <div className={styles.rowArt}>
            <LibraryArtwork item={item} />
        </div>
        <div className={styles.rowText}>
            <span className={styles.rowTitle}>{item.title}</span>
            <span className={styles.rowSubtitle}>{item.subtitle}</span>
        </div>
    </button>
);

const LibraryArtwork = ({ item }: { item: LibrarySidebarItem }): ReactNode => {
    if (item.artwork.kind === 'icon') {
        return (
            <Icon
                icon={(item.artwork.fallbackIconKey as AppIconSelection) ?? item.fallbackIconKey}
                size="lg"
            />
        );
    }

    if (item.artwork.kind === 'abs') {
        return (
            <AbsCoverImage
                alt={item.title}
                fallbackIcon={item.artwork.fallbackIcon}
                itemId={item.artwork.itemId}
            />
        );
    }

    return (
        <ItemImage
            alt={item.title}
            enableViewport={false}
            id={item.artwork.imageId}
            imageContainerProps={{
                className: styles.rowImageContainer,
            }}
            itemType={item.artwork.imageItemType}
            serverId={item.artwork.serverId}
            src={item.artwork.imageUrl}
            type="table"
        />
    );
};
