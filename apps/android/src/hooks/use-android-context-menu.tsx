import { MobileMediaDetailType, type MobileContentSource } from '@samo/core/mobile';
import { ServerType, type ServerAuthenticationResult } from '@samo/core/server';
import { useMemo } from 'react';

import {
    BookInfoGlyph,
    ChaptersGlyph,
    DiscGlyph,
    DownloadGlyph,
    HeartGlyph,
    PersonGlyph,
    PlaylistAddGlyph,
    QueueAddGlyph,
    RadioWaveGlyph,
} from '../components/Glyphs';
import {
    type MediaContextMenuAction,
} from '../components/MediaContextMenu';
import {
    type MediaContextMenuApi,
    type MediaContextMenuTarget,
} from '../contexts/media-context-menu';
import { triggerImpact } from '../services/haptics';
import { colors } from '../theme/tokens';
import { getContentSourceFromPlaybackItem } from '../utils/content-source';
import {
    inferContextMenuKindFromItem,
    isPodcastEpisodeHomeItem,
    synthesizePodcastDetailFromEpisodeItem,
    synthesizeTrackFromPodcastEpisodeItem,
} from '../utils/context-menu-infer';
import { isSongSearchItem, synthesizeTrackFromSongItem } from '../utils/search-tracks';
import {
    type AndroidMediaHandlerDeps,
    type AndroidMediaHandlers,
} from './use-android-media-handlers';

export interface AndroidContextMenuSurface {
    actions: MediaContextMenuAction[];
    api: MediaContextMenuApi;
    artworkImageId?: string;
    artworkUrl?: string;
    contentSource?: MobileContentSource;
    eyebrow: string;
    feedback: string | null;
    isCircularArtwork: boolean;
    onClose: () => void;
    subtitle?: string;
    target: MediaContextMenuTarget | null;
    title: string;
}

type ContextMenuHandlers = Pick<
    AndroidMediaHandlers,
    | 'canAppendToPlaybackQueue'
    | 'findAuthForSource'
    | 'getFavoriteKeyForItem'
    | 'getFavoriteKeyForTrack'
    | 'handleAddCollectionToQueue'
    | 'handleAddTrackToQueue'
    | 'handleDownloadCollectionItem'
    | 'handleDownloadSongTrack'
    | 'handleGoToAlbumForTrack'
    | 'handleGoToArtistForTrack'
    | 'handleOpenAddToPlaylistForCollection'
    | 'handleOpenAddToPlaylistForSong'
    | 'handleOpenCreatePlaylistForCollection'
    | 'handleOpenCreatePlaylistForSong'
    | 'handleOpenBookInfo'
    | 'handleOpenStreamInfo'
    | 'handleStartSongRadio'
    | 'handleToggleFavoriteForItem'
    | 'handleToggleFavoriteForTrack'
    | 'handleViewDetailForItem'
>;

export function useAndroidContextMenu(options: {
    deps: Pick<AndroidMediaHandlerDeps, 'overlays' | 'session'>;
    handlers: ContextMenuHandlers;
    serverConnection: ServerAuthenticationResult | null;
}): AndroidContextMenuSurface {
    const { deps, handlers, serverConnection } = options;
    const {
        contextMenuFeedback,
        contextMenuTarget,
        setContextMenuFeedback,
        setContextMenuTarget,
    } = deps.overlays;
    const { favoritedKeys } = deps.session;

    const {
        canAppendToPlaybackQueue,
        findAuthForSource,
        getFavoriteKeyForItem,
        getFavoriteKeyForTrack,
        handleAddCollectionToQueue,
        handleAddTrackToQueue,
        handleDownloadCollectionItem,
        handleDownloadSongTrack,
        handleGoToAlbumForTrack,
        handleGoToArtistForTrack,
        handleOpenAddToPlaylistForCollection,
        handleOpenAddToPlaylistForSong,
        handleOpenCreatePlaylistForCollection,
        handleOpenCreatePlaylistForSong,
        handleOpenBookInfo,
        handleOpenStreamInfo,
        handleStartSongRadio,
        handleToggleFavoriteForItem,
        handleToggleFavoriteForTrack,
        handleViewDetailForItem,
    } = handlers;

    const api = useMemo<MediaContextMenuApi>(
        () => ({
            openForItem: (item, openOptions) => {
                if (isSongSearchItem(item)) {
                    triggerImpact('medium');
                    setContextMenuFeedback(null);
                    setContextMenuTarget({
                        kind: 'song',
                        source: item.source,
                        suppressDownloadAction: openOptions?.suppressDownloadAction,
                        suppressOpenAction: openOptions?.suppressOpenAction,
                        suppressQueueAction: openOptions?.suppressQueueAction,
                        track: synthesizeTrackFromSongItem(item),
                    });
                    return;
                }
                if (isPodcastEpisodeHomeItem(item)) {
                    // Podcast Feed episode tile — route through the song-kind
                    // target the show detail rows use, so the episode gets the
                    // same Favorites + Download episode menu instead of the
                    // silent nothing an unmapped kind used to produce.
                    triggerImpact('medium');
                    setContextMenuFeedback(null);
                    setContextMenuTarget({
                        detail: synthesizePodcastDetailFromEpisodeItem(item) ?? undefined,
                        kind: 'song',
                        source: item.source,
                        suppressDownloadAction: openOptions?.suppressDownloadAction,
                        suppressOpenAction: openOptions?.suppressOpenAction,
                        suppressQueueAction: openOptions?.suppressQueueAction,
                        track: synthesizeTrackFromPodcastEpisodeItem(item),
                    });
                    return;
                }
                const kind = inferContextMenuKindFromItem(item);
                if (!kind) {
                    return;
                }
                triggerImpact('medium');
                setContextMenuFeedback(null);
                setContextMenuTarget({
                    item,
                    kind,
                    suppressDownloadAction: openOptions?.suppressDownloadAction,
                    suppressOpenAction: openOptions?.suppressOpenAction,
                    suppressQueueAction: openOptions?.suppressQueueAction,
                });
            },
            openForTrack: (track, detail) => {
                triggerImpact('medium');
                setContextMenuFeedback(null);
                setContextMenuTarget({
                    detail,
                    kind: 'song',
                    source: detail?.source,
                    track,
                });
            },
        }),
        [setContextMenuFeedback, setContextMenuTarget],
    );

    const actions = useMemo<MediaContextMenuAction[]>(() => {
        if (!contextMenuTarget) {
            return [];
        }

        const menuActions: MediaContextMenuAction[] = [];

        if (contextMenuTarget.kind === 'song') {
            const { source, track } = contextMenuTarget;
            const favoriteKey = getFavoriteKeyForTrack(track, source?.id);
            const isFavorited = favoritedKeys.has(favoriteKey);
            const canQueueTrack =
                canAppendToPlaybackQueue &&
                !contextMenuTarget.suppressQueueAction &&
                track.playback?.source === 'music';
            menuActions.push({
                icon: (
                    <HeartGlyph
                        color={isFavorited ? colors.accent : colors.text}
                        filled={isFavorited}
                    />
                ),
                id: 'favorite',
                label: isFavorited ? 'Remove from Favorites' : 'Add to Favorites',
                onPress: () => void handleToggleFavoriteForTrack(track, source?.id),
            });
            if (canQueueTrack) {
                menuActions.push({
                    icon: <QueueAddGlyph color={colors.text} />,
                    id: 'queue',
                    label: 'Add to Queue',
                    onPress: () => handleAddTrackToQueue(track),
                });
            }
            if (track.playback?.source === 'music' && source) {
                menuActions.push({
                    icon: <PlaylistAddGlyph color={colors.text} />,
                    id: 'playlist',
                    label: 'Add to Playlist',
                    onPress: () => handleOpenAddToPlaylistForSong(track, source.id),
                });
                menuActions.push({
                    icon: <PlaylistAddGlyph color={colors.text} />,
                    id: 'create-playlist',
                    label: 'Create Playlist',
                    onPress: () => handleOpenCreatePlaylistForSong(track, source.id),
                });
            }
            if (track.artistId && source) {
                menuActions.push({
                    icon: <PersonGlyph color={colors.text} />,
                    id: 'go-artist',
                    label: 'Go to Artist',
                    onPress: () => void handleGoToArtistForTrack(track, source),
                });
            }
            if (track.albumId && source) {
                menuActions.push({
                    icon: <DiscGlyph color={colors.text} />,
                    id: 'go-album',
                    label: 'Go to Album',
                    onPress: () => void handleGoToAlbumForTrack(track, source),
                });
            }
            if (track.playback?.source === 'music' && source) {
                menuActions.push({
                    icon: <RadioWaveGlyph color={colors.text} />,
                    id: 'song-radio',
                    label: 'Start Song Radio',
                    onPress: () => void handleStartSongRadio(track, source),
                });
            }

            const detail = contextMenuTarget.detail;
            const downloadLabel =
                detail?.type === MobileMediaDetailType.AUDIOBOOK
                    ? 'Download audiobook'
                    : detail?.type === MobileMediaDetailType.PODCAST
                      ? 'Download episode'
                      : 'Download';
            const canDownload =
                detail?.type === MobileMediaDetailType.AUDIOBOOK ||
                detail?.type === MobileMediaDetailType.PODCAST ||
                track.playback?.source === 'music';
            if (canDownload && !contextMenuTarget.suppressDownloadAction) {
                menuActions.push({
                    icon: <DownloadGlyph color={colors.text} />,
                    id: 'download',
                    label: downloadLabel,
                    onPress: () => void handleDownloadSongTrack(track, detail, source),
                });
            }

            return menuActions;
        }

        const item = contextMenuTarget.item;
        const favoriteKey = getFavoriteKeyForItem(item);
        const isFavorited = favoritedKeys.has(favoriteKey);
        menuActions.push({
            icon: (
                <HeartGlyph
                    color={isFavorited ? colors.accent : colors.text}
                    filled={isFavorited}
                />
            ),
            id: 'favorite',
            label: isFavorited ? 'Remove from Favorites' : 'Add to Favorites',
            onPress: () => void handleToggleFavoriteForItem(item),
        });

        const suppressOpen = contextMenuTarget.suppressOpenAction === true;
        const suppressDownload = contextMenuTarget.suppressDownloadAction === true;
        const suppressQueue = contextMenuTarget.suppressQueueAction === true;

        if (contextMenuTarget.kind === 'audiobook') {
            menuActions.push({
                icon: <BookInfoGlyph color={colors.text} />,
                id: 'book-info',
                label: 'Book Information',
                onPress: () => void handleOpenBookInfo(item, 'audiobook'),
            });
            if (!suppressDownload) {
                menuActions.push({
                    icon: <DownloadGlyph color={colors.text} />,
                    id: 'download',
                    label: 'Download audiobook',
                    onPress: () => void handleDownloadCollectionItem(item),
                });
            }
            if (!suppressOpen) {
                menuActions.push({
                    icon: <ChaptersGlyph color={colors.text} />,
                    id: 'view-chapters',
                    label: 'View Chapters',
                    onPress: () => void handleViewDetailForItem(item),
                });
            }
        } else if (contextMenuTarget.kind === 'podcast') {
            menuActions.push({
                icon: <BookInfoGlyph color={colors.text} />,
                id: 'podcast-info',
                label: 'Podcast Info',
                onPress: () => void handleOpenBookInfo(item, 'podcast'),
            });
            if (!suppressOpen) {
                menuActions.push({
                    icon: <ChaptersGlyph color={colors.text} />,
                    id: 'view-episodes',
                    label: 'View Episodes',
                    onPress: () => void handleViewDetailForItem(item),
                });
            }
        } else if (contextMenuTarget.kind === 'radio') {
            menuActions.push({
                icon: <BookInfoGlyph color={colors.text} />,
                id: 'stream-info',
                label: 'Stream Information',
                onPress: () => handleOpenStreamInfo(item),
            });
        } else if (
            contextMenuTarget.kind === 'album' ||
            contextMenuTarget.kind === 'playlist'
        ) {
            const auth = findAuthForSource(item.source?.id);
            if (canAppendToPlaybackQueue && !suppressQueue) {
                menuActions.push({
                    icon: <QueueAddGlyph color={colors.text} />,
                    id: 'queue',
                    label: 'Add to Queue',
                    onPress: () => void handleAddCollectionToQueue(item),
                });
            }
            if (auth && auth.type === ServerType.SAMO) {
                menuActions.push({
                    icon: <PlaylistAddGlyph color={colors.text} />,
                    id: 'add-collection-to-playlist',
                    label: 'Add to Playlist',
                    onPress: () => handleOpenAddToPlaylistForCollection(item),
                });
                if (contextMenuTarget.kind === 'album') {
                    menuActions.push({
                        icon: <PlaylistAddGlyph color={colors.text} />,
                        id: 'create-collection-playlist',
                        label: 'Create Playlist',
                        onPress: () => handleOpenCreatePlaylistForCollection(item),
                    });
                }
            }
            if (!suppressDownload) {
                menuActions.push({
                    icon: <DownloadGlyph color={colors.text} />,
                    id: 'download',
                    label:
                        contextMenuTarget.kind === 'album'
                            ? 'Download album'
                            : 'Download playlist',
                    onPress: () => void handleDownloadCollectionItem(item),
                });
            }
            if (!suppressOpen) {
                menuActions.push({
                    icon: <ChaptersGlyph color={colors.text} />,
                    id: 'open',
                    label:
                        contextMenuTarget.kind === 'album' ? 'Open Album' : 'Open Playlist',
                    onPress: () => void handleViewDetailForItem(item),
                });
            }
        } else if (contextMenuTarget.kind === 'artist') {
            if (!suppressOpen) {
                menuActions.push({
                    icon: <ChaptersGlyph color={colors.text} />,
                    id: 'open',
                    label: 'Open Artist',
                    onPress: () => void handleViewDetailForItem(item),
                });
            }
        }

        return menuActions;
    }, [
        canAppendToPlaybackQueue,
        contextMenuTarget,
        favoritedKeys,
        findAuthForSource,
        getFavoriteKeyForItem,
        getFavoriteKeyForTrack,
        handleAddCollectionToQueue,
        handleAddTrackToQueue,
        handleDownloadCollectionItem,
        handleDownloadSongTrack,
        handleGoToAlbumForTrack,
        handleGoToArtistForTrack,
        handleOpenAddToPlaylistForCollection,
        handleOpenAddToPlaylistForSong,
        handleOpenCreatePlaylistForCollection,
        handleOpenCreatePlaylistForSong,
        handleOpenBookInfo,
        handleOpenStreamInfo,
        handleStartSongRadio,
        handleToggleFavoriteForItem,
        handleToggleFavoriteForTrack,
        handleViewDetailForItem,
    ]);

    const eyebrow = contextMenuTarget
        ? contextMenuTarget.kind === 'song'
            ? contextMenuTarget.detail?.type === MobileMediaDetailType.PODCAST
                ? 'Episode'
                : 'Song'
            : contextMenuTarget.kind === 'audiobook'
              ? 'Audiobook'
              : contextMenuTarget.kind.charAt(0).toUpperCase() + contextMenuTarget.kind.slice(1)
        : '';

    const artworkUrl = contextMenuTarget
        ? contextMenuTarget.kind === 'song'
            ? contextMenuTarget.track.artworkUrl ?? contextMenuTarget.detail?.artworkUrl
            : contextMenuTarget.item.artworkUrl
        : undefined;

    const artworkImageId = contextMenuTarget
        ? contextMenuTarget.kind === 'song'
            ? contextMenuTarget.track.artworkImageId ??
              contextMenuTarget.track.playback?.artworkImageId ??
              contextMenuTarget.detail?.artworkImageId
            : contextMenuTarget.item.artworkImageId
        : undefined;

    const contentSource = contextMenuTarget
        ? contextMenuTarget.kind === 'song'
            ? contextMenuTarget.track.playback
                ? getContentSourceFromPlaybackItem(
                      contextMenuTarget.track.playback,
                      serverConnection,
                  ) ?? contextMenuTarget.detail?.source
                : contextMenuTarget.detail?.source
            : contextMenuTarget.item.source
        : undefined;

    const isCircularArtwork = contextMenuTarget?.kind === 'artist';

    const title = contextMenuTarget
        ? contextMenuTarget.kind === 'song'
            ? contextMenuTarget.track.title
            : contextMenuTarget.item.title
        : '';

    const subtitle = contextMenuTarget
        ? contextMenuTarget.kind === 'song'
            ? (contextMenuTarget.track.artist ??
              contextMenuTarget.track.subtitle ??
              undefined)
            : contextMenuTarget.item.subtitle
        : undefined;

    const onClose = () => {
        setContextMenuTarget(null);
        setContextMenuFeedback(null);
    };

    return {
        actions,
        api,
        artworkImageId,
        artworkUrl,
        contentSource,
        eyebrow,
        feedback: contextMenuFeedback,
        isCircularArtwork,
        onClose,
        subtitle,
        target: contextMenuTarget,
        title,
    };
}
