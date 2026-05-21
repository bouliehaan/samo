import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { closeAllModals, openModal } from '@mantine/modals';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid/non-secure';
import { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { queryKeys } from '/@/renderer/api/query-keys';
import { albumQueries } from '/@/renderer/features/albums/api/album-api';
import { artistsQueries } from '/@/renderer/features/artists/api/artists-api';
import { filterSongsByPlayerFilters, getAlbumArtistSongsById, getAlbumSongsById, getGenreSongsById, getPlaylistSongsById, getSongsByFolder, } from '/@/renderer/features/player/utils';
import { playlistsQueries } from '/@/renderer/features/playlists/api/playlists-api';
import { songsQueries } from '/@/renderer/features/songs/api/songs-api';
import { recordRecentSong, usePlayerActions, useSettingsStore, } from '/@/renderer/store';
import { LogCategory, logFn } from '/@/renderer/utils/logger';
import { logMsg } from '/@/renderer/utils/logger-message';
import { shuffle as shuffleArray } from '/@/renderer/utils/shuffle';
import { sortSongsByFetchedOrder } from '/@/shared/api/utils';
import { Checkbox } from '/@/shared/components/checkbox/checkbox';
import { ConfirmModal } from '/@/shared/components/modal/modal';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { useLocalStorage } from '/@/shared/hooks/use-local-storage';
import { AlbumListSort, instanceOfCancellationError, LibraryItem, } from '/@/shared/types/domain-types';
export const PlayerContext = createContext({
    addToQueueByData: () => { },
    addToQueueByFetch: () => { },
    addToQueueByListQuery: async () => { },
    clearQueue: () => { },
    clearSelected: () => { },
    decreaseVolume: () => { },
    increaseVolume: () => { },
    mediaNext: () => { },
    mediaPause: () => { },
    mediaPlay: () => { },
    mediaPlayByIndex: () => { },
    mediaPrevious: () => { },
    mediaSeekToTimestamp: () => { },
    mediaSkipBackward: () => { },
    mediaSkipForward: () => { },
    mediaStop: () => { },
    mediaToggleMute: () => { },
    mediaTogglePlayPause: () => { },
    moveSelectedTo: () => { },
    moveSelectedToBottom: () => { },
    moveSelectedToNext: () => { },
    moveSelectedToTop: () => { },
    setQueue: () => { },
    setRepeat: () => { },
    setShuffle: () => { },
    setSpeed: () => { },
    setVolume: () => { },
    shuffle: () => { },
    shuffleAll: () => { },
    shuffleSelected: () => { },
    toggleRepeat: () => { },
    toggleShuffle: () => { },
});
const getRootQueryKey = (itemType, serverId) => {
    switch (itemType) {
        case LibraryItem.ALBUM:
            return queryKeys.songs.root(serverId);
        case LibraryItem.ALBUM_ARTIST:
            return queryKeys.songs.root(serverId);
        case LibraryItem.ARTIST:
            return queryKeys.songs.root(serverId);
        case LibraryItem.GENRE:
            return queryKeys.songs.root(serverId);
        case LibraryItem.PLAYLIST:
            return queryKeys.playlists.root(serverId);
        case LibraryItem.SONG:
            return queryKeys.songs.root(serverId);
        default:
            return queryKeys.songs.root(serverId);
    }
};
export const PlayerProvider = ({ children }) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const storeActions = usePlayerActions();
    const timeoutIds = useRef({});
    const [doNotShowAgain, setDoNotShowAgain] = useLocalStorage({
        defaultValue: false,
        key: 'large_fetch_confirmation',
    });
    const confirmLargeFetch = useCallback(() => {
        if (doNotShowAgain) {
            return Promise.resolve(true);
        }
        return new Promise((resolve) => {
            openModal({
                children: (_jsx(ConfirmModal, { labels: {
                        cancel: t('common.cancel', { postProcess: 'titleCase' }),
                        confirm: t('common.confirm', { postProcess: 'titleCase' }),
                    }, onCancel: () => {
                        resolve(false);
                        closeAllModals();
                    }, onConfirm: () => {
                        resolve(true);
                        closeAllModals();
                    }, children: _jsxs(Stack, { children: [_jsx(Text, { children: t('form.largeFetchConfirmation.description', {
                                    postProcess: 'sentenceCase',
                                }) }), _jsx(Checkbox, { label: t('common.doNotShowAgain', {
                                    postProcess: 'sentenceCase',
                                }), onChange: (event) => {
                                    setDoNotShowAgain(event.currentTarget.checked);
                                } })] }) })),
                title: t('form.largeFetchConfirmation.title', {
                    postProcess: 'sentenceCase',
                }),
            });
        });
    }, [doNotShowAgain, setDoNotShowAgain, t]);
    const addToQueueByData = useCallback((data, type, playSongId, context) => {
        const filters = useSettingsStore.getState().playback.filters;
        const filteredData = filterSongsByPlayerFilters(data, filters);
        const selectedSong = playSongId
            ? data.find((song) => song.id === playSongId)
            : data.length === 1
                ? data[0]
                : undefined;
        if (selectedSong) {
            recordRecentSong(selectedSong);
        }
        if (typeof type === 'object' && 'edge' in type && type.edge !== null) {
            const edge = type.edge === 'top' ? 'top' : 'bottom';
            logFn.debug(logMsg[LogCategory.PLAYER].addToQueueByData, {
                category: LogCategory.PLAYER,
                meta: {
                    data: data.length,
                    edge,
                    filtered: filteredData.length,
                    type,
                    uniqueId: type.uniqueId,
                },
            });
            // Insert-by-uniqueId is always additive — never resets context.
            storeActions.addToQueueByUniqueId(filteredData, type.uniqueId, edge, playSongId);
        }
        else {
            logFn.debug(logMsg[LogCategory.PLAYER].addToQueueByType, {
                category: LogCategory.PLAYER,
                meta: { data: data.length, filtered: filteredData.length, type },
            });
            storeActions.addToQueueByType(filteredData, type, playSongId, context);
        }
    }, [storeActions]);
    const addToQueueByFetch = useCallback(async (serverId, id, itemType, type) => {
        let toastId = null;
        const fetchId = nanoid();
        timeoutIds.current = {
            ...timeoutIds.current,
            [fetchId]: setTimeout(() => {
                toastId = toast.info({
                    autoClose: false,
                    message: t('player.playbackFetchCancel', {
                        postProcess: 'sentenceCase',
                    }),
                    onClose: () => {
                        queryClient.cancelQueries({
                            exact: false,
                            queryKey: getRootQueryKey(itemType, serverId),
                        });
                        queryClient.cancelQueries({
                            exact: false,
                            queryKey: queryKeys.player.fetch(),
                        });
                    },
                    title: t('player.playbackFetchInProgress', {
                        postProcess: 'sentenceCase',
                    }),
                });
            }, 2000),
        };
        try {
            logFn.debug(logMsg[LogCategory.PLAYER].addToQueueByFetch, {
                category: LogCategory.PLAYER,
                meta: { ids: id, itemType, serverId, type },
            });
            const songs = await queryClient.fetchQuery({
                gcTime: 0,
                queryFn: () => {
                    return fetchSongsByItemType(queryClient, serverId, {
                        id,
                        itemType,
                    });
                },
                queryKey: queryKeys.player.fetch(fetchId),
                staleTime: 0,
            });
            clearTimeout(timeoutIds.current[fetchId]);
            delete timeoutIds.current[fetchId];
            if (toastId) {
                toast.hide(toastId);
            }
            let sortedSongs = [];
            // Playlists should use the native order of the playlist
            if (itemType === LibraryItem.PLAYLIST) {
                sortedSongs = songs;
            }
            else {
                sortedSongs = sortSongsByFetchedOrder(songs, id, itemType);
            }
            const filters = useSettingsStore.getState().playback.filters;
            const filteredSongs = filterSongsByPlayerFilters(sortedSongs, filters);
            if (typeof type === 'object' && 'edge' in type && type.edge !== null) {
                const edge = type.edge === 'top' ? 'top' : 'bottom';
                storeActions.addToQueueByUniqueId(filteredSongs, type.uniqueId, edge);
            }
            else {
                // Header "Play" buttons land here — when the user fetches a single
                // album or playlist by id, we have everything we need to derive the
                // structured context that gates queue persistence. Multi-id fetches
                // (e.g. shuffle-all across multiple albums) intentionally fall back to
                // SONG context inside the store.
                const derivedContext = id.length === 1 && itemType === LibraryItem.ALBUM
                    ? { albumId: id[0], kind: 'album', serverId }
                    : id.length === 1 && itemType === LibraryItem.PLAYLIST
                        ? { kind: 'playlist', playlistId: id[0], serverId }
                        : undefined;
                storeActions.addToQueueByType(filteredSongs, type, undefined, derivedContext);
            }
        }
        catch (err) {
            if (instanceOfCancellationError(err)) {
                return;
            }
            clearTimeout(timeoutIds.current[fetchId]);
            delete timeoutIds.current[fetchId];
            if (toastId) {
                toast.hide(toastId);
            }
            toast.error({
                message: err.message,
                title: t('error.genericError', { postProcess: 'sentenceCase' }),
            });
        }
    }, [queryClient, storeActions, t]);
    const addToQueueByListQuery = useCallback(async (serverId, query, itemType, type) => {
        let toastId = null;
        let fetchId = null;
        logFn.debug(logMsg[LogCategory.PLAYER].addToQueueByListQuery, {
            category: LogCategory.PLAYER,
            meta: { itemType, query, serverId, type },
        });
        try {
            let totalCount = 0;
            let listQueryFn;
            let listCountQueryFn;
            // Special handling for albums with random sort: fetch in name order, then shuffle client-side
            const isAlbumRandomSort = itemType === LibraryItem.ALBUM && query.sortBy === AlbumListSort.RANDOM;
            const fetchQuery = isAlbumRandomSort
                ? { ...query, sortBy: AlbumListSort.NAME }
                : query;
            switch (itemType) {
                case LibraryItem.ALBUM: {
                    listQueryFn = albumQueries.list;
                    listCountQueryFn = albumQueries.listCount;
                    break;
                }
                case LibraryItem.ALBUM_ARTIST: {
                    listQueryFn = artistsQueries.albumArtistList;
                    listCountQueryFn = artistsQueries.albumArtistListCount;
                    break;
                }
                case LibraryItem.ARTIST: {
                    listQueryFn = artistsQueries.artistList;
                    listCountQueryFn = artistsQueries.artistListCount;
                    break;
                }
                case LibraryItem.PLAYLIST: {
                    listQueryFn = playlistsQueries.list;
                    listCountQueryFn = playlistsQueries.listCount;
                    break;
                }
                case LibraryItem.SONG: {
                    listQueryFn = songsQueries.list;
                    listCountQueryFn = songsQueries.listCount;
                    break;
                }
                default: {
                    throw new Error(`Unsupported item type: ${itemType}`);
                }
            }
            // Get total count
            const countResult = (await queryClient.fetchQuery({
                ...listCountQueryFn({
                    query: { ...fetchQuery },
                    serverId,
                }),
                gcTime: 0,
                queryKey: queryKeys.player.fetch(),
                staleTime: 0,
            }));
            totalCount = countResult || 0;
            const allResults = [];
            const pageSize = 500;
            const confirmed = await confirmLargeFetch();
            if (!confirmed) {
                return;
            }
            // Start timeout only after confirmation (if needed)
            fetchId = nanoid();
            timeoutIds.current = {
                ...timeoutIds.current,
                [fetchId]: setTimeout(() => {
                    toastId = toast.info({
                        autoClose: false,
                        message: t('player.playbackFetchCancel', {
                            postProcess: 'sentenceCase',
                        }),
                        onClose: () => {
                            logFn.debug(logMsg[LogCategory.PLAYER].cancelledFetch, {
                                category: LogCategory.PLAYER,
                                meta: { itemType, serverId },
                            });
                            queryClient.cancelQueries({
                                exact: false,
                                queryKey: getRootQueryKey(itemType, serverId),
                            });
                            queryClient.cancelQueries({
                                exact: false,
                                queryKey: queryKeys.player.fetch(),
                            });
                        },
                        title: t('player.playbackFetchInProgress', {
                            postProcess: 'sentenceCase',
                        }),
                    });
                }, 2000),
            };
            let startIndex = 0;
            while (startIndex < totalCount) {
                const pageQuery = {
                    ...fetchQuery,
                    limit: pageSize,
                    startIndex,
                };
                const pageResult = (await queryClient.fetchQuery({
                    ...listQueryFn({
                        query: pageQuery,
                        serverId,
                    }),
                    gcTime: 0,
                    queryKey: queryKeys.player.fetch({ startIndex }),
                    staleTime: 0,
                }));
                if (pageResult?.items) {
                    if (itemType === LibraryItem.SONG) {
                        allResults.push(...pageResult.items);
                    }
                    else {
                        const pageIds = pageResult.items.map((item) => item.id);
                        allResults.push(...pageIds);
                    }
                }
                // If we got fewer items than requested, we've reached the end
                if (!pageResult?.items || pageResult.items.length < pageSize) {
                    break;
                }
                startIndex += pageSize;
            }
            if (fetchId && timeoutIds.current) {
                clearTimeout(timeoutIds.current[fetchId]);
                delete timeoutIds.current[fetchId];
            }
            if (toastId) {
                toast.hide(toastId);
            }
            // Shuffle album IDs client-side if this was a random sort request
            let finalResults = allResults;
            if (isAlbumRandomSort && itemType === LibraryItem.ALBUM) {
                finalResults = shuffleArray(allResults);
            }
            if (itemType === LibraryItem.SONG) {
                addToQueueByData(finalResults, type);
            }
            else {
                await addToQueueByFetch(serverId, finalResults, itemType, type);
            }
        }
        catch (err) {
            if (instanceOfCancellationError(err)) {
                return;
            }
            if (fetchId && timeoutIds.current) {
                clearTimeout(timeoutIds.current[fetchId]);
                delete timeoutIds.current[fetchId];
            }
            if (toastId) {
                toast.hide(toastId);
            }
            toast.error({
                message: err.message,
                title: t('error.genericError', { postProcess: 'sentenceCase' }),
            });
        }
    }, [queryClient, confirmLargeFetch, t, addToQueueByData, addToQueueByFetch]);
    const clearQueue = useCallback(() => {
        logFn.debug(logMsg[LogCategory.PLAYER].clearQueue, {
            category: LogCategory.PLAYER,
        });
        storeActions.clearQueue();
    }, [storeActions]);
    const clearSelected = useCallback((items) => {
        logFn.debug(logMsg[LogCategory.PLAYER].clearSelected, {
            category: LogCategory.PLAYER,
            meta: { items: items.length },
        });
        storeActions.clearSelected(items);
    }, [storeActions]);
    const decreaseVolume = useCallback((amount) => {
        logFn.debug(logMsg[LogCategory.PLAYER].decreaseVolume, {
            category: LogCategory.PLAYER,
            meta: { amount },
        });
        storeActions.decreaseVolume(amount);
    }, [storeActions]);
    const increaseVolume = useCallback((amount) => {
        logFn.debug(logMsg[LogCategory.PLAYER].increaseVolume, {
            category: LogCategory.PLAYER,
            meta: { amount },
        });
        storeActions.increaseVolume(amount);
    }, [storeActions]);
    const mediaNext = useCallback(() => {
        logFn.debug(logMsg[LogCategory.PLAYER].mediaNext, {
            category: LogCategory.PLAYER,
        });
        storeActions.mediaNext();
    }, [storeActions]);
    const mediaPause = useCallback(() => {
        logFn.debug(logMsg[LogCategory.PLAYER].mediaPause, {
            category: LogCategory.PLAYER,
        });
        storeActions.mediaPause();
    }, [storeActions]);
    const mediaPlay = useCallback((id) => {
        logFn.debug(logMsg[LogCategory.PLAYER].mediaPlay, {
            category: LogCategory.PLAYER,
            meta: { id },
        });
        storeActions.mediaPlay(id);
    }, [storeActions]);
    const mediaPlayByIndex = useCallback((index) => {
        logFn.debug(logMsg[LogCategory.PLAYER].mediaPlayByIndex, {
            category: LogCategory.PLAYER,
            meta: { index },
        });
        storeActions.mediaPlayByIndex(index);
    }, [storeActions]);
    const mediaPrevious = useCallback(() => {
        logFn.debug(logMsg[LogCategory.PLAYER].mediaPrevious, {
            category: LogCategory.PLAYER,
        });
        storeActions.mediaPrevious();
    }, [storeActions]);
    const mediaStop = useCallback((options) => {
        logFn.debug(logMsg[LogCategory.PLAYER].mediaStop, {
            category: LogCategory.PLAYER,
            meta: { reset: options?.reset },
        });
        storeActions.mediaStop(options);
    }, [storeActions]);
    const mediaSeekToTimestamp = useCallback((timestamp) => {
        logFn.debug(logMsg[LogCategory.PLAYER].mediaSeekToTimestamp, {
            category: LogCategory.PLAYER,
            meta: { timestamp },
        });
        storeActions.mediaSeekToTimestamp(timestamp);
    }, [storeActions]);
    const mediaSkipBackward = useCallback(() => {
        logFn.debug(logMsg[LogCategory.PLAYER].mediaSkipBackward, {
            category: LogCategory.PLAYER,
        });
        storeActions.mediaSkipBackward();
    }, [storeActions]);
    const mediaSkipForward = useCallback(() => {
        logFn.debug(logMsg[LogCategory.PLAYER].mediaSkipForward, {
            category: LogCategory.PLAYER,
        });
        storeActions.mediaSkipForward();
    }, [storeActions]);
    const setQueue = useCallback((data, index, position) => {
        logFn.debug(logMsg[LogCategory.PLAYER].setQueue, {
            category: LogCategory.PLAYER,
            meta: {
                data: data.length,
                index,
                position,
            },
        });
        storeActions.setQueue(data, index, position);
    }, [storeActions]);
    const setSpeed = useCallback((speed) => {
        logFn.debug(logMsg[LogCategory.PLAYER].setSpeed, {
            category: LogCategory.PLAYER,
            meta: { speed },
        });
        storeActions.setSpeed(speed);
    }, [storeActions]);
    const mediaToggleMute = useCallback(() => {
        logFn.debug(logMsg[LogCategory.PLAYER].mediaToggleMute, {
            category: LogCategory.PLAYER,
        });
        storeActions.mediaToggleMute();
    }, [storeActions]);
    const mediaTogglePlayPause = useCallback(() => {
        logFn.debug(logMsg[LogCategory.PLAYER].mediaTogglePlayPause, {
            category: LogCategory.PLAYER,
        });
        storeActions.mediaTogglePlayPause();
    }, [storeActions]);
    const moveSelectedTo = useCallback((items, edge, uniqueId) => {
        logFn.debug(logMsg[LogCategory.PLAYER].moveSelectedTo, {
            category: LogCategory.PLAYER,
            meta: { edge, items, uniqueId },
        });
        storeActions.moveSelectedTo(items, uniqueId, edge);
    }, [storeActions]);
    const moveSelectedToBottom = useCallback((items) => {
        logFn.debug(logMsg[LogCategory.PLAYER].moveSelectedToBottom, {
            category: LogCategory.PLAYER,
            meta: { items },
        });
        storeActions.moveSelectedToBottom(items);
    }, [storeActions]);
    const moveSelectedToNext = useCallback((items) => {
        logFn.debug(logMsg[LogCategory.PLAYER].moveSelectedToNext, {
            category: LogCategory.PLAYER,
            meta: { items },
        });
        storeActions.moveSelectedToNext(items);
    }, [storeActions]);
    const moveSelectedToTop = useCallback((items) => {
        logFn.debug(logMsg[LogCategory.PLAYER].moveSelectedToTop, {
            category: LogCategory.PLAYER,
            meta: { items },
        });
        storeActions.moveSelectedToTop(items);
    }, [storeActions]);
    const setVolume = useCallback((volume) => {
        logFn.debug(logMsg[LogCategory.PLAYER].setVolume, {
            category: LogCategory.PLAYER,
            meta: { volume },
        });
        storeActions.setVolume(volume);
    }, [storeActions]);
    const setRepeat = useCallback((repeat) => {
        logFn.debug(logMsg[LogCategory.PLAYER].setRepeat, {
            category: LogCategory.PLAYER,
            meta: { repeat },
        });
        storeActions.setRepeat(repeat);
    }, [storeActions]);
    const setShuffle = useCallback((shuffle) => {
        logFn.debug(logMsg[LogCategory.PLAYER].setShuffle, {
            category: LogCategory.PLAYER,
            meta: { shuffle },
        });
        storeActions.setShuffle(shuffle);
    }, [storeActions]);
    const shuffle = useCallback(() => {
        logFn.debug(logMsg[LogCategory.PLAYER].shuffle, {
            category: LogCategory.PLAYER,
        });
        storeActions.shuffle();
    }, [storeActions]);
    const shuffleAll = useCallback(() => {
        logFn.debug(logMsg[LogCategory.PLAYER].shuffleAll, {
            category: LogCategory.PLAYER,
        });
        storeActions.shuffleAll();
    }, [storeActions]);
    const shuffleSelected = useCallback((items) => {
        logFn.debug(logMsg[LogCategory.PLAYER].shuffleSelected, {
            category: LogCategory.PLAYER,
            meta: { items },
        });
        storeActions.shuffleSelected(items);
    }, [storeActions]);
    const toggleRepeat = useCallback(() => {
        logFn.debug(logMsg[LogCategory.PLAYER].toggleRepeat, {
            category: LogCategory.PLAYER,
        });
        storeActions.toggleRepeat();
    }, [storeActions]);
    const toggleShuffle = useCallback(() => {
        logFn.debug(logMsg[LogCategory.PLAYER].toggleShuffle, {
            category: LogCategory.PLAYER,
        });
        storeActions.toggleShuffle();
    }, [storeActions]);
    const contextValue = useMemo(() => ({
        addToQueueByData,
        addToQueueByFetch,
        addToQueueByListQuery,
        clearQueue,
        clearSelected,
        decreaseVolume,
        increaseVolume,
        mediaNext,
        mediaPause,
        mediaPlay,
        mediaPlayByIndex,
        mediaPrevious,
        mediaSeekToTimestamp,
        mediaSkipBackward,
        mediaSkipForward,
        mediaStop,
        mediaToggleMute,
        mediaTogglePlayPause,
        moveSelectedTo,
        moveSelectedToBottom,
        moveSelectedToNext,
        moveSelectedToTop,
        setQueue,
        setRepeat,
        setShuffle,
        setSpeed,
        setVolume,
        shuffle,
        shuffleAll,
        shuffleSelected,
        toggleRepeat,
        toggleShuffle,
    }), [
        addToQueueByData,
        addToQueueByFetch,
        addToQueueByListQuery,
        clearQueue,
        clearSelected,
        decreaseVolume,
        increaseVolume,
        mediaNext,
        mediaPause,
        mediaPlay,
        mediaPlayByIndex,
        mediaPrevious,
        mediaSeekToTimestamp,
        mediaSkipBackward,
        mediaSkipForward,
        mediaStop,
        mediaToggleMute,
        mediaTogglePlayPause,
        moveSelectedTo,
        moveSelectedToBottom,
        moveSelectedToNext,
        moveSelectedToTop,
        setQueue,
        setRepeat,
        setShuffle,
        setSpeed,
        setVolume,
        shuffle,
        shuffleAll,
        shuffleSelected,
        toggleRepeat,
        toggleShuffle,
    ]);
    return _jsx(PlayerContext.Provider, { value: contextValue, children: children });
};
export const usePlayer = () => {
    return useContext(PlayerContext);
};
/**
 * Fetches the songs from the server
 * @param queryClient - The query client to use to fetch the data
 * @param serverId - The library id to use to fetch the data
 * @param type - The type of the item to add to the queue
 * @param args - The arguments to use to fetch the data
 * @returns The songs to add to the queue
 */
export async function fetchSongsByItemType(queryClient, serverId, args) {
    const songs = [];
    switch (args.itemType) {
        case LibraryItem.ALBUM: {
            const albumSongsResponse = await getAlbumSongsById({
                id: args.id,
                query: args.params,
                queryClient,
                serverId,
            });
            songs.push(...albumSongsResponse.items);
            break;
        }
        case LibraryItem.ALBUM_ARTIST: {
            const albumArtistSongsResponse = await getAlbumArtistSongsById({
                id: args.id,
                query: args.params,
                queryClient,
                serverId,
            });
            songs.push(...albumArtistSongsResponse.items);
            break;
        }
        case LibraryItem.ARTIST: {
            const artistSongsResponse = await getAlbumArtistSongsById({
                id: args.id,
                query: args.params,
                queryClient,
                serverId,
            });
            songs.push(...artistSongsResponse.items);
            break;
        }
        case LibraryItem.FOLDER: {
            const folderSongsResponse = await getSongsByFolder({
                id: args.id,
                query: args.params,
                queryClient,
                serverId,
            });
            songs.push(...folderSongsResponse.items);
            break;
        }
        case LibraryItem.GENRE: {
            const genreSongsResponse = await getGenreSongsById({
                id: args.id,
                query: args.params,
                queryClient,
                serverId,
            });
            songs.push(...genreSongsResponse.items);
            break;
        }
        case LibraryItem.PLAYLIST: {
            const promises = [];
            for (const id of args.id) {
                promises.push(getPlaylistSongsById({
                    id,
                    query: args.params,
                    queryClient,
                    serverId,
                }));
            }
            const results = await Promise.all(promises);
            songs.push(...results.flatMap((r) => r.items));
            break;
        }
    }
    return songs;
}
export const useIsPlayerFetching = () => {
    const playerFetchCount = useIsFetching({ queryKey: queryKeys.player.fetch() });
    return playerFetchCount > 0;
};
