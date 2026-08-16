import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useMemo, useState } from 'react';
import { generatePath, Link, useNavigate } from 'react-router';

import styles from './home-sections.module.css';

import { api } from '/@/renderer/api';
import {
    fetchSamoDiscoveryHomeTracks,
    fetchSamoExploPlaylist,
} from '/@/renderer/api/samo/samo-controller';
import {
    GridCarousel,
    useGridCarouselContainerQuery,
} from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import itemCardControlsStyles from '/@/renderer/components/item-card/item-card-controls.module.css';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { AlbumInfiniteCarousel } from '/@/renderer/features/albums/components/album-infinite-carousel';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { longFormQueries } from '/@/renderer/features/long-form/api/long-form-queries';
import { LongFormCoverImage } from '/@/renderer/features/player/components/long-form-cover-image';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { PlayButton } from '/@/renderer/features/shared/components/play-button';
import { AppRoute } from '/@/renderer/router/routes';
import {
    getServerById,
    recordRecentArtist,
    recordRecentPlaylist,
    useCurrentServerId,
    useImageRes,
    useLongFormMediaServer,
    usePlayHistoryStore,
} from '/@/renderer/store';
import { useAudiobookActions } from '/@/renderer/store/audiobook.store';
import {
    hiddenHomeItemKey,
    useHiddenHomeIdsByType,
    useHiddenHomeKeys,
} from '/@/renderer/store/hidden-home-items.store';
import {
    useFavoriteAudiobookIds,
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
    Song,
    SongListSort,
    SortOrder,
} from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';

const SHELF_LIMIT = 8;
const LIST_LIMIT = 10;
const HOME_SONG_POOL = 500;
const DISCOVERY_LIMIT = 10;
// Fixed-count shelves fetch a surplus beyond what they display so that hiding an
// item ("Remove from home") backfills the row from the next-best item instead of
// leaving it short. Each shelf filters hidden items, then slices to its display
// limit. (The album shelves use the infinite carousel, which backfills already.)
const SHELF_FETCH_LIMIT = 40;

const shuffleSongs = <T,>(items: T[]): T[] => {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
};

const playlistLastPlayedMs = (playlist: Playlist, localPlayedAtById: ReadonlyMap<string, number>) =>
    Math.max(Date.parse(playlist.lastPlayedAt ?? '') || 0, localPlayedAtById.get(playlist.id) ?? 0);

const sortPlaylistsByLastPlayed = (
    playlists: Playlist[],
    localPlayedAtById: ReadonlyMap<string, number>,
) =>
    [...playlists].sort((left, right) => {
        const leftPlayed = playlistLastPlayedMs(left, localPlayedAtById);
        const rightPlayed = playlistLastPlayedMs(right, localPlayedAtById);
        if (rightPlayed !== leftPlayed) {
            return rightPlayed - leftPlayed;
        }

        const leftUpdated = Date.parse(left.updatedAt ?? left.createdAt ?? '') || 0;
        const rightUpdated = Date.parse(right.updatedAt ?? right.createdAt ?? '') || 0;
        if (rightUpdated !== leftUpdated) {
            return rightUpdated - leftUpdated;
        }

        return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
    });

const pickMostPlayedSongs = (songs: Song[], limit: number) =>
    songs
        .filter((song) => (song.playCount ?? 0) > 0)
        .sort(
            (left, right) =>
                (right.playCount ?? 0) - (left.playCount ?? 0) ||
                left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }),
        )
        .slice(0, limit);

const getUnplayedDiscoverySubtitle = (song: Song) => {
    if (song.createdAt) return `Added ${formatDateRelative(song.createdAt)}`;
    return 'Never played';
};

const HomeHeader = ({ title, to }: { title: string; to?: string }) => (
    <div className={styles.sectionHeader}>
        <TextTitle fw={700} isNoSelect order={2}>
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

const useAlbums = (
    sortBy: AlbumListSort,
    sortOrder: SortOrder,
    query?: { favorite?: boolean },
    options?: { enabled?: boolean },
) => {
    const serverId = useCurrentServerId();

    return useQuery({
        enabled: Boolean(serverId) && (options?.enabled ?? true),
        queryFn: ({ signal }) =>
            api.controller.getAlbumList({
                apiClientProps: { serverId, signal },
                query: {
                    limit: SHELF_FETCH_LIMIT,
                    sortBy,
                    sortOrder,
                    startIndex: 0,
                    ...query,
                },
            }),
        queryKey: ['home', 'albums', sortBy, sortOrder, query, serverId],
    });
};

const useTopArtists = () => {
    const serverId = useCurrentServerId();

    return useQuery({
        enabled: Boolean(serverId),
        queryFn: ({ signal }) =>
            api.controller.getAlbumArtistList({
                apiClientProps: { serverId, signal },
                query: {
                    limit: SHELF_FETCH_LIMIT,
                    sortBy: AlbumArtistListSort.PLAY_COUNT,
                    sortOrder: SortOrder.DESC,
                    startIndex: 0,
                },
            }),
        queryKey: ['home', 'artists', 'top-played', serverId],
    });
};

const useHomeMostPlayedSongs = () => {
    const serverId = useCurrentServerId();

    return useQuery({
        enabled: Boolean(serverId),
        queryFn: async ({ signal }) => {
            const topResponse = await api.controller.getTopSongs({
                apiClientProps: { serverId, signal },
                query: {
                    artist: '',
                    artistId: '',
                    limit: SHELF_FETCH_LIMIT,
                    type: 'personal',
                },
            });
            const topItems = topResponse.items ?? [];
            if (topItems.length > 0) {
                return pickMostPlayedSongs(topItems, SHELF_FETCH_LIMIT);
            }

            const response = await api.controller.getSongList({
                apiClientProps: { serverId, signal },
                query: {
                    limit: HOME_SONG_POOL,
                    sortBy: SongListSort.PLAY_COUNT,
                    sortOrder: SortOrder.DESC,
                    startIndex: 0,
                },
            });

            return pickMostPlayedSongs(response.items ?? [], SHELF_FETCH_LIMIT);
        },
        queryKey: ['home', 'mostPlayed', serverId],
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
    const recentPlayHistory = usePlayHistoryStore((state) => state.items);
    const playlistSortBy = PlaylistListSort.LAST_PLAYED_AT;

    const playlistsQuery = useQuery({
        enabled: Boolean(serverId),
        queryFn: ({ signal }) =>
            api.controller.getPlaylistList({
                apiClientProps: { serverId, signal },
                query: {
                    limit: 50,
                    sortBy: playlistSortBy,
                    sortOrder: SortOrder.DESC,
                    startIndex: 0,
                },
            }),
        queryKey: ['home', 'playlists', serverId, playlistSortBy],
    });

    const localPlaylistPlayedAt = useMemo(() => {
        const map = new Map<string, number>();
        if (!serverId) {
            return map;
        }

        for (const item of recentPlayHistory) {
            if (item.mediaType !== 'playlist' || item.serverId !== serverId) {
                continue;
            }
            const previous = map.get(item.itemId) ?? 0;
            if (item.selectedAt > previous) {
                map.set(item.itemId, item.selectedAt);
            }
        }

        return map;
    }, [recentPlayHistory, serverId]);

    const hiddenKeys = useHiddenHomeKeys();
    const playlists = useMemo(() => {
        const allPlaylists = playlistsQuery.data?.items ?? [];
        return sortPlaylistsByLastPlayed(allPlaylists, localPlaylistPlayedAt)
            .filter(
                (playlist) =>
                    !hiddenKeys.has(
                        hiddenHomeItemKey({
                            id: playlist.id,
                            serverId: playlist._serverId,
                            type: 'playlist',
                        }),
                    ),
            )
            .slice(0, SHELF_LIMIT);
    }, [hiddenKeys, localPlaylistPlayedAt, playlistsQuery.data?.items]);

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
            cmd: {
                homeItemKey: hiddenHomeItemKey({
                    id: playlist.id,
                    serverId: playlist._serverId,
                    type: 'playlist',
                }),
                items: [playlist],
                type: LibraryItem.PLAYLIST,
            },
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
                <ItemImage
                    alt={playlist.name}
                    enableViewport={false}
                    id={playlist.imageId ?? playlist.id}
                    imageContainerProps={{ className: styles.imageContainer }}
                    itemType={LibraryItem.PLAYLIST}
                    serverId={playlist._serverId}
                    src={playlist.imageUrl}
                    type="itemCard"
                />
                <span className={styles.badge}>
                    <Icon icon="playlist" size="0.78rem" />
                    Playlist
                </span>
                <span className={styles.playlistControls}>
                    <PlayButton
                        classNames={clsx(
                            itemCardControlsStyles.playButton,
                            itemCardControlsStyles.primary,
                            styles['playlist-primary-control'],
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
                            styles['playlist-secondary-control'],
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
            <Text className={styles.title} fw={650} size="sm">
                {playlist.name}
            </Text>
            <Text className={styles.subtitle} isMuted size="sm">
                {getCountText(playlist.songCount, 'track') ?? 'Playlist'}
            </Text>
        </div>
    );
};

const useHomeExploPlaylist = () => {
    const serverId = useCurrentServerId();

    return useQuery({
        enabled: Boolean(serverId),
        queryFn: async ({ signal }) => {
            const samoServer = getServerById(serverId);
            if (!samoServer) {
                return undefined;
            }

            return fetchSamoExploPlaylist(samoServer, signal);
        },
        queryKey: ['home', 'explo', 'playlist', serverId],
        staleTime: 1000 * 60 * 5,
    });
};

/**
 * Featured card for the server-managed "Explo" playlist (weekly untagged-drop
 * auto-playlist). Renders nothing until the server has processed at least one
 * drop with tracks in it — no placeholder/loading card, matching every other
 * home section's "if empty, render null" convention. Opens through the exact
 * same playlist detail route as any other playlist; there's nothing special
 * about the Explo playlist once you're inside it.
 */
export const HomeExploSection = () => {
    const navigate = useNavigate();
    const playlistQuery = useHomeExploPlaylist();
    const hiddenKeys = useHiddenHomeKeys();

    const playlist = playlistQuery.data;
    const isHidden =
        playlist &&
        hiddenKeys.has(
            hiddenHomeItemKey({ id: playlist.id, serverId: playlist._serverId, type: 'playlist' }),
        );

    if (!playlist || isHidden || !playlist.songCount) return null;

    const open = () =>
        navigate(generatePath(AppRoute.PLAYLISTS_DETAIL_SONGS, { playlistId: playlist.id }));

    const handleContextMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        ContextMenuController.call({
            cmd: {
                homeItemKey: hiddenHomeItemKey({
                    id: playlist.id,
                    serverId: playlist._serverId,
                    type: 'playlist',
                }),
                items: [playlist],
                type: LibraryItem.PLAYLIST,
            },
            event,
        });
    };

    return (
        <section className={styles.section}>
            <HomeHeader title="Fresh from Explore" />
            <button
                className={clsx(styles.featureCard, styles.featureCardAccent)}
                onClick={open}
                onContextMenu={handleContextMenu}
                type="button"
            >
                <div className={styles.featureArt}>
                    <ItemImage
                        alt={playlist.name}
                        enableViewport={false}
                        id={playlist.imageId ?? playlist.id}
                        imageContainerProps={{ className: styles.imageContainer }}
                        itemType={LibraryItem.PLAYLIST}
                        serverId={playlist._serverId}
                        src={playlist.imageUrl}
                        type="itemCard"
                    />
                </div>
                <div className={styles.trackMeta}>
                    <span className={styles.featureBadge}>EXPLORE</span>
                    <Text className={styles.title} fw={750} size="lg">
                        {playlist.name}
                    </Text>
                    <Text className={styles.subtitle} isMuted size="sm">
                        This week&apos;s unrecognized tracks, freshly identified
                    </Text>
                    <Text className={styles.tertiary} isMuted size="sm">
                        {getCountText(playlist.songCount, 'track') ?? 'Playlist'}
                    </Text>
                </div>
            </button>
        </section>
    );
};

export const HomeFavoriteArtists = ({
    containerQuery,
}: {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
}) => {
    const navigate = useNavigate();
    const artistsQuery = useTopArtists();
    const hiddenKeys = useHiddenHomeKeys();
    const artists = (artistsQuery.data?.items ?? [])
        .filter(
            (artist) =>
                !hiddenKeys.has(
                    hiddenHomeItemKey({
                        id: artist.id,
                        serverId: artist._serverId,
                        type: 'artist',
                    }),
                ),
        )
        .slice(0, SHELF_LIMIT);

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
                    homeItemKey: hiddenHomeItemKey({
                        id: artist.id,
                        serverId: artist._serverId,
                        type: 'artist',
                    }),
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
        <Text className={styles.subtitle} isMuted size="sm">
            {getCountText(artist.albumCount, 'album') ?? getCountText(artist.songCount, 'track')}
        </Text>
    </button>
);

export const HomeFavoriteTracks = () => {
    const songsQuery = useHomeMostPlayedSongs();
    const hiddenKeys = useHiddenHomeKeys();
    const songs = (songsQuery.data ?? [])
        .filter(
            (song) =>
                !hiddenKeys.has(
                    hiddenHomeItemKey({ id: song.id, serverId: song._serverId, type: 'song' }),
                ),
        )
        .slice(0, LIST_LIMIT);

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

const TrackRow = ({ song, subtitle }: { song: Song; subtitle?: string }) => {
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
                        homeItemKey: hiddenHomeItemKey({
                            id: song.id,
                            serverId: song._serverId,
                            type: 'song',
                        }),
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
                <Text className={styles.subtitle} isMuted size="sm">
                    {subtitle ?? getSongSubtitle(song)}
                </Text>
            </div>
            <Text className={styles.trackExtra} size="xs">
                {formatDurationStringShort(song.duration)}
            </Text>
        </button>
    );
};

const DiscoveryTrackRow = ({ song }: { song: Song }) => (
    <TrackRow
        song={song}
        subtitle={`${getSongSubtitle(song)} · ${getUnplayedDiscoverySubtitle(song)}`}
    />
);

export const HomeRediscoverySection = () => {
    const albumsQuery = useAlbums(AlbumListSort.RECENTLY_PLAYED, SortOrder.ASC, undefined, {
        enabled: true,
    });
    const hiddenKeys = useHiddenHomeKeys();
    const albums = (albumsQuery.data?.items ?? []).filter(
        (album) =>
            Boolean(album.lastPlayedAt) &&
            (album.playCount ?? 0) > 0 &&
            !hiddenKeys.has(
                hiddenHomeItemKey({
                    id: album.id,
                    serverId: album._serverId,
                    type: 'album',
                }),
            ),
    );

    if (!albums.length) return null;

    const feature = albums[0];
    const support = albums.slice(1, 6) as Array<Album | Song>;

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
                    homeItemKey: hiddenHomeItemKey({
                        id: item.id,
                        serverId: item._serverId,
                        type: 'song',
                    }),
                    items: [item as Song],
                    type: LibraryItem.SONG,
                },
                event,
            });
        } else {
            ContextMenuController.call({
                cmd: {
                    homeItemKey: hiddenHomeItemKey({
                        id: item.id,
                        serverId: item._serverId,
                        type: 'album',
                    }),
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
                <Text isMuted size="sm">
                    Rediscover this
                </Text>
                <Text className={styles.title} fw={750} size="lg">
                    {title}
                </Text>
                <Text className={styles.subtitle} isMuted size="sm">
                    {subtitle}
                </Text>
                <Text className={styles.tertiary} isMuted size="sm">
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
                    homeItemKey: hiddenHomeItemKey({
                        id: item.id,
                        serverId: item._serverId,
                        type: 'song',
                    }),
                    items: [item as Song],
                    type: LibraryItem.SONG,
                },
                event,
            });
        } else {
            ContextMenuController.call({
                cmd: {
                    homeItemKey: hiddenHomeItemKey({
                        id: item.id,
                        serverId: item._serverId,
                        type: 'album',
                    }),
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
                <Text className={styles.subtitle} isMuted size="sm">
                    {getRediscoveryCopy(item)}
                </Text>
            </div>
        </button>
    );
};

const useHomeDiscoverySongs = (discoverySeed: string) => {
    const serverId = useCurrentServerId();

    return useQuery({
        enabled: Boolean(serverId),
        queryFn: async ({ signal }) => {
            const samoServer = getServerById(serverId);
            if (!samoServer) {
                return [];
            }

            const tracks = await fetchSamoDiscoveryHomeTracks(samoServer, {
                limit: SHELF_FETCH_LIMIT,
                signal,
            });

            return shuffleSongs(tracks);
        },
        queryKey: ['home', 'discover', 'songs', serverId, discoverySeed],
        staleTime: 0,
    });
};

type HomeAlbumSortStrategy = {
    queryKey: readonly string[];
    sortBy: AlbumListSort;
    sortOrder: SortOrder;
};

const HOME_ALBUM_STRATEGIES: HomeAlbumSortStrategy[] = [
    {
        queryKey: ['home', 'album', 'recently-played'],
        sortBy: AlbumListSort.RECENTLY_PLAYED,
        sortOrder: SortOrder.DESC,
    },
    {
        queryKey: ['home', 'album', 'top-played'],
        sortBy: AlbumListSort.PLAY_COUNT,
        sortOrder: SortOrder.DESC,
    },
    {
        queryKey: ['home', 'album', 'recently-added'],
        sortBy: AlbumListSort.RECENTLY_ADDED,
        sortOrder: SortOrder.DESC,
    },
];

export const HomeAlbumsSection = ({
    containerQuery,
}: {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
}) => {
    const serverId = useCurrentServerId();
    const hiddenAlbumIds = useHiddenHomeIdsByType('album');

    const strategyQuery = useQuery({
        enabled: Boolean(serverId),
        queryFn: async ({ signal }) => {
            for (const strategy of HOME_ALBUM_STRATEGIES) {
                const response = await api.controller.getAlbumList({
                    apiClientProps: { serverId, signal },
                    query: {
                        limit: 1,
                        sortBy: strategy.sortBy,
                        sortOrder: strategy.sortOrder,
                        startIndex: 0,
                    },
                });

                if ((response.items ?? []).length > 0) {
                    return strategy;
                }
            }

            return null;
        },
        queryKey: ['home', 'album', 'strategy', serverId],
    });

    if (!strategyQuery.data) {
        return null;
    }

    return (
        <AlbumInfiniteCarousel
            containerQuery={containerQuery}
            enableRefresh
            enableRemoveFromHome
            excludeIds={hiddenAlbumIds}
            queryKey={strategyQuery.data.queryKey}
            rowCount={1}
            sortBy={strategyQuery.data.sortBy}
            sortOrder={strategyQuery.data.sortOrder}
            title={<HomeHeader title="Albums" to={AppRoute.LIBRARY_ALBUMS} />}
        />
    );
};

export const HomeDiscoverSection = () => {
    const [discoverySeed] = useState(() => `${Date.now()}:${Math.random()}`);
    const songsQuery = useHomeDiscoverySongs(discoverySeed);
    const hiddenKeys = useHiddenHomeKeys();
    const songs = (songsQuery.data ?? [])
        .filter(
            (song) =>
                !hiddenKeys.has(
                    hiddenHomeItemKey({ id: song.id, serverId: song._serverId, type: 'song' }),
                ),
        )
        .slice(0, DISCOVERY_LIMIT);

    if (songsQuery.isPending) {
        return (
            <section className={styles.section}>
                <HomeHeader title="Discover" to={AppRoute.LIBRARY_SONGS} />
            </section>
        );
    }

    if (!songs.length) {
        return null;
    }

    return (
        <section className={styles.section}>
            <HomeHeader title="Discover" to={AppRoute.LIBRARY_SONGS} />
            <div className={styles.discoveryGrid}>
                {songs.map((song) => (
                    <DiscoveryTrackRow key={song.id} song={song} />
                ))}
            </div>
        </section>
    );
};

export const HomeFavoriteAudiobooks = ({
    containerQuery,
}: {
    containerQuery?: ReturnType<typeof useGridCarouselContainerQuery>;
}) => {
    const server = useLongFormMediaServer();
    const audiobookActions = useAudiobookActions();
    const favoriteAudiobookIds = useFavoriteAudiobookIds(server?.id);
    const favoritesActions = useLibraryFavoritesActions();
    const hiddenKeys = useHiddenHomeKeys();

    const samoItemsQuery = useQuery(longFormQueries.audiobooks(server));

    const items = useMemo(() => {
        const allItems = (samoItemsQuery.data ?? []).filter(
            (item) =>
                !hiddenKeys.has(
                    hiddenHomeItemKey({ id: item.id, serverId: server?.id, type: 'audiobook' }),
                ),
        );
        const favoriteItems = allItems.filter((item) => favoriteAudiobookIds.has(item.id));
        const nonFavoriteItems = allItems.filter((item) => !favoriteAudiobookIds.has(item.id));
        return [...favoriteItems, ...nonFavoriteItems].slice(0, 24);
    }, [samoItemsQuery.data, favoriteAudiobookIds, hiddenKeys, server?.id]);

    const imageRes = useImageRes();

    if (!server || !items.length) {
        return null;
    }

    const cards = items.map((item) => {
        const title = item.media?.metadata?.title ?? item.name ?? 'Untitled';
        const isFavorite = favoriteAudiobookIds.has(item.id);

        return {
            content: (
                <div
                    aria-label={`Play ${title}`}
                    className={styles.mediaCard}
                    onClick={() => audiobookActions.play(server, item)}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        ContextMenuController.call({
                            cmd: {
                                homeItemKey: hiddenHomeItemKey({
                                    id: item.id,
                                    serverId: server.id,
                                    type: 'audiobook',
                                }),
                                items: [item],
                                server,
                                type: 'audiobook',
                            },
                            event: e,
                        });
                    }}
                    role="button"
                    tabIndex={0}
                >
                    <div className={styles.mediaArt}>
                        <LongFormCoverImage
                            alt={title}
                            fallbackIcon="metadata"
                            imageUrl={item.media?.metadata?.imageUrl}
                            itemId={item.id}
                            width={imageRes.itemCard}
                        />
                        <span className={styles.playlistControls}>
                            <PlayButton
                                classNames={clsx(
                                    itemCardControlsStyles.playButton,
                                    itemCardControlsStyles.primary,
                                    styles['playlist-primary-control'],
                                )}
                                fill
                                onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    audiobookActions.play(server, item);
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
                                    favoritesActions.toggle('audiobook', server.id, item.id);
                                }}
                                type="button"
                            >
                                <Icon icon="favorite" size="lg" />
                            </button>
                            <button
                                className={clsx(styles.overlayBtn, styles.overlayOptions)}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    ContextMenuController.call({
                                        cmd: {
                                            homeItemKey: hiddenHomeItemKey({
                                                id: item.id,
                                                serverId: server.id,
                                                type: 'audiobook',
                                            }),
                                            items: [item],
                                            server,
                                            type: 'audiobook',
                                        },
                                        event: e,
                                    });
                                }}
                                type="button"
                            >
                                <Icon icon="ellipsisHorizontal" size="lg" />
                            </button>
                        </span>
                    </div>
                    <Text className={styles.title} fw={650} size="sm">
                        {title}
                    </Text>
                    <Text className={styles.subtitle} isMuted size="sm">
                        {item.media?.metadata?.author ??
                            item.media?.metadata?.authorName ??
                            'Audiobook'}
                    </Text>
                </div>
            ),
            id: item.id,
        };
    });

    return (
        <GridCarousel
            cards={cards}
            containerQuery={containerQuery}
            hasNextPage={false}
            onNextPage={() => {}}
            onPrevPage={() => {}}
            rowCount={1}
            title={<HomeHeader title="Audiobooks" to={AppRoute.AUDIOBOOKS} />}
        />
    );
};

/** @deprecated Use {@link HomeDiscoverSection}. */
export const HomeUnplayedSection = HomeDiscoverSection;
