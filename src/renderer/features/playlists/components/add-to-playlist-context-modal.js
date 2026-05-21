import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { closeModal } from '@mantine/modals';
import { useQuery } from '@tanstack/react-query';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './add-to-playlist-context-modal.module.css';
import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { getAlbumSongsById, getArtistSongsById, getGenreSongsById, getPlaylistSongsById, getSongsByFolder, } from '/@/renderer/features/player/utils';
import { playlistsQueries } from '/@/renderer/features/playlists/api/playlists-api';
import { useAddToPlaylist } from '/@/renderer/features/playlists/mutations/add-to-playlist-mutation';
import { queryClient } from '/@/renderer/lib/react-query';
import { useCurrentServerId } from '/@/renderer/store';
import { formatDurationString } from '/@/renderer/utils';
import { Box } from '/@/shared/components/box/box';
import { Button } from '/@/shared/components/button/button';
import { Checkbox } from '/@/shared/components/checkbox/checkbox';
import { Flex } from '/@/shared/components/flex/flex';
import { Grid } from '/@/shared/components/grid/grid';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { ModalButton } from '/@/shared/components/modal/model-shared';
import { Pill } from '/@/shared/components/pill/pill';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Stack } from '/@/shared/components/stack/stack';
import { Switch } from '/@/shared/components/switch/switch';
import { Table } from '/@/shared/components/table/table';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { useForm } from '/@/shared/hooks/use-form';
import { useLocalStorage } from '/@/shared/hooks/use-local-storage';
import { LibraryItem, PlaylistListSort, SortOrder } from '/@/shared/types/domain-types';
export const AddToPlaylistContextModal = ({ id, innerProps, }) => {
    const { t } = useTranslation();
    const { albumId, artistId, folderId, genreId, initialSelectedIds, playlistId, songId } = innerProps;
    const serverId = useCurrentServerId();
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [focusedRowIndex, setFocusedRowIndex] = useState(null);
    const rowRefs = useRef([]);
    const formRef = useRef(null);
    const [skipDuplicates, setSkipDuplicates] = useLocalStorage({
        defaultValue: true,
        key: 'playlist-skip-duplicate',
    });
    const form = useForm({
        initialValues: {
            newPlaylists: [],
            selectedPlaylistIds: initialSelectedIds || [],
            skipDuplicates: skipDuplicates,
        },
    });
    form.watch('skipDuplicates', (event) => {
        setSkipDuplicates(event.value);
    });
    const addToPlaylistMutation = useAddToPlaylist({});
    const playlistList = useQuery(playlistsQueries.list({
        query: {
            excludeSmartPlaylists: true,
            sortBy: PlaylistListSort.NAME,
            sortOrder: SortOrder.ASC,
            startIndex: 0,
        },
        serverId,
    }));
    const [playlistSelect, playlistMap] = useMemo(() => {
        const existingPlaylists = new Array();
        const playlistMap = new Map();
        for (const playlist of playlistList.data?.items ?? []) {
            existingPlaylists.push({ ...playlist, label: playlist.name, value: playlist.id });
            playlistMap.set(playlist.id, playlist.name);
        }
        return [existingPlaylists, playlistMap];
    }, [playlistList.data]);
    const filteredItems = useMemo(() => {
        if (search) {
            return playlistSelect.filter((item) => item.label.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
        }
        return playlistSelect;
    }, [playlistSelect, search]);
    const getSongsByAlbum = useCallback(async (albumId) => {
        return getAlbumSongsById({
            id: [albumId],
            queryClient,
            serverId,
        });
    }, [serverId]);
    const getSongsByArtist = useCallback(async (artistId) => {
        return getArtistSongsById({
            id: [artistId],
            queryClient,
            serverId,
        });
    }, [serverId]);
    const getSongsByPlaylist = useCallback(async (playlistId) => {
        return getPlaylistSongsById({
            id: playlistId,
            queryClient,
            serverId,
        });
    }, [serverId]);
    const handleSubmit = form.onSubmit(async (values) => {
        if (isLoading) {
            return;
        }
        setIsLoading(true);
        const allSongIds = [];
        let totalUniquesAdded = 0;
        try {
            if (albumId && albumId.length > 0) {
                for (const id of albumId) {
                    const songs = await getSongsByAlbum(id);
                    allSongIds.push(...(songs?.items?.map((song) => song.id) || []));
                }
            }
            if (artistId && artistId.length > 0) {
                for (const id of artistId) {
                    const songs = await getSongsByArtist(id);
                    allSongIds.push(...(songs?.items?.map((song) => song.id) || []));
                }
            }
            if (genreId && genreId.length > 0) {
                const songs = await getGenreSongsById({
                    id: genreId,
                    queryClient,
                    serverId,
                });
                allSongIds.push(...(songs?.items?.map((song) => song.id) || []));
            }
            if (folderId && folderId.length > 0) {
                const songs = await getSongsByFolder({
                    id: folderId,
                    queryClient,
                    serverId,
                });
                allSongIds.push(...(songs?.items?.map((song) => song.id) || []));
            }
            if (playlistId && playlistId.length > 0) {
                for (const id of playlistId) {
                    const songs = await getSongsByPlaylist(id);
                    allSongIds.push(...(songs?.items?.map((song) => song.id) || []));
                }
            }
            if (songId && songId.length > 0) {
                allSongIds.push(...songId);
            }
            const playlistIds = [...values.selectedPlaylistIds];
            if (values.newPlaylists) {
                for (const playlist of values.newPlaylists) {
                    try {
                        const response = await api.controller.createPlaylist({
                            apiClientProps: { serverId },
                            body: {
                                name: playlist,
                                public: false,
                            },
                        });
                        if (response?.id) {
                            playlistIds.push(response?.id);
                        }
                    }
                    catch (error) {
                        toast.error({
                            message: `[${playlist}] ${error?.message}`,
                            title: t('error.genericError', { postProcess: 'sentenceCase' }),
                        });
                    }
                }
            }
            for (const playlistId of playlistIds) {
                const uniqueSongIds = [];
                if (values.skipDuplicates) {
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
                    for (const songId of allSongIds) {
                        if (!playlistSongIds?.includes(songId)) {
                            uniqueSongIds.push(songId);
                        }
                    }
                    totalUniquesAdded += uniqueSongIds.length;
                }
                if (values.skipDuplicates ? uniqueSongIds.length > 0 : allSongIds.length > 0) {
                    addToPlaylistMutation.mutate({
                        apiClientProps: { serverId },
                        body: { songId: values.skipDuplicates ? uniqueSongIds : allSongIds },
                        query: { id: playlistId },
                    }, {
                        onError: (err) => {
                            toast.error({
                                message: `[${playlistSelect.find((playlist) => playlist.value === playlistId)?.label}] ${err.message}`,
                                title: t('error.genericError', { postProcess: 'sentenceCase' }),
                            });
                        },
                    });
                }
            }
            const addMessage = values.skipDuplicates &&
                allSongIds.length * playlistIds.length !== totalUniquesAdded
                ? Math.floor(totalUniquesAdded / playlistIds.length)
                : allSongIds.length;
            setIsLoading(false);
            toast.success({
                message: t('form.addToPlaylist.success', {
                    message: addMessage,
                    numOfPlaylists: playlistIds.length,
                    postProcess: 'sentenceCase',
                }),
            });
            closeModal(id);
        }
        catch (error) {
            setIsLoading(false);
            toast.error({
                message: error?.message || t('error.genericError', { postProcess: 'sentenceCase' }),
                title: t('error.genericError', { postProcess: 'sentenceCase' }),
            });
        }
    });
    const handleSelectItem = useCallback((item) => {
        const currentIds = form.values.selectedPlaylistIds;
        if (currentIds.includes(item.value)) {
            form.setFieldValue('selectedPlaylistIds', currentIds.filter((id) => id !== item.value));
        }
        else {
            form.setFieldValue('selectedPlaylistIds', [...currentIds, item.value]);
        }
    }, [form]);
    const handleCheckboxChange = useCallback((itemValue, checked) => {
        const currentIds = form.values.selectedPlaylistIds;
        if (checked) {
            form.setFieldValue('selectedPlaylistIds', [...currentIds, itemValue]);
        }
        else {
            form.setFieldValue('selectedPlaylistIds', currentIds.filter((id) => id !== itemValue));
        }
    }, [form]);
    const handleCreatePlaylist = useCallback(() => {
        form.setFieldValue('newPlaylists', [...form.values.newPlaylists, search]);
        setSearch('');
    }, [form, search]);
    const handleRemoveSelectedPlaylist = useCallback((playlistId) => {
        form.setFieldValue('selectedPlaylistIds', form.values.selectedPlaylistIds.filter((id) => id !== playlistId));
    }, [form]);
    const handleRemoveNewPlaylist = useCallback((index) => {
        form.setFieldValue('newPlaylists', form.values.newPlaylists.filter((_, existingIdx) => index !== existingIdx));
    }, [form]);
    const handleKeyDown = useCallback((event, index, item) => {
        const totalRows = filteredItems.length;
        switch (event.key) {
            case ' ': {
                event.preventDefault();
                event.stopPropagation();
                handleSelectItem(item);
                break;
            }
            case 'ArrowDown': {
                event.preventDefault();
                const nextIndex = index < totalRows - 1 ? index + 1 : index;
                setFocusedRowIndex(nextIndex);
                rowRefs.current[nextIndex]?.focus();
                break;
            }
            case 'ArrowUp': {
                event.preventDefault();
                const prevIndex = index > 0 ? index - 1 : 0;
                setFocusedRowIndex(prevIndex);
                rowRefs.current[prevIndex]?.focus();
                break;
            }
            case 'Enter': {
                event.preventDefault();
                if (formRef.current) {
                    formRef.current.requestSubmit();
                }
                break;
            }
            case 'Tab': {
                // Allow Tab to exit the table naturally - don't prevent default
                setFocusedRowIndex(null);
                break;
            }
            default:
                break;
        }
    }, [filteredItems.length, handleSelectItem]);
    const setRowRef = useCallback((index) => (el) => {
        rowRefs.current[index] = el;
    }, []);
    return (_jsx(Box, { children: _jsx("form", { onSubmit: handleSubmit, ref: formRef, children: _jsxs(Stack, { children: [_jsx(TextInput, { "data-autofocus": true, onChange: (e) => setSearch(e.target.value), placeholder: t('form.addToPlaylist.searchOrCreate', {
                            postProcess: 'sentenceCase',
                        }), value: search }), _jsx(ScrollArea, { style: { maxHeight: '18rem' }, children: _jsx(Table, { styles: { td: { padding: 'var(--theme-spacing-sm)' } }, children: _jsx(Table.Tbody, { children: filteredItems.map((item, index) => (_jsxs(Table.Tr, { onBlur: () => setFocusedRowIndex(null), onClick: () => handleSelectItem(item), onFocus: () => setFocusedRowIndex(index), onKeyDown: (e) => handleKeyDown(e, index, item), ref: setRowRef(index), role: "button", style: {
                                        background: focusedRowIndex === index
                                            ? 'var(--theme-colors-surface)'
                                            : 'transparent',
                                        cursor: 'pointer',
                                        outline: 'none',
                                    }, tabIndex: index === 0 ? 0 : -1, children: [_jsx(Table.Td, { w: 10, children: _jsx(Checkbox, { checked: form.values.selectedPlaylistIds.includes(item.value), onChange: (event) => {
                                                    handleCheckboxChange(item.value, event.target.checked);
                                                    event.preventDefault();
                                                }, onClick: (e) => e.stopPropagation(), tabIndex: -1 }) }), _jsx(Table.Td, { style: { maxWidth: 0, width: '100%' }, children: _jsx(PlaylistTableItem, { item: item }) })] }, item.value))) }) }) }), search && (_jsx(Button, { leftSection: _jsx(Icon, { icon: "add", size: "lg" }), onClick: handleCreatePlaylist, variant: "subtle", w: "100%", children: t('form.addToPlaylist.create', {
                            playlist: search,
                            postProcess: 'sentenceCase',
                        }) })), _jsxs(Pill.Group, { children: [form.values.selectedPlaylistIds.map((item) => (_jsx(Pill, { onRemove: () => handleRemoveSelectedPlaylist(item), withRemoveButton: true, children: playlistMap.get(item) }, item))), form.values.newPlaylists.map((item, idx) => (_jsx(Pill, { onRemove: () => handleRemoveNewPlaylist(idx), withRemoveButton: true, children: _jsxs(Flex, { align: "center", gap: "lg", wrap: "nowrap", children: [_jsx(Icon, { icon: "plus" }), item] }) }, idx)))] }), _jsx(Switch, { label: t('form.addToPlaylist.input', {
                            context: 'skipDuplicates',
                            postProcess: 'titleCase',
                        }), ...form.getInputProps('skipDuplicates', { type: 'checkbox' }) }), _jsxs(Group, { justify: "flex-end", children: [_jsx(ModalButton, { disabled: isLoading || addToPlaylistMutation.isPending, onClick: () => closeModal(id), uppercase: true, variant: "subtle", children: t('common.cancel', { postProcess: 'titleCase' }) }), _jsx(ModalButton, { disabled: isLoading ||
                                    addToPlaylistMutation.isPending ||
                                    (form.values.selectedPlaylistIds.length === 0 &&
                                        form.values.newPlaylists.length === 0), loading: isLoading, type: "submit", uppercase: true, variant: "filled", children: t('common.add', { postProcess: 'titleCase' }) })] })] }) }) }));
};
const PlaylistTableItem = memo(({ item }) => {
    const { t } = useTranslation();
    return (_jsx(Box, { className: styles.container, w: "100%", children: _jsxs(Grid, { align: "center", gutter: "xs", w: "100%", children: [_jsx(Grid.Col, { span: "content", children: _jsx(Flex, { align: "center", justify: "center", px: "sm", children: _jsx(ItemImage, { id: item.imageId, imageContainerProps: {
                                className: styles.imageContainer,
                            }, itemType: LibraryItem.PLAYLIST, type: "table" }) }) }), _jsx(Grid.Col, { className: styles.gridCol, span: "auto", children: _jsxs(Stack, { gap: "xs", w: "100%", children: [_jsx(Text, { className: styles.labelText, isNoSelect: true, overflow: "hidden", children: item.label }), _jsxs(Group, { justify: "space-between", wrap: "nowrap", children: [_jsxs(Group, { gap: "md", wrap: "nowrap", children: [_jsxs(Group, { align: "center", gap: "xs", wrap: "nowrap", children: [_jsx(Icon, { color: "muted", icon: "track", size: "sm" }), _jsx(Text, { isMuted: true, size: "sm", children: item.songCount })] }), _jsxs(Group, { align: "center", gap: "xs", wrap: "nowrap", children: [_jsx(Icon, { color: "muted", icon: "duration", size: "sm" }), _jsx(Text, { isMuted: true, size: "sm", children: formatDurationString(item.duration ?? 0) })] })] }), _jsx(Text, { className: styles.statusText, isMuted: true, size: "sm", children: item.public
                                            ? t('common.public', {
                                                postProcess: 'titleCase',
                                            })
                                            : t('common.private', {
                                                postProcess: 'titleCase',
                                            }) })] })] }) })] }) }));
});
