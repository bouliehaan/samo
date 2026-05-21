import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { openContextModal } from '@mantine/modals';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Fuse from 'fuse.js';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { getAlbumArtistSongsById, getAlbumSongsById, getGenreSongsById, getPlaylistSongsById, getSongsByFolder, } from '/@/renderer/features/player/utils';
import { playlistsQueries } from '/@/renderer/features/playlists/api/playlists-api';
import { useRecentPlaylists } from '/@/renderer/features/playlists/hooks/use-recent-playlists';
import { useAddToPlaylist } from '/@/renderer/features/playlists/mutations/add-to-playlist-mutation';
import { useCurrentServer, useCurrentServerId } from '/@/renderer/store';
import { Checkbox } from '/@/shared/components/checkbox/checkbox';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { Icon } from '/@/shared/components/icon/icon';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { toast } from '/@/shared/components/toast/toast';
import { Tooltip } from '/@/shared/components/tooltip/tooltip';
import { useLocalStorage } from '/@/shared/hooks/use-local-storage';
import { LibraryItem, PlaylistListSort, SortOrder } from '/@/shared/types/domain-types';
export const AddToPlaylistAction = ({ items, itemType }) => {
    const { t } = useTranslation();
    const server = useCurrentServer();
    const serverId = useCurrentServerId();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [skipDuplicates, setSkipDuplicates] = useLocalStorage({
        defaultValue: true,
        key: 'playlist-skip-duplicate',
    });
    const addToPlaylistMutation = useAddToPlaylist({});
    const playlistsQuery = useQuery(playlistsQueries.list({
        query: {
            excludeSmartPlaylists: true,
            sortBy: PlaylistListSort.NAME,
            sortOrder: SortOrder.ASC,
            startIndex: 0,
        },
        serverId: server?.id,
    }));
    const { recentPlaylistId } = useRecentPlaylists(serverId);
    const playlists = playlistsQuery.data?.items;
    const fuse = useMemo(() => {
        if (!playlists)
            return null;
        return new Fuse(playlists, {
            fieldNormWeight: 1,
            ignoreLocation: true,
            keys: ['name'],
            threshold: 0.3,
        });
    }, [playlists]);
    const recentPlaylist = useMemo(() => {
        if (!playlists || !recentPlaylistId)
            return null;
        const playlist = playlists.find((p) => p.id === recentPlaylistId);
        if (!playlist)
            return null;
        if (searchTerm && fuse) {
            const results = fuse.search(searchTerm);
            const found = results.find((result) => result.item.id === recentPlaylistId);
            if (!found)
                return null;
        }
        return playlist;
    }, [playlists, recentPlaylistId, searchTerm, fuse]);
    const filteredPlaylists = useMemo(() => {
        if (!playlists)
            return [];
        if (!searchTerm || !fuse) {
            // Exclude recent playlist from the list if it exists
            return recentPlaylistId
                ? playlists.filter((p) => p.id !== recentPlaylistId)
                : playlists;
        }
        const results = fuse.search(searchTerm);
        const filtered = results.map((result) => result.item);
        // Exclude recent playlist from the filtered results if it exists
        return recentPlaylistId ? filtered.filter((p) => p.id !== recentPlaylistId) : filtered;
    }, [playlists, searchTerm, fuse, recentPlaylistId]);
    const getSongsByAlbum = useCallback(async (albumId) => {
        return getAlbumSongsById({
            id: [albumId],
            queryClient,
            serverId,
        });
    }, [queryClient, serverId]);
    const getSongsByArtist = useCallback(async (artistId) => {
        return getAlbumArtistSongsById({
            id: [artistId],
            queryClient,
            serverId,
        });
    }, [queryClient, serverId]);
    const getSongsByGenre = useCallback(async (genreIds) => {
        return getGenreSongsById({
            id: genreIds,
            queryClient,
            serverId,
        });
    }, [queryClient, serverId]);
    const getSongsByPlaylist = useCallback(async (playlistId) => {
        return getPlaylistSongsById({
            id: playlistId,
            queryClient,
            serverId,
        });
    }, [queryClient, serverId]);
    const getSongsByFolderLocal = useCallback(async (folderId) => {
        if (!server)
            return null;
        const songsResponse = await getSongsByFolder({
            id: [folderId],
            queryClient,
            serverId: server.id,
        });
        return {
            items: songsResponse.items.map((song) => song.id),
            startIndex: 0,
            totalRecordCount: songsResponse.items.length,
        };
    }, [queryClient, server]);
    const handleAddToPlaylist = useCallback(async (playlistId) => {
        if (items.length === 0 || !serverId)
            return;
        try {
            let allSongIds = [];
            if (itemType === LibraryItem.SONG || itemType === LibraryItem.PLAYLIST_SONG) {
                allSongIds = items;
            }
            else if (itemType === LibraryItem.ALBUM) {
                for (const id of items) {
                    const songs = await getSongsByAlbum(id);
                    allSongIds.push(...(songs?.items?.map((song) => song.id) || []));
                }
            }
            else if (itemType === LibraryItem.ALBUM_ARTIST ||
                itemType === LibraryItem.ARTIST) {
                for (const id of items) {
                    const songs = await getSongsByArtist(id);
                    allSongIds.push(...(songs?.items?.map((song) => song.id) || []));
                }
            }
            else if (itemType === LibraryItem.GENRE) {
                const songs = await getSongsByGenre(items);
                allSongIds.push(...(songs?.items?.map((song) => song.id) || []));
            }
            else if (itemType === LibraryItem.PLAYLIST) {
                for (const id of items) {
                    const songs = await getSongsByPlaylist(id);
                    allSongIds.push(...(songs?.items?.map((song) => song.id) || []));
                }
            }
            else if (itemType === LibraryItem.FOLDER) {
                for (const id of items) {
                    const songs = await getSongsByFolderLocal(id);
                    allSongIds.push(...(songs?.items || []));
                }
            }
            if (allSongIds.length === 0) {
                toast.success({
                    message: t('form.addToPlaylist.success', {
                        message: 0,
                        numOfPlaylists: 1,
                        postProcess: 'sentenceCase',
                    }),
                });
                return;
            }
            let songsToAdd = allSongIds;
            if (skipDuplicates) {
                const queryKey = queryKeys.playlists.songList(serverId, playlistId);
                const playlistSongsRes = await queryClient.fetchQuery({
                    queryFn: ({ signal }) => {
                        return api.controller.getPlaylistSongList({
                            apiClientProps: {
                                serverId,
                                signal,
                            },
                            query: {
                                id: playlistId,
                            },
                        });
                    },
                    queryKey,
                });
                const playlistSongIds = playlistSongsRes?.items?.map((song) => song.id);
                const uniqueSongIds = [];
                for (const songId of allSongIds) {
                    if (!playlistSongIds?.includes(songId)) {
                        uniqueSongIds.push(songId);
                    }
                }
                songsToAdd = uniqueSongIds;
            }
            if (songsToAdd.length === 0) {
                toast.success({
                    message: t('form.addToPlaylist.success', {
                        message: 0,
                        numOfPlaylists: 1,
                        postProcess: 'sentenceCase',
                    }),
                });
                return;
            }
            addToPlaylistMutation.mutate({
                apiClientProps: { serverId },
                body: {
                    songId: songsToAdd,
                },
                query: {
                    id: playlistId,
                },
            }, {
                onError: (err) => {
                    toast.error({
                        message: err.message,
                        title: t('error.genericError', { postProcess: 'sentenceCase' }),
                    });
                },
                onSuccess: () => { },
            });
            toast.success({
                message: t('form.addToPlaylist.success', {
                    message: songsToAdd.length,
                    numOfPlaylists: 1,
                    postProcess: 'sentenceCase',
                }),
            });
        }
        catch (error) {
            toast.error({
                message: error.message,
                title: t('error.genericError', { postProcess: 'sentenceCase' }),
            });
        }
    }, [
        addToPlaylistMutation,
        getSongsByAlbum,
        getSongsByArtist,
        getSongsByFolderLocal,
        getSongsByGenre,
        getSongsByPlaylist,
        itemType,
        items,
        queryClient,
        serverId,
        skipDuplicates,
        t,
    ]);
    const handleOpenModal = useCallback(() => {
        const modalProps = {};
        switch (itemType) {
            case LibraryItem.ALBUM:
                modalProps.albumId = items;
                break;
            case LibraryItem.ALBUM_ARTIST:
            case LibraryItem.ARTIST:
                modalProps.artistId = items;
                break;
            case LibraryItem.FOLDER:
                modalProps.folderId = items;
                break;
            case LibraryItem.GENRE:
                modalProps.genreId = items;
                break;
            case LibraryItem.PLAYLIST:
                modalProps.playlistId = items;
                break;
            case LibraryItem.PLAYLIST_SONG:
            case LibraryItem.QUEUE_SONG:
            case LibraryItem.SONG:
                modalProps.songId = items;
                break;
            default:
                return;
        }
        openContextModal({
            innerProps: {
                ...modalProps,
            },
            modal: 'addToPlaylist',
            size: 'lg',
            title: t('page.contextMenu.addToPlaylist', { postProcess: 'sentenceCase' }),
        });
    }, [itemType, items, t]);
    if (items.length === 0)
        return null;
    const searchInput = (_jsx(TextInput, { autoFocus: true, leftSection: _jsx(Icon, { icon: "search" }), onChange: (e) => setSearchTerm(e.target.value), onKeyDown: (e) => e.stopPropagation(), onPointerDown: (e) => e.stopPropagation(), pb: "xs", placeholder: t('common.search', { postProcess: 'sentenceCase' }), rightSection: _jsx(Tooltip, { label: t('form.addToPlaylist.input', {
                context: 'skipDuplicates',
                postProcess: 'titleCase',
            }), children: _jsx(Checkbox, { checked: skipDuplicates, onChange: (e) => {
                    setSkipDuplicates(e.target.checked);
                    e.stopPropagation();
                }, onClick: (e) => e.stopPropagation(), size: "sm" }) }), size: "sm", value: searchTerm }));
    return (_jsxs(ContextMenu.Submenu, { isCloseDisabled: true, children: [_jsx(ContextMenu.SubmenuTarget, { children: _jsx(ContextMenu.Item, { leftIcon: "playlist", onSelect: handleOpenModal, rightIcon: "arrowRightS", children: t('page.contextMenu.addToPlaylist', { postProcess: 'sentenceCase' }) }) }), _jsxs(ContextMenu.SubmenuContent, { stickyContent: searchInput, children: [playlistsQuery.isLoading && (_jsx(ContextMenu.Item, { disabled: true, children: _jsx(Spinner, { container: true }) })), playlistsQuery.isError && (_jsx(ContextMenu.Item, { disabled: true, children: t('error.genericError', { postProcess: 'sentenceCase' }) })), recentPlaylist && (_jsxs(_Fragment, { children: [_jsx(ContextMenu.Item, { onSelect: () => handleAddToPlaylist(recentPlaylist.id), children: recentPlaylist.name }, recentPlaylist.id), filteredPlaylists.length > 0 && _jsx(ContextMenu.Divider, {})] })), filteredPlaylists.length === 0 && !playlistsQuery.isLoading && (_jsx(ContextMenu.Item, { disabled: true, children: t('common.noResultsFromQuery', { postProcess: 'sentenceCase' }) })), filteredPlaylists.map((playlist) => (_jsx(ContextMenu.Item, { onSelect: () => handleAddToPlaylist(playlist.id), children: playlist.name }, playlist.id)))] })] }));
};
