import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useMemo } from 'react';
import { generatePath, Link, useNavigate } from 'react-router';

import styles from './home-sections.module.css';

import { api } from '/@/renderer/api';
import {
    GridCarousel,
    useGridCarouselContainerQuery,
} from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import itemCardControlsStyles from '/@/renderer/components/item-card/item-card-controls.module.css';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { AppRoute } from '/@/renderer/router/routes';
import { PlayButton } from '/@/renderer/features/shared/components/play-button';
import { recordRecentArtist, recordRecentPlaylist, useCurrentServer, useCurrentServerId } from '/@/renderer/store';
import {
    useFavoritePlaylistIds,
    useLibraryFavoritesActions,
} from '/@/renderer/store/library-favorites.store';
import { formatDateRelative, formatDurationStringShort } from '/@/renderer/utils/format';
import { Button } from '/@/shared/components/button/button';
import { Icon } from '/@/shared/components/icon/icon';
import { TextTitle } from '/@/shared/components/text-title/text-title';
import { Text } from '/@/shared/components/text/text';
import {
    Album,
    AlbumArtist,
    AlbumArtistListSort,
    AlbumListSort,
    LibraryItem,
    Playlist,
    PlaylistListSort,
    ServerType,
    Song,
    SongListSort,
    SortOrder,
} from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';

const SHELF_LIMIT = 8;
const LIST_LIMIT = 10;

const HomeHeader = ({ title, to }: { title: string; to?: string }) => (
    <div className={styles.sectionHeader}>
        <TextTitle fw={700} isNoSelect order={3}>
            {title}
        </TextTitle>
        {to ? (
            <Button component={Link} size="compact-sm" to={to} variant="subtle">
                View all
            </Button>
        ) : null}
    </div>
);

const getSongSubtitle = (song: Song) =>
    [song.artistName, song.album].filter(Boolean).join(' - ') || 'Track';

const getCountText = (count: null | number | undefined, label: string) => {
    if (typeof count !== 'number') return undefined;
    return `${count} ${label}${count === 1 ? '' : 's'}`;
};

const useAlbums = (sortBy: AlbumListSort, sortOrder: SortOrder, query?: { favorite?: boolean }) => {
    const serverId = useCurrentServerId();

    return useQuery({
        enabled: Boolean(serverId),
        queryFn: ({ signal }) =>
            api.controller.getAlbumList({
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
        queryFn: ({ signal }) =>
            api.controller.getAlbumArtistList({
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
        enabled: Boolean(serverId) && !favoritesQuery.data?.items?.length,
        queryFn: ({ signal }) =>
            api.controller.getAlbumArtistList({
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

const useSongs = (
    key: string,
    sortBy: SongListSort,
    sortOrder: SortOrder,
    limit = LIST_LIMIT,
    query?: { favorite?: boolean },
) => {
    const serverId = useCurrentServerId();

    return useQuery({
        enabled: Boolean(serverId),
        queryFn: ({ signal }) =>
            api.controller.getSongList({
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

export const HomeFavoritePlaylists = ({
    containerQuery,
}: {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
}) => {
    const navigate = useNavigate();
    const player = usePlayer();
    const serverId = useCurrentServerId();
    const favoritePlaylistIds = useFavoritePlaylistIds(serverId);
    const favoritesActions = useLibraryFavoritesActions();

    const playlistsQuery = useQuery({
        enabled: Boolean(serverId),
        queryFn: ({ signal }) =>
            api.controller.getPlaylistList({
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

    const allPlaylists = playlistsQuery.data?.items ?? [];

    const playlists = useMemo(() => {
        const favorites = allPlaylists.filter((p) => favoritePlaylistIds.has(p.id));
        const nonFavorites = allPlaylists.filter((p) => !favoritePlaylistIds.has(p.id));
        return [...favorites, ...nonFavorites].slice(0, SHELF_LIMIT);
    }, [allPlaylists, favoritePlaylistIds]);

    if (!playlists.length) return null;

    const handlePlay = (playlist: Playlist, playType: Play) => {
        recordRecentPlaylist(playlist);
        player.addToQueueByFetch(playlist._serverId, [playlist.id], LibraryItem.PLAYLIST, playType);
    };

    const cards = playlists.map((playlist) => ({
        content: (
            <PlaylistCard
                isFavorite={favoritePlaylistIds.has(playlist.id)}
                onClick={() =>
                    navigate(
                        generatePath(AppRoute.PLAYLISTS_DETAIL_SONGS, {
                            playlistId: playlist.id,
                        }),
                    )
                }
                onPlay={(playType) => handlePlay(playlist, playType)}
                onToggleFavorite={() =>
                    favoritesActions.toggle('playlist', playlist._serverId, playlist.id)
                }
                playlist={playlist}
            />
        ),
        id: playlist.id,
    }));

    return (
        <GridCarousel
            cards={cards}
            containerQuery={containerQuery}
            hasNextPage={false}
            onNextPage={() => {}}
            onPrevPage={() => {}}
            rowCount={1}
            title={<HomeHeader title="Playlists" to={AppRoute.PLAYLISTS} />}
        />
    );
};

const PlaylistCard = ({
    isFavorite,
    onClick,
    onPlay,
    onToggleFavorite,
    playlist,
}: {
    isFavorite: boolean;
    onClick: () => void;
    onPlay: (playType: Play) => void;
    onToggleFavorite: () => void;
    playlist: Playlist;
}) => {
    const openContextMenu = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        ContextMenuController.call({
            cmd: { items: [playlist], type: LibraryItem.PLAYLIST },
            event,
        });
    };

    return (
        <div
            className={styles.mediaCard}
            onClick={onClick}
            onContextMenu={openContextMenu}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onClick();
                }
            }}
            role="button"
            tabIndex={0}
        >
            <div className={styles.mediaArt}>
                {playlist.imageId || playlist.imageUrl ? (
                    <ItemImage
                        alt={playlist.name}
                        enableViewport={false}
                        id={playlist.imageId}
                        imageContainerProps={{ className: styles.imageContainer }}
                        itemType={LibraryItem.PLAYLIST}
                        serverId={playlist._serverId}
                        src={playlist.imageUrl}
                        type="itemCard"
                    />
                ) : (
                    <div className={styles.playlistPlaceholder}>
                        <Icon icon="playlist" size="34%" />
                    </div>
                )}
                <span className={styles.badge}>
                    <Icon icon="playlist" size="0.78rem" />
                    Playlist
                </span>
                <span className={styles.playlistControls}>
                    <PlayButton
                        classNames={clsx(
                            itemCardControlsStyles.playButton,
                            itemCardControlsStyles.primary,
                            styles.playlistPrimaryControl,
                        )}
                        fill
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onPlay(Play.NOW);
                        }}
                    />
                    <PlayButton
                        classNames={clsx(
                            itemCardControlsStyles.playButton,
                            itemCardControlsStyles.secondary,
                            itemCardControlsStyles.right,
                            styles.playlistSecondaryControl,
                        )}
                        icon="mediaShuffle"
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onPlay(Play.SHUFFLE);
                        }}
                    />
                    <button
                        className={clsx(
                            styles.overlayBtn,
                            styles.overlayHeart,
                            isFavorite && styles.favoriteActive,
                        )}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onToggleFavorite();
                        }}
                        type="button"
                    >
                        <Icon icon="favorite" size="lg" />
                    </button>
                    <button
                        className={clsx(styles.overlayBtn, styles.overlayOptions)}
                        onClick={openContextMenu}
                        type="button"
                    >
                        <Icon icon="ellipsisHorizontal" size="lg" />
                    </button>
                </span>
            </div>
            <Text className={styles.title} fw={600} size="sm">
                {playlist.name}
            </Text>
            <Text className={styles.subtitle} isMuted size="xs">
                {getCountText(playlist.songCount, 'track') ?? 'Playlist'}
            </Text>
        </div>
    );
};

export const HomeFavoriteArtists = ({
    containerQuery,
}: {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
}) => {
    const navigate = useNavigate();
    const artistsQuery = useArtists();
    const artists = artistsQuery.data?.items ?? [];

    if (!artists.length) return null;

    const cards = artists.map((artist) => ({
        content: (
            <ArtistCard
                artist={artist}
                onClick={() => {
                    recordRecentArtist(artist);
                    navigate(
                        generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL, {
                            albumArtistId: artist.id,
                        }),
                    );
                }}
            />
        ),
        id: artist.id,
    }));

    return (
        <GridCarousel
            cards={cards}
            containerQuery={containerQuery}
            hasNextPage={false}
            onNextPage={() => {}}
            onPrevPage={() => {}}
            rowCount={1}
            title={<HomeHeader title="Artists" to={AppRoute.LIBRARY_ALBUM_ARTISTS} />}
        />
    );
};

const ArtistCard = ({ artist, onClick }: { artist: AlbumArtist; onClick: () => void }) => (
    <button
        className={styles.artistCard}
        onClick={onClick}
        onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();

            ContextMenuController.call({
                cmd: {
                    items: [artist],
                    type: LibraryItem.ALBUM_ARTIST,
                },
                event,
            });
        }}
        type="button"
    >
        <div className={styles.artistArt}>
            <ItemImage
                alt={artist.name}
                enableViewport={false}
                id={artist.imageId}
                imageContainerProps={{ className: styles.imageContainer }}
                itemType={LibraryItem.ALBUM_ARTIST}
                serverId={artist._serverId}
                src={artist.imageUrl}
                type="itemCard"
            />
        </div>
        <Text className={styles.title} fw={650} size="sm">
            {artist.name}
        </Text>
        <Text className={styles.subtitle} isMuted size="xs">
            {getCountText(artist.albumCount, 'album') ?? getCountText(artist.songCount, 'track')}
        </Text>
    </button>
);

export const HomeFavoriteTracks = () => {
    const serverId = useCurrentServerId();

    const favoritesQuery = useSongs('favorites', SongListSort.FAVORITED, SortOrder.DESC, LIST_LIMIT, {
        favorite: true,
    });

    const recentlyPlayedQuery = useQuery({
        enabled: Boolean(serverId) && !favoritesQuery.data?.items?.length,
        queryFn: ({ signal }) =>
            api.controller.getSongList({
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

    if (!songs.length) return null;

    return (
        <section className={styles.section}>
            <HomeHeader title="Tracks" to={AppRoute.LIBRARY_SONGS} />
            <div className={styles.trackList}>
                {songs.map((song) => (
                    <TrackRow key={song.id} song={song} />
                ))}
            </div>
        </section>
    );
};

const TrackRow = ({ song }: { song: Song }) => {
    const player = usePlayer();

    return (
        <button
            className={styles.trackRow}
            onClick={() => player.addToQueueByData([song], Play.NOW)}
            onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();

                ContextMenuController.call({
                    cmd: {
                        items: [song],
                        type: LibraryItem.SONG,
                    },
                    event,
                });
            }}
            type="button"
        >
            <div className={styles.trackThumb}>
                <ItemImage
                    alt={song.name}
                    enableViewport={false}
                    id={song.imageId}
                    imageContainerProps={{ className: styles.imageContainer }}
                    itemType={LibraryItem.SONG}
                    serverId={song._serverId}
                    src={song.imageUrl}
                    type="itemCard"
                />
            </div>
            <div className={styles.trackMeta}>
                <Text className={styles.title} fw={650} size="sm">
                    {song.name}
                </Text>
                <Text className={styles.subtitle} isMuted size="xs">
                    {getSongSubtitle(song)}
                </Text>
            </div>
            <Text className={styles.trackExtra} size="xs">
                {formatDurationStringShort(song.duration)}
            </Text>
        </button>
    );
};

export const HomeRediscoverySection = () => {
    const server = useCurrentServer();
    const isJellyfin = server?.type === ServerType.JELLYFIN;
    const songsQuery = useSongs(
        'rediscovery',
        SongListSort.RECENTLY_PLAYED,
        SortOrder.ASC,
        isJellyfin ? 6 : 0,
    );
    const albumsQuery = useAlbums(AlbumListSort.RECENTLY_PLAYED, SortOrder.ASC);
    const songs = isJellyfin ? (songsQuery.data?.items ?? []) : [];
    const albums = !isJellyfin ? (albumsQuery.data?.items ?? []) : [];

    if (!songs.length && !albums.length) return null;

    const feature = albums[0] ?? songs[0];
    const support = (albums.length ? albums.slice(1, 6) : songs.slice(1, 6)) as Array<Album | Song>;

    return (
        <section className={styles.section}>
            <HomeHeader title="Haven't Listened in a Long Time" />
            <div className={styles.editorial}>
                <RediscoveryFeature item={feature} />
                <div className={styles.supportList}>
                    {support.map((item) => (
                        <RediscoverySupport item={item} key={item.id} />
                    ))}
                </div>
            </div>
        </section>
    );
};

const getRediscoveryCopy = (item: Album | Song) => {
    if (item.lastPlayedAt) return `Last played ${formatDateRelative(item.lastPlayedAt)}`;
    if (item.playCount) return `You played this ${item.playCount} times`;
    return 'Rediscover this from your library';
};

const RediscoveryFeature = ({ item }: { item: Album | Song }) => {
    const navigate = useNavigate();
    const player = usePlayer();
    const isSong = item._itemType === LibraryItem.SONG;
    const title = item.name;
    const subtitle = isSong ? getSongSubtitle(item as Song) : (item as Album).albumArtistName;

    const open = () => {
        if (isSong) {
            player.addToQueueByData([item as Song], Play.NOW);
            return;
        }

        navigate(generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, { albumId: item.id }));
    };

    const handleContextMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (isSong) {
            ContextMenuController.call({
                cmd: {
                    items: [item as Song],
                    type: LibraryItem.SONG,
                },
                event,
            });
        } else {
            ContextMenuController.call({
                cmd: {
                    items: [item as Album],
                    type: LibraryItem.ALBUM,
                },
                event,
            });
        }
    };

    return (
        <button
            className={styles.featureCard}
            onClick={open}
            onContextMenu={handleContextMenu}
            type="button"
        >
            <div className={styles.featureArt}>
                <ItemImage
                    alt={title}
                    enableViewport={false}
                    id={item.imageId}
                    imageContainerProps={{ className: styles.imageContainer }}
                    itemType={isSong ? LibraryItem.SONG : LibraryItem.ALBUM}
                    serverId={item._serverId}
                    src={item.imageUrl}
                    type="itemCard"
                />
            </div>
            <div className={styles.trackMeta}>
                <Text isMuted size="xs">
                    Rediscover this
                </Text>
                <Text className={styles.title} fw={750} size="lg">
                    {title}
                </Text>
                <Text className={styles.subtitle} isMuted size="sm">
                    {subtitle}
                </Text>
                <Text className={styles.tertiary} isMuted size="xs">
                    {getRediscoveryCopy(item)}
                </Text>
            </div>
        </button>
    );
};

const RediscoverySupport = ({ item }: { item: Album | Song }) => {
    const player = usePlayer();
    const navigate = useNavigate();
    const isSong = item._itemType === LibraryItem.SONG;

    const open = () => {
        if (isSong) {
            player.addToQueueByData([item as Song], Play.NOW);
            return;
        }

        navigate(generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, { albumId: item.id }));
    };

    const handleContextMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (isSong) {
            ContextMenuController.call({
                cmd: {
                    items: [item as Song],
                    type: LibraryItem.SONG,
                },
                event,
            });
        } else {
            ContextMenuController.call({
                cmd: {
                    items: [item as Album],
                    type: LibraryItem.ALBUM,
                },
                event,
            });
        }
    };

    return (
        <button
            className={styles.discoveryCard}
            onClick={open}
            onContextMenu={handleContextMenu}
            type="button"
        >
            <div className={styles.trackThumb}>
                <ItemImage
                    alt={item.name}
                    enableViewport={false}
                    id={item.imageId}
                    imageContainerProps={{ className: styles.imageContainer }}
                    itemType={isSong ? LibraryItem.SONG : LibraryItem.ALBUM}
                    serverId={item._serverId}
                    src={item.imageUrl}
                    type="itemCard"
                />
            </div>
            <div className={styles.trackMeta}>
                <Text className={styles.title} fw={650} size="sm">
                    {item.name}
                </Text>
                <Text className={styles.subtitle} isMuted size="xs">
                    {getRediscoveryCopy(item)}
                </Text>
            </div>
        </button>
    );
};

export const HomeUnplayedSection = () => {
    const songsQuery = useSongs('unplayed', SongListSort.PLAY_COUNT, SortOrder.ASC, 8);
    const songs = (songsQuery.data?.items ?? []).filter((song) => !song.playCount);

    if (!songs.length) return null;

    return (
        <section className={styles.section}>
            <HomeHeader title="Unplayed in Your Library" to={AppRoute.LIBRARY_SONGS} />
            <div className={styles.discoveryGrid}>
                {songs.map((song) => (
                    <TrackRow key={song.id} song={song} />
                ))}
            </div>
        </section>
    );
};

export const HomeMostPlayedSection = () => {
    const songsQuery = useSongs('most-played', SongListSort.PLAY_COUNT, SortOrder.DESC, LIST_LIMIT);
    const songs = songsQuery.data?.items ?? [];

    if (!songs.length) return null;

    return (
        <section className={styles.section}>
            <HomeHeader title="All-Time Most Played" to={AppRoute.LIBRARY_SONGS} />
            <div className={styles.rankedList}>
                {songs.map((song, index) => (
                    <RankedSongRow index={index + 1} key={song.id} song={song} />
                ))}
            </div>
        </section>
    );
};

const RankedSongRow = ({ index, song }: { index: number; song: Song }) => {
    const player = usePlayer();

    return (
        <button
            className={styles.rankedRow}
            onClick={() => player.addToQueueByData([song], Play.NOW)}
            onContextMenu={(event) => {
                event.preventDefault();
                event.stopPropagation();

                ContextMenuController.call({
                    cmd: {
                        items: [song],
                        type: LibraryItem.SONG,
                    },
                    event,
                });
            }}
            type="button"
        >
            <span className={styles.rank}>{index}</span>
            <div className={styles.trackThumb}>
                <ItemImage
                    alt={song.name}
                    enableViewport={false}
                    id={song.imageId}
                    imageContainerProps={{ className: styles.imageContainer }}
                    itemType={LibraryItem.SONG}
                    serverId={song._serverId}
                    src={song.imageUrl}
                    type="itemCard"
                />
            </div>
            <div className={styles.trackMeta}>
                <Text className={styles.title} fw={650} size="sm">
                    {song.name}
                </Text>
                <Text className={styles.subtitle} isMuted size="xs">
                    {getSongSubtitle(song)}
                </Text>
            </div>
            <Text className={styles.trackExtra} size="xs">
                {song.playCount} plays
            </Text>
        </button>
    );
};
