import { useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useRef } from 'react';

import { queryKeys } from '/@/renderer/api/query-keys';
import { eventEmitter } from '/@/renderer/events/event-emitter';
import { artistsQueries } from '/@/renderer/features/artists/api/artists-api';
import { useIsPlayerFetching, usePlayer } from '/@/renderer/features/player/context/player-context';
import { songsQueries } from '/@/renderer/features/songs/api/songs-api';
import {
    getQueue,
    useAutoDJSettings,
    useCurrentServer,
    useCurrentServerId,
    usePlayerStoreBase,
    useSettingsStore,
} from '/@/renderer/store';
import { shuffleInPlace } from '/@/renderer/utils/shuffle';
import { Played, Song, SongListSort, SortOrder } from '/@/shared/types/domain-types';
import { Play, PlayerStatus } from '/@/shared/types/types';
import { LogCategory, logFn } from '/@/shared/utils/logger';
import { logMsg } from '/@/shared/utils/logger-message';

/** How many similar artists to pull tracks from — each one costs a request. */
const SIMILAR_ARTIST_FANOUT = 5;

export const useAutoDJ = () => {
    const queryClient = useQueryClient();
    const serverId = useCurrentServerId();
    const server = useCurrentServer();
    const player = usePlayer();
    const settings = useAutoDJSettings();
    const isFetching = useIsPlayerFetching();

    // The handler is async and the store can tick again mid-fetch. Without this
    // two runs overlap and both append their own batch.
    const isRunningRef = useRef(false);

    useEffect(() => {
        const unsubscribe = usePlayerStoreBase.subscribe(
            (state) => {
                const queue = getQueue(undefined, state);
                const index = state.player.index;
                const remaining = queue.items.slice(index + 1).length;

                return { index, remaining, song: queue.items[index] };
            },
            async (properties) => {
                if (!settings.enabled) {
                    return;
                }

                // If no current song, don't autoplay
                if (!properties.song?.id) {
                    return;
                }

                if (properties.remaining >= settings.timing) {
                    return;
                }

                if (isRunningRef.current) {
                    return;
                }

                isRunningRef.current = true;

                logFn.debug(logMsg[LogCategory.PLAYER].autoPlayTriggered, {
                    category: LogCategory.PLAYER,
                    meta: { remaining: properties.remaining, songId: properties.song?.id },
                });

                try {
                    const queue = getQueue();
                    const queueSongIdSet = new Set(queue.items.map((item) => item.id));

                    const selected: Song[] = [];
                    const selectedSongIds = new Set<string>();
                    const remainingCount = () => settings.itemCount - selected.length;

                    // Fill the requested slots one priority tier at a time, shuffling
                    // *within* a tier. Shuffling the combined pool instead would let a
                    // lower tier displace a higher one whenever the higher tier came up
                    // short.
                    const takeSlots = (candidates: Song[], slots: number) => {
                        if (slots <= 0) {
                            return;
                        }

                        const available = candidates.filter(
                            (song) => !queueSongIdSet.has(song.id) && !selectedSongIds.has(song.id),
                        );

                        for (const song of shuffleInPlace(available).slice(0, slots)) {
                            selectedSongIds.add(song.id);
                            selected.push(song);
                        }
                    };

                    const albumArtist = properties.song?.albumArtists?.[0];

                    const hasMusicFolder = server?.musicFolderId && server.musicFolderId.length > 0;
                    // Samo's similar-songs endpoint can't be scoped to a music folder,
                    // so skip it entirely when one is selected.
                    const trySimilarSongs = !hasMusicFolder;

                    // Tier 1: the server's own similar-songs endpoint. Samo's controller
                    // still stubs this to [], so it contributes nothing today and the
                    // artist tiers below carry the whole result.
                    if (trySimilarSongs) {
                        const similarSongs = await queryClient.fetchQuery({
                            ...songsQueries.similar({
                                query: {
                                    count: settings.itemCount,
                                    songId: properties.song?.id,
                                },
                                serverId,
                            }),
                            queryKey: queryKeys.player.fetch({ similarSongs: properties.song?.id }),
                        });

                        takeSlots(similarSongs, remainingCount());
                    }

                    // Tier 2: artists the server considers similar to this one. Deezer
                    // supplies the names and samo-server resolves the ones it can find in
                    // the library to real catalog ids; the rest come back as `ext:<name>`
                    // placeholders with nothing playable behind them.
                    if (remainingCount() > 0 && albumArtist?.id) {
                        const artistDetail = await queryClient.fetchQuery(
                            artistsQueries.albumArtistDetail({
                                query: { id: albumArtist.id },
                                serverId,
                            }),
                        );

                        const inLibraryArtistIds = (artistDetail?.similarArtists ?? [])
                            .map((artist) => artist.id)
                            .filter((id) => Boolean(id) && !id.startsWith('ext:'));

                        if (inLibraryArtistIds.length > 0) {
                            const similarArtistSongs = await queryClient.fetchQuery({
                                ...songsQueries.list({
                                    query: {
                                        albumArtistIds: shuffleInPlace([
                                            ...inLibraryArtistIds,
                                        ]).slice(0, SIMILAR_ARTIST_FANOUT),
                                        limit: 100,
                                        sortBy: SongListSort.RANDOM,
                                        sortOrder: SortOrder.ASC,
                                        startIndex: 0,
                                    },
                                    serverId,
                                }),
                                queryKey: queryKeys.player.fetch({
                                    similarArtists: albumArtist.id,
                                }),
                            });

                            takeSlots(similarArtistSongs.items, remainingCount());
                        }
                    }

                    // Tier 3: more from the artist we're already playing.
                    if (remainingCount() > 0 && albumArtist?.id) {
                        const albumArtistSongs = await queryClient.fetchQuery({
                            ...songsQueries.list({
                                query: {
                                    albumArtistIds: [albumArtist.id],
                                    limit: 50,
                                    sortBy: SongListSort.RANDOM,
                                    sortOrder: SortOrder.ASC,
                                    startIndex: 0,
                                },
                                serverId,
                            }),
                            queryKey: queryKeys.player.fetch({
                                albumArtist,
                                similarSongs: properties.song?.id,
                            }),
                        });

                        takeSlots(albumArtistSongs.items, remainingCount());
                    }

                    // Tier 4: anything, rather than stop playback.
                    if (remainingCount() > 0) {
                        const randomSongs = await queryClient.fetchQuery({
                            ...songsQueries.random({
                                query: { limit: 50, played: Played.All },
                                serverId,
                            }),
                        });

                        takeSlots(randomSongs.items, remainingCount());
                    }

                    const songsToAdd = selected;

                    if (songsToAdd.length === 0) {
                        return;
                    }

                    // Add to the end of the queue
                    player.addToQueueByData(songsToAdd, Play.LAST);

                    // If the previous track ended while Auto DJ was fetching, mediaAutoNext
                    // has already wrapped to index 0 and paused. Jump to the first freshly
                    // enqueued song so playback continues without replaying earlier tracks.
                    const stateAfter = usePlayerStoreBase.getState();
                    if (
                        stateAfter.player.status === PlayerStatus.PAUSED &&
                        properties.remaining === 0
                    ) {
                        const firstNewSongIndex = properties.index + 1;
                        const queueAfter = getQueue(undefined, stateAfter);
                        if (firstNewSongIndex < queueAfter.items.length) {
                            stateAfter.mediaPlayByIndex(firstNewSongIndex);
                        }
                    }

                    // Emit event to trigger queue follow
                    eventEmitter.emit('AUTODJ_QUEUE_ADDED', {
                        songCount: songsToAdd.length,
                    });
                } catch (error) {
                    logFn.error(logMsg[LogCategory.PLAYER].autoPlayFailed, {
                        category: LogCategory.PLAYER,
                        meta: { error: (error as Error).message, songId: properties.song?.id },
                    });
                } finally {
                    isRunningRef.current = false;
                }
            },
            {
                equalityFn: (a, b) => {
                    return a.song?._uniqueId === b.song?._uniqueId && a.remaining === b.remaining;
                },
                // Turning Auto DJ on is itself the trigger — without this the
                // subscriber sits idle until the next store tick, so enabling it
                // while already on the last track appeared to do nothing.
                fireImmediately: true,
            },
        );

        return () => unsubscribe();
    }, [
        isFetching,
        player,
        queryClient,
        server,
        serverId,
        settings.enabled,
        settings.itemCount,
        settings.timing,
    ]);
};

const AutoDJHookInner = () => {
    useAutoDJ();
    return null;
};

export const AutoDJHook = () => {
    const isAutoDJEnabled = useSettingsStore((state) => state.autoDJ.enabled);

    if (!isAutoDJEnabled) {
        return null;
    }

    return React.createElement(AutoDJHookInner);
};
