import {
    isMobileExploPlaylistDetail,
    isMobilePlaylistDetailEditable,
    MobileHomeItemType,
    MobileMediaDetailType,
    type MobileContentSource,
} from '@samo/core/mobile';
import { ServerType } from '@samo/core/server';
import { useMemo } from 'react';

import {
    BookInfoGlyph,
    CastGlyph,
    ChaptersGlyph,
    ClearGlyph,
    DiscGlyph,
    DownloadGlyph,
    HeartGlyph,
    PersonGlyph,
    PlaylistAddGlyph,
    PlaylistRemoveGlyph,
    QueueAddGlyph,
    TrashGlyph,
} from '../components/Glyphs';
import {
    type MediaContextMenuAction,
} from '../components/MediaContextMenu';
import {
    type MediaContextMenuApi,
    type MediaContextMenuTarget,
} from '../contexts/media-context-menu';
import {
    handleDownloadCollectionItem,
    handleDownloadSongTrack,
} from '../handlers/download-handlers';
import {
    findAuthForSource,
    getFavoriteKeyForItem,
    getFavoriteKeyForTrack,
    handleToggleFavoriteForItem,
    handleToggleFavoriteForTrack,
} from '../handlers/favorites-handlers';
import {
    handleOpenBookInfo,
    handleOpenEpisodeInfo,
    handleOpenStreamInfo,
} from '../handlers/info-handlers';
import { recentContentItemFromMediaDetail } from '../services/recent-content';
import {
    handleGoToAlbumForTrack,
    handleGoToArtistForTrack,
    handleViewDetailForItem,
} from '../handlers/media-detail-handlers';
import {
    handleDeletePlaylistForItem,
    handleKeepExploTracks,
    handleOpenAddToPlaylistForCollection,
    handleOpenAddToPlaylistForSong,
    handleOpenCreatePlaylistForCollection,
    handleOpenCreatePlaylistForSong,
    handleRemoveTrackFromPlaylist,
} from '../handlers/playlist-handlers';
import {
    canAppendToPlaybackQueue,
    handleAddCollectionToQueue,
    handleAddRadioToQueue,
    handleAddTrackToQueue,
} from '../handlers/queue-handlers';
import {
    canSendItemToSamoRadio,
    canSendTrackToSamoRadio,
    handleSendItemToSamoRadio,
    handleSendTrackToSamoRadio,
} from '../handlers/samo-radio-handlers';
import { triggerImpact } from '../services/haptics';
import { useAppSessionSelector } from '../state/app-session';
import { useAuthSessionSelector } from '../state/auth-session';
import { hideFromHome } from '../state/hidden-home';
import {
    setContextMenuFeedback,
    setContextMenuTarget,
    useMediaOverlaysSelector,
} from '../state/media-overlays';
import {
    selectActiveAndroidPlaybackItem,
    useAndroidPlaybackState,
} from '../state/playback-store';
import { type SamoRadioTarget, useSamoRadioSelector } from '../state/samo-radio';
import { colors } from '../theme/tokens';
import { getContentItemKey } from '../utils/content-item';
import { getContentSourceFromPlaybackItem } from '../utils/content-source';
import {
    inferContextMenuKindFromItem,
    isPodcastEpisodeHomeItem,
    synthesizePodcastDetailFromEpisodeItem,
    synthesizeTrackFromPodcastEpisodeItem,
} from '../utils/context-menu-infer';
import { isSongSearchItem, synthesizeTrackFromSongItem } from '../utils/search-tracks';

export interface AndroidContextMenuSurface {
    actions: MediaContextMenuAction[];
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

/**
 * The long-press API tiles call. It only writes module-level overlay state, so
 * it's a module constant — the MediaContextMenuContext.Provider value never
 * changes and tiles' useMediaContextMenu() subscriptions never re-render.
 */
export const mediaContextMenuApi: MediaContextMenuApi = {
    openForItem: (item, openOptions) => {
        // Captured while we still have the original Home item — song-kind
        // targets (search songs, podcast-feed episodes) don't keep it.
        const removeFromHomeKey = openOptions?.allowRemoveFromHome
            ? getContentItemKey(item)
            : undefined;
        if (isSongSearchItem(item)) {
            triggerImpact('medium');
            setContextMenuFeedback(null);
            setContextMenuTarget({
                kind: 'song',
                removeFromHomeKey,
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
                removeFromHomeKey,
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
            removeFromHomeKey,
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
};

const closeContextMenu = () => {
    setContextMenuTarget(null);
    setContextMenuFeedback(null);
};

/** Matches styles.mediaContextActionDestructive so icon and label read as one. */
const DESTRUCTIVE_TINT = '#ff7a6e';

/**
 * Renders the context-menu surface from the overlay store. Every action is a
 * stable module-level handler, so the memo below only recomputes when the
 * target, favorites, or queueability actually change.
 */
export function useAndroidContextMenu(): AndroidContextMenuSurface {
    const contextMenuTarget = useMediaOverlaysSelector((state) => state.contextMenuTarget);
    const contextMenuFeedback = useMediaOverlaysSelector((state) => state.contextMenuFeedback);
    const favoritedKeys = useAppSessionSelector((state) => state.favoritedKeys);
    const serverConnection = useAuthSessionSelector((state) => state.serverConnection);
    const activePlaybackItem = useAndroidPlaybackState(selectActiveAndroidPlaybackItem);
    const canAppendToQueue = canAppendToPlaybackQueue(activePlaybackItem);
    // Identity only, and only of devices the server can reach right now — so
    // this is empty (and samo-radio absent from every menu) unless there is
    // really something to play to, and a device's moving playhead does not
    // rebuild the action list underneath an open sheet.
    const samoRadioTargets = useSamoRadioSelector((state) => state.targets);

    const actions = useMemo<MediaContextMenuAction[]>(() => {
        if (!contextMenuTarget) {
            return [];
        }

        const menuActions: MediaContextMenuAction[] = [];

        // One row per device: samo-radio devices are the server's own sockets,
        // so there is normally exactly one, and a nested picker to choose from
        // a list of one would be a sheet in front of a sheet. With several, the
        // name IS the choice and no extra step is needed either.
        const pushSamoRadioActions = (send: (device: SamoRadioTarget) => void): void => {
            samoRadioTargets.forEach((device) => {
                menuActions.push({
                    icon: <CastGlyph color={colors.text} size={20} />,
                    id: `samo-radio:${device.id}`,
                    label:
                        samoRadioTargets.length === 1
                            ? 'Send to samo-radio'
                            : `Send to ${device.name}`,
                    onPress: () => send(device),
                });
            });
        };

        if (contextMenuTarget.kind === 'song') {
            const { source, track } = contextMenuTarget;
            const favoriteKey = getFavoriteKeyForTrack(track, source?.id);
            const isFavorited = favoritedKeys.has(favoriteKey);
            // Anything with a sequential playable can be queued — music, podcast
            // episodes, and audiobook files all advance through the same JS queue
            // (each keeps its own resume/progress context). Only radio is excluded
            // because a live stream has no place in an Up Next list. Previously
            // this was hard-gated to 'music', which is why long-pressing a podcast
            // episode (source 'podcast') offered no Add to Queue at all.
            const canQueueTrack =
                canAppendToQueue &&
                !contextMenuTarget.suppressQueueAction &&
                track.playback != null &&
                track.playback.source !== 'radio';
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
            // Show notes. Podcasts only — a music track has no equivalent, and an
            // episode row is exactly where the blurb was unreachable: the row
            // truncates the title to one line and shows no description at all.
            const episodeDetail =
                contextMenuTarget.detail?.type === MobileMediaDetailType.PODCAST
                    ? contextMenuTarget.detail
                    : null;
            // An episode is an episode wherever it is long-pressed. This used to
            // require `episodeDetail` — i.e. the menu had to have been opened
            // INSIDE the show's own detail page, the only place the parent show
            // is in hand — so the same episode on Home, in search or in the
            // queue offered no show notes at all. The track itself carries
            // everything the sheet renders, so fall back to it and let the show
            // supply only what it can add.
            const isEpisodeTrack = episodeDetail != null || track.playback?.source === 'podcast';
            if (isEpisodeTrack) {
                menuActions.push({
                    icon: <BookInfoGlyph color={colors.text} />,
                    id: 'episode-info',
                    label: 'Episode Information',
                    onPress: () => {
                        const showItem = episodeDetail
                            ? recentContentItemFromMediaDetail(episodeDetail)
                            : null;
                        handleOpenEpisodeInfo(
                            {
                                ...(showItem ?? {
                                    id: track.id,
                                    source,
                                    title: track.title,
                                    type: MobileHomeItemType.PODCAST_EPISODE,
                                }),
                                // Prefer the EPISODE's own art; many feeds ship
                                // per-episode covers and falling back to the
                                // show's would quietly show the wrong picture.
                                artworkImageId: track.artworkImageId ?? showItem?.artworkImageId,
                                artworkUrl: track.artworkUrl ?? showItem?.artworkUrl,
                            },
                            {
                                description: track.description,
                                durationSeconds: track.durationSeconds,
                                publishedAt: track.publishedAt,
                                subtitle: track.subtitle,
                                title: track.title,
                            },
                        );
                    },
                });
            }
            if (canQueueTrack) {
                menuActions.push({
                    icon: <QueueAddGlyph color={colors.text} />,
                    id: 'queue',
                    label: 'Add to Queue',
                    onPress: () => handleAddTrackToQueue(track),
                });
            }
            // Next to Add to Queue: both answer "not now / not here", and a
            // live station is as sendable as a track — the device plays it,
            // the phone's own queue is what cannot hold one.
            if (canSendTrackToSamoRadio(track)) {
                pushSamoRadioActions((device) => void handleSendTrackToSamoRadio(track, device));
            }
            if (track.playback?.source === 'music' && source) {
                menuActions.push({
                    icon: <PlaylistAddGlyph color={colors.text} />,
                    id: 'playlist',
                    label: 'Add to Playlist',
                    onPress: () =>
                        handleOpenAddToPlaylistForSong(
                            track,
                            source.id,
                            Boolean(detail && isMobileExploPlaylistDetail(detail)),
                        ),
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

            if (contextMenuTarget.removeFromHomeKey) {
                const homeKey = contextMenuTarget.removeFromHomeKey;
                menuActions.push({
                    icon: <ClearGlyph color={colors.text} />,
                    id: 'remove-from-home',
                    label: 'Remove from Home',
                    onPress: () => {
                        hideFromHome(homeKey);
                        setContextMenuTarget(null);
                    },
                });
            }

            // Last, and the only destructive entry a song menu ever has — the
            // same place the collection menu puts Delete Playlist. Sitting it
            // below the navigational actions is deliberate: nothing lands on it
            // while reaching for Go to Album.
            //
            // The detail the menu was opened against IS the qualifier. It is
            // set only by the detail-page rows (a long-press on Home, in search
            // or in the queue has no containing playlist to remove from), and
            // `isMobilePlaylistDetailEditable` narrows that to a playlist this
            // user is actually allowed to write — not somebody else's, and not
            // a server-managed one, both of which would 403 on commit.
            // Explore only: these tracks sit in a drop folder the weekly run
            // empties, so this is the one place in the app where a track
            // disappears unless you act. Everywhere else it is already in the
            // library and the action would be a no-op.
            if (detail && isMobileExploPlaylistDetail(detail)) {
                const exploDetail = detail;
                menuActions.push({
                    icon: <DownloadGlyph color={colors.text} />,
                    id: 'keep-in-library',
                    label: 'Keep in Library',
                    onPress: () => void handleKeepExploTracks([track], exploDetail),
                });
            }

            if (detail && isMobilePlaylistDetailEditable(detail)) {
                const playlistDetail = detail;
                menuActions.push({
                    destructive: true,
                    icon: <PlaylistRemoveGlyph color={DESTRUCTIVE_TINT} />,
                    id: 'remove-from-playlist',
                    label: 'Remove from Playlist',
                    onPress: () => handleRemoveTrackFromPlaylist(track, playlistDetail),
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
            if (canAppendToQueue && !suppressQueue) {
                menuActions.push({
                    icon: <QueueAddGlyph color={colors.text} />,
                    id: 'queue',
                    label: 'Add to Queue',
                    onPress: () => void handleAddCollectionToQueue(item),
                });
            }
            if (canSendItemToSamoRadio(item, 'audiobook')) {
                pushSamoRadioActions(
                    (device) => void handleSendItemToSamoRadio(item, 'audiobook', device),
                );
            }
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
            // A live station can't sit mid-queue, but it CAN be queued at the tail
            // to take over when the current podcast/audiobook (and anything after
            // it) finishes — the fall-asleep handoff. Only offered when something
            // queueable is already playing (canAppendToQueue is false while
            // radio itself is the active item).
            if (canAppendToQueue && !suppressQueue) {
                menuActions.push({
                    icon: <QueueAddGlyph color={colors.text} />,
                    id: 'queue',
                    label: 'Add to Queue',
                    onPress: () => handleAddRadioToQueue(item),
                });
            }
            // Unlike the queue action above, this one has no "only while
            // something else is playing" condition: tuning the stereo to a
            // station is what a station is FOR, and it says nothing about what
            // the phone happens to be doing.
            if (canSendItemToSamoRadio(item, 'radio')) {
                pushSamoRadioActions(
                    (device) => void handleSendItemToSamoRadio(item, 'radio', device),
                );
            }
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
            const collectionKind = contextMenuTarget.kind;
            if (canAppendToQueue && !suppressQueue) {
                menuActions.push({
                    icon: <QueueAddGlyph color={colors.text} />,
                    id: 'queue',
                    label: 'Add to Queue',
                    onPress: () => void handleAddCollectionToQueue(item),
                });
            }
            if (canSendItemToSamoRadio(item, collectionKind)) {
                pushSamoRadioActions(
                    (device) => void handleSendItemToSamoRadio(item, collectionKind, device),
                );
            }
            if (auth) {
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
                    label: contextMenuTarget.kind === 'album' ? 'Open Album' : 'Open Playlist',
                    onPress: () => void handleViewDetailForItem(item),
                });
            }
            if (contextMenuTarget.kind === 'playlist' && auth?.type === ServerType.SAMO) {
                menuActions.push({
                    destructive: true,
                    icon: <TrashGlyph color={DESTRUCTIVE_TINT} />,
                    id: 'delete-playlist',
                    label: 'Delete Playlist',
                    onPress: () => handleDeletePlaylistForItem(item),
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

        if (contextMenuTarget.removeFromHomeKey) {
            const homeKey = contextMenuTarget.removeFromHomeKey;
            menuActions.push({
                icon: <ClearGlyph color={colors.text} />,
                id: 'remove-from-home',
                label: 'Remove from Home',
                onPress: () => {
                    hideFromHome(homeKey);
                    setContextMenuTarget(null);
                },
            });
        }

        return menuActions;
        // `serverConnection` is not read directly here, but the samo-radio
        // predicates resolve an item against the live session — a menu built
        // for the previous server must not survive a reconnect.
    }, [canAppendToQueue, contextMenuTarget, favoritedKeys, samoRadioTargets, serverConnection]);

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

    return {
        actions,
        artworkImageId,
        artworkUrl,
        contentSource,
        eyebrow,
        feedback: contextMenuFeedback,
        isCircularArtwork,
        onClose: closeContextMenu,
        subtitle,
        target: contextMenuTarget,
        title,
    };
}
