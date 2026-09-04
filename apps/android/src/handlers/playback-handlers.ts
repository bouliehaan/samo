import {
    buildSamoAudiobookQueueFromFiles,
    isMobileExploPlaylistDetail,
    isMobilePlaylistDetailEditable,
    type MobileHomeItem,
    MobileHomeItemType,
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobileMediaTrack,
    type MobileSearchItem,
} from '@samo/core/mobile';
import { resolveLongFormResumeSeconds } from '@samo/core/playback';
import { ensureSamoStreamToken } from '@samo/core/server';

import { loadCurrentPlaybackProgressBounded } from '../services/playback-progress';
import { loadMirrorMediaDetailIfFresh } from '../services/media-detail-freshness';
import {
    getLocalDownloadForTrack,
    getOfflineAudiobookFiles,
} from '../services/download-manager';
import {
    getTrackTimelineSegments,
    isValidTrackPlayback,
    loadAndroidMediaDetail,
    loadAndroidMediaTrackPlayback,
} from '../services/media-detail';
import { getPersistedServerAuthKey } from '../services/persisted-server';
import { setMediaDetailState } from '../state/app-navigation';
import { getAuthSession } from '../state/auth-session';
import { getPlaybackBridge } from '../state/playback-bridge';
import { setAndroidPlaybackState } from '../state/playback-store';
import { rememberMediaDetail } from '../utils/media-detail-cache';
import { getNativeResumeProgress } from '../utils/native-resume';
import {
    audiobookFilesTimelineDurationSeconds,
    buildAudiobookFilePlaybackQueue,
    buildOfflineAudiobookPlayable,
    buildOfflinePodcastEpisodePlayable,
} from '../utils/offline-playback';
import { preparePlaybackItemForNative } from '../utils/samo-artwork-url';
import { type AndroidPlayItemOptions } from '../hooks/use-android-native-playback';
import { getRecentContentItemKey, recentContentItemFromMediaDetail } from '../services/recent-content';
import {
    audiobookStartRequestId,
    mediaDetailCache,
    mediaDetailRequestId,
} from './handler-state';
import { recordRecentContentItem } from './recents';

const playlistPlaybackOptions = (
    detail: MobileMediaDetail,
    shuffled: boolean,
): AndroidPlayItemOptions => ({
    // Asked here, of the detail, because this is the last place that HAS one:
    // the queue outlives the page it was started from, and the fullscreen
    // player's menu needs to know whether these tracks are Explore drops — and,
    // below, which playlist they can be removed from.
    isExploPlaylist: isMobileExploPlaylistDetail(detail),
    omitTrackRecentlyPlayed: detail.type === MobileMediaDetailType.PLAYLIST,
    shuffled,
    ...(detail.type === MobileMediaDetailType.PLAYLIST ? { samoPlaylistId: detail.id } : {}),
    // Editability is settled HERE, against the real detail, so no later surface
    // has to guess at it: someone else's playlist and the server-managed
    // Explore drop both fail this and simply never carry the stamp.
    ...(isMobilePlaylistDetailEditable(detail)
        ? {
              editablePlaylist: {
                  id: detail.id,
                  sourceId: detail.source.id,
                  title: detail.title,
                  // The WHOLE playlist, not just the tracks being queued: a
                  // filtered play (search-within-playlist, a Hi-Fi filter)
                  // queues a subset, and every one of those is still a member.
                  // Appended Up Next tracks are what this has to exclude.
                  trackIds: detail.tracks.map((track) => track.id),
              },
          }
        : {}),
});

export const handlePlayMediaTrack = async (
    detail: MobileMediaDetail,
    track: MobileMediaTrack,
    index: number,
    queueTracks?: MobileMediaTrack[],
    options?: { isCurrentRequest?: () => boolean },
): Promise<void> => {
    const isCurrentRequest = () => options?.isCurrentRequest?.() !== false;
    const { progressContextRef, handlePlayItem } = getPlaybackBridge();
    const serverConnection = getAuthSession().serverConnection;
    const containerRecentItem = recentContentItemFromMediaDetail(detail);
    if (containerRecentItem) {
        recordRecentContentItem(containerRecentItem);
    }
    if (
        isValidTrackPlayback(track.playback) &&
        !(
            detail.type === MobileMediaDetailType.PODCAST &&
            serverConnection &&
            getPersistedServerAuthKey(serverConnection) === detail.source.id
        )
    ) {
        const currentTrackPlayback = track.playback;
        const preparedTrack = await preparePlaybackItemForNative(
            await loadAndroidMediaTrackPlayback(serverConnection, detail, track),
            serverConnection,
        ).catch(() => currentTrackPlayback);
        if (!isCurrentRequest()) return;

        const playOptions = playlistPlaybackOptions(detail, false);

        if (detail.type === MobileMediaDetailType.AUDIOBOOK) {
            const targetBookSeconds = track.startSeconds ?? 0;

            // samo audiobooks: build a real multi-file ExoPlayer queue from
            // the per-file manifest. Each file streams WHOLE (the player
            // seeks locally), so -15s / Previous / chapter jumps are instant
            // local seeks and there is no stream-restart-to-go-back anymore.
            if (serverConnection && detail.audiobookFiles?.length) {
                const streamToken = await ensureSamoStreamToken(serverConnection).catch(
                    () => undefined,
                );
                if (!isCurrentRequest()) return;
                const queue = buildSamoAudiobookQueueFromFiles(serverConnection, {
                    artworkUrl: detail.artworkUrl,
                    audiobookId: detail.id,
                    bookStartSeconds: targetBookSeconds,
                    files: detail.audiobookFiles,
                    streamToken,
                    subtitle: detail.authorsSummary ?? detail.subtitle,
                    timelineDurationSeconds: detail.durationSeconds,
                    timelineSegments: getTrackTimelineSegments(detail, track),
                    title: detail.title,
                });
                if (queue && queue.items.length > 0) {
                    // Prepare only the STARTING file; the others were just
                    // built with a fresh stream token and native refreshes
                    // each file's token again at advance time.
                    const startItem = await preparePlaybackItemForNative(
                        queue.items[queue.index]!,
                        serverConnection,
                    ).catch(() => queue.items[queue.index]!);
                    if (!isCurrentRequest()) return;
                    const sessionItems = queue.items.map((candidate, candidateIndex) =>
                        candidateIndex === queue.index ? startItem : candidate,
                    );
                    await handlePlayItem(startItem, sessionItems, queue.index, playOptions);
                    return;
                }
            }

            await handlePlayItem(preparedTrack, [preparedTrack], 0, playOptions);
            return;
        }

        // Only the TAPPED item is prepared (token + artwork resolution) —
        // done above. The rest of the queue rides RAW: native re-mints each
        // track's stream token as ExoPlayer opens it (SamoResolvingDataSource
        // for music/podcast playlists, refreshQueueItemAsync for mirror
        // advance), so JS-rewriting every URL up front was O(queue) work per
        // tap that native immediately redid anyway. Cast advance also
        // prepares per-item at its own play time (advanceQueue →
        // playQueuedItem → preparePlaybackItemForNative).
        const queueItems = (queueTracks ?? detail.tracks).flatMap((candidate) =>
            isValidTrackPlayback(candidate.playback) ? [candidate.playback] : [],
        );

        // Locate the tapped track in the prepared queue. Match the freshly
        // resolved playable first, then fall back to the track's original
        // playback id — a re-resolve can shift the id (quality / stream-token
        // drift), and when it does we must NOT collapse the whole queue to a
        // single song. That collapse is the "filter a playlist to Hi-Fi →
        // only one track plays" bug: a 1-item queue never mirrors to the
        // native player, so there's nothing to auto-advance into. A missing
        // match instead splices the playable in at its intended position so
        // the rest of the queue — and native gapless advance — survives.
        let queueIndex = queueItems.findIndex(
            (candidate) => candidate.id === preparedTrack.id,
        );
        if (queueIndex < 0 && track.playback?.id) {
            queueIndex = queueItems.findIndex(
                (candidate) => candidate.id === track.playback?.id,
            );
        }

        if (!isCurrentRequest()) return;
        if (queueIndex >= 0) {
            const sessionQueue = queueItems.map((candidate, candidateIndex) =>
                candidateIndex === queueIndex ? preparedTrack : candidate,
            );
            await handlePlayItem(preparedTrack, sessionQueue, queueIndex, playOptions);
        } else if (queueItems.length > 0) {
            const insertAt = Math.min(Math.max(0, index), queueItems.length);
            const sessionQueue = [
                ...queueItems.slice(0, insertAt),
                preparedTrack,
                ...queueItems.slice(insertAt),
            ];
            await handlePlayItem(preparedTrack, sessionQueue, insertAt, playOptions);
        } else {
            await handlePlayItem(preparedTrack, [preparedTrack], 0, playOptions);
        }
        return;
    }

    // NOTE: no pre-play progress GET here anymore. Podcast/audiobook resume
    // is owned by ONE place — playQueuedItem's bounded
    // refreshPlayableResumeFromServerBounded — which runs AFTER the tap has
    // painted. The serial server read this used to do in front of every
    // samo podcast tap was the remaining "tap looks dead on a slow server"
    // path in this handler.
    const trackToPlay = track;
    const progressAuth = serverConnection ?? undefined;

    // Podcast offline path: the ABS /play endpoint that normally builds the
    // streaming URL fails offline, so synthesize a MobilePlayableAudio
    // directly from the downloaded file when one exists for this episode.
    if (detail.type === MobileMediaDetailType.PODCAST) {
        const lookupTrackId = trackToPlay.episodeId ?? trackToPlay.id;
        const localDownload = await getLocalDownloadForTrack(lookupTrackId, detail.source.id);
        if (!isCurrentRequest()) return;
        if (localDownload) {
            const playable = buildOfflinePodcastEpisodePlayable(
                detail,
                trackToPlay,
                localDownload.localUri,
                localDownload.sourceUrl,
                progressAuth,
            );
            if (progressAuth && trackToPlay.itemId) {
                progressContextRef.current = {
                    authentication: progressAuth,
                    durationSeconds: trackToPlay.durationSeconds ?? 0,
                    episodeId: trackToPlay.episodeId,
                    itemId: trackToPlay.itemId,
                };
            } else {
                progressContextRef.current = null;
            }
            if (!isCurrentRequest()) return;
            await handlePlayItem(playable, [playable], 0, { shuffled: false });
            return;
        }
    }

    // Multi-file audiobook offline path: when more than one file has been
    // downloaded for this book, build a per-file queue and start at the
    // file that contains the requested chapter / book time. ExoPlayer
    // auto-advances through the queue so playback continues seamlessly
    // across file boundaries.
    if (detail.type === MobileMediaDetailType.AUDIOBOOK) {
        const offlineFiles = await getOfflineAudiobookFiles(detail.id, detail.source.id);
        if (!isCurrentRequest()) return;
        if (offlineFiles.length > 1) {
            const targetBookSeconds = trackToPlay.startSeconds ?? 0;
            const timelineDurationSeconds =
                audiobookFilesTimelineDurationSeconds(offlineFiles);
            const { index: startIndex, items } = buildAudiobookFilePlaybackQueue(
                detail,
                offlineFiles,
                targetBookSeconds,
                (file, initialPositionSeconds) =>
                    buildOfflineAudiobookPlayable(
                        detail,
                        file,
                        initialPositionSeconds,
                        progressAuth,
                        timelineDurationSeconds,
                    ),
            );
            if (progressAuth && trackToPlay.itemId) {
                progressContextRef.current = {
                    authentication: progressAuth,
                    durationSeconds: timelineDurationSeconds ?? 0,
                    episodeId: undefined,
                    itemId: trackToPlay.itemId,
                };
            } else {
                progressContextRef.current = null;
            }
            if (!isCurrentRequest()) return;
            await handlePlayItem(items[startIndex]!, items, startIndex, { shuffled: false });
            return;
        }
    }

    try {
        const playable = await loadAndroidMediaTrackPlayback(
            serverConnection,
            detail,
            trackToPlay,
        );
        if (!isCurrentRequest()) return;

        if (
            progressAuth &&
            (playable.source === 'audiobook' || playable.source === 'podcast') &&
            trackToPlay.itemId
        ) {
            progressContextRef.current = {
                authentication: progressAuth,
                // Book-global for audiobooks (a multi-file item's own
                // durationSeconds is just the current file); podcasts stream
                // whole, so the two are the same there.
                durationSeconds:
                    playable.timelineDurationSeconds ?? playable.durationSeconds ?? 0,
                episodeId: trackToPlay.episodeId,
                itemId: trackToPlay.itemId,
            };
        } else {
            progressContextRef.current = null;
        }

        if (!isCurrentRequest()) return;
        await handlePlayItem(playable, [playable], index, { shuffled: false });
    } catch (error) {
        if (!isCurrentRequest()) return;
        setMediaDetailState({
            itemTitle: detail.title,
            message: error instanceof Error ? error.message : 'Playback failed',
            status: 'error',
        });
    }
};

export const handleStartAudiobook = async (
    item: MobileHomeItem | MobileSearchItem,
): Promise<void> => {
    mediaDetailRequestId.current += 1;
    const requestId = (audiobookStartRequestId.current += 1);
    const isCurrentRequest = () => audiobookStartRequestId.current === requestId;
    const serverConnection = getAuthSession().serverConnection;
    setAndroidPlaybackState((current) =>
        current.status === 'idle' ? current : { ...current, message: 'Loading audiobook…' },
    );

    // LOCAL FIRST. The mirror holds every samo audiobook's chapters + file
    // manifest, so a book tap should never wait on the network before
    // sound. Order: in-memory cache → synchronous SQLite mirror read → fs
    // cache → downloaded-files synthesis → network as the LAST resort
    // (fresh install mid-sync). The old order awaited a network detail
    // fetch FIRST — on a slow server that was up to 30s of dead tap.
    const cacheKey = getRecentContentItemKey(item);
    let detail: MobileMediaDetail | undefined = mediaDetailCache.get(cacheKey);

    if (!detail) {
        detail =
            (await loadMirrorMediaDetailIfFresh(item, serverConnection, cacheKey)) ?? undefined;
        if (detail) {
            rememberMediaDetail(mediaDetailCache, cacheKey, detail);
        }
    }

    if (!detail) {
        // Last resort: build a synthetic detail from the downloaded files.
        // Lets the user play an audiobook entirely offline even if the
        // server's never been reached since launch.
        const offlineFiles = await getOfflineAudiobookFiles(item.id, item.source?.id ?? '');
        if (!isCurrentRequest()) return;
        if (offlineFiles.length > 0 && item.source) {
            detail = {
                artworkUrl: item.artworkUrl,
                id: item.id,
                source: item.source,
                subtitle: item.subtitle,
                title: item.title,
                tracks: offlineFiles.map((file) => ({
                    artworkUrl: item.artworkUrl,
                    durationSeconds: file.durationSeconds,
                    id: `${item.id}:${file.ino}`,
                    itemId: item.id,
                    startSeconds: file.startOffsetSeconds,
                    subtitle: item.subtitle,
                    title: item.title,
                    trackNumber: file.index + 1,
                })),
                type: MobileMediaDetailType.AUDIOBOOK,
            };
        }
    }

    if (!detail) {
        // Nothing local at all (fresh install before the first sync
        // finished). The network is the only option left — fetch, cache,
        // and surface its error state if it fails.
        const networkResult = await loadAndroidMediaDetail(serverConnection, item);
        if (!isCurrentRequest()) return;
        if (networkResult.status !== 'loaded') {
            setMediaDetailState(networkResult);
            return;
        }
        detail = networkResult.detail;
    }

    rememberMediaDetail(mediaDetailCache, cacheKey, detail);
    const auth = serverConnection;

    if (!auth || detail.tracks.length === 0 || detail.type !== MobileMediaDetailType.AUDIOBOOK) {
        setMediaDetailState({ detail, status: 'loaded' });
        return;
    }

    // Bounded: a user is mid-tap. The unbounded read gave a sick server
    // 30s to answer before the book would start; 4s then falling back to
    // the item's own resume data matches playQueuedItem's budget.
    const progress = await loadCurrentPlaybackProgressBounded(auth, detail.id);
    if (!isCurrentRequest()) return;
    // `detail.durationSeconds` is the BOOK-GLOBAL timeline the saved position is
    // measured against — the per-chapter durations below are not.
    let resumeSeconds = resolveLongFormResumeSeconds({
        completed: progress?.isFinished,
        durationSeconds: detail.durationSeconds,
        progressSeconds: progress?.currentTimeSeconds,
    });
    // Flaky LAN: the bounded server read can transiently fail (null), which
    // would seed the queue at 0 and lose the spot. Fall back to the native
    // local resume cache, same as refreshPlayableResumeFromServer does.
    if (resumeSeconds <= 0 && !progress) {
        const cached = await getNativeResumeProgress('audiobook', detail.id);
        if (!isCurrentRequest()) return;
        if (cached) {
            resumeSeconds = resolveLongFormResumeSeconds({
                completed: cached.completed,
                durationSeconds: detail.durationSeconds,
                progressSeconds: cached.progressSeconds,
            });
        }
    }
    const chapterIndex =
        resumeSeconds > 0
            ? Math.max(
                  0,
                  detail.tracks.findIndex((track, index) => {
                      const start = track.startSeconds ?? 0;
                      const next =
                          detail.tracks[index + 1]?.startSeconds ??
                          start + (track.durationSeconds ?? Number.POSITIVE_INFINITY);
                      return resumeSeconds >= start && resumeSeconds < next;
                  }),
              )
            : 0;
    const baseTrack = detail.tracks[chapterIndex] ?? detail.tracks[0];

    // For resume, override the chapter's startSeconds with the user's actual
    // position so the samo audiobook playback path seeds
    // initialPositionSeconds correctly inside playQueuedItem.
    const trackToPlay: MobileMediaTrack =
        resumeSeconds > 0 && baseTrack ? { ...baseTrack, startSeconds: resumeSeconds } : baseTrack;

    if (!trackToPlay) {
        setMediaDetailState({ detail, status: 'loaded' });
        return;
    }

    if (!isCurrentRequest()) return;
    await handlePlayMediaTrack(detail, trackToPlay, chapterIndex, undefined, {
        isCurrentRequest,
    });
};

export const handleShuffleDetailTracks = async (
    detail: MobileMediaDetail,
    tracks: MobileMediaTrack[] = detail.tracks,
): Promise<void> => {
    const playableTracks = tracks.flatMap((track) =>
        isValidTrackPlayback(track.playback) ? [track.playback] : [],
    );

    if (playableTracks.length === 0) {
        return;
    }

    const shuffled = [...playableTracks];

    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    await getPlaybackBridge().handlePlayItem(
        shuffled[0],
        shuffled,
        0,
        playlistPlaybackOptions(detail, true),
    );
};

export const handleShuffleHomeItems = async (items: MobileHomeItem[]): Promise<void> => {
    const playableItems = items.flatMap((item) => (item.playback ? [item.playback] : []));

    if (playableItems.length === 0) {
        return;
    }

    const shuffled = [...playableItems];

    for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    await getPlaybackBridge().handlePlayItem(shuffled[0], shuffled, 0, { shuffled: true });
};
