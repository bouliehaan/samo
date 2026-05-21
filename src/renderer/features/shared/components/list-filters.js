import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useListContext } from '/@/renderer/context/list-context';
import { JellyfinAlbumFilters } from '/@/renderer/features/albums/components/jellyfin-album-filters';
import { NavidromeAlbumFilters } from '/@/renderer/features/albums/components/navidrome-album-filters';
import { SubsonicAlbumFilters } from '/@/renderer/features/albums/components/subsonic-album-filters';
import { useAlbumListFilters } from '/@/renderer/features/albums/hooks/use-album-list-filters';
import { ComponentErrorBoundary } from '/@/renderer/features/shared/components/component-error-boundary';
import { FilterButton } from '/@/renderer/features/shared/components/filter-button';
import { SaveAsCollectionButton } from '/@/renderer/features/shared/components/save-as-collection-button';
import { JellyfinSongFilters } from '/@/renderer/features/songs/components/jellyfin-song-filters';
import { NavidromeSongFilters } from '/@/renderer/features/songs/components/navidrome-song-filters';
import { SubsonicSongFilters } from '/@/renderer/features/songs/components/subsonic-song-filters';
import { useSongListFilters } from '/@/renderer/features/songs/hooks/use-song-list-filters';
import { useCurrentServer } from '/@/renderer/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { Modal } from '/@/shared/components/modal/modal';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { useDisclosure } from '/@/shared/hooks/use-disclosure';
import { LibraryItem, ServerType } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const isFilterValueSet = (value) => {
    if (value === undefined || value === null)
        return false;
    if (typeof value === 'string' && value.trim() === '')
        return false;
    if (Array.isArray(value) && value.length === 0)
        return false;
    if (typeof value === 'object' && Object.keys(value).length === 0)
        return false;
    return true;
};
export const ListFiltersModal = ({ isActive, itemType }) => {
    const { t } = useTranslation();
    const server = useCurrentServer();
    const { isSidebarOpen, pageKey, setIsSidebarOpen } = useListContext();
    const serverType = server.type;
    const FilterComponent = FILTERS[serverType][itemType];
    const [isOpen, handlers] = useDisclosure(false);
    const albumListFilters = useAlbumListFilters(pageKey);
    const songListFilters = useSongListFilters(pageKey);
    const clear = itemType === LibraryItem.ALBUM ? albumListFilters.clear : songListFilters.clear;
    const handlePin = () => {
        setIsSidebarOpen?.(!isSidebarOpen);
    };
    const handleReset = () => {
        clear();
    };
    const canPin = Boolean(setIsSidebarOpen);
    const disableArtistFilter = pageKey === ItemListKey.ALBUM_ARTIST_ALBUM;
    const disableGenreFilter = pageKey === ItemListKey.GENRE_ALBUM || pageKey === ItemListKey.GENRE_SONG;
    return (_jsxs(_Fragment, { children: [_jsx(FilterButton, { isActive: isActive, onClick: handlers.toggle }), _jsxs(Modal, { handlers: handlers, opened: isOpen, size: "lg", styles: {
                    content: {
                        height: '100%',
                        maxHeight: '640px',
                        maxWidth: 'var(--theme-content-max-width)',
                        width: '100%',
                    },
                }, title: _jsxs(Group, { justify: "space-between", style: { paddingRight: '3rem', width: '100%' }, children: [_jsxs(Group, { children: [canPin && (_jsx(ActionIcon, { icon: isSidebarOpen ? 'unpin' : 'pin', onClick: handlePin, variant: "subtle" })), t('common.filters', { postProcess: 'sentenceCase' })] }), _jsx(Button, { onClick: handleReset, size: "compact-sm", variant: "subtle", children: t('common.reset', { postProcess: 'sentenceCase' }) })] }), children: [_jsx(FilterComponent, { disableArtistFilter: disableArtistFilter, disableGenreFilter: disableGenreFilter }), _jsx(Stack, { p: "md", children: _jsx(SaveAsCollectionButton, { fullWidth: true, itemType: itemType }) })] })] }));
};
export const ListFilters = ({ itemType }) => {
    const server = useCurrentServer();
    const serverType = server.type;
    const FilterComponent = FILTERS[serverType][itemType];
    const { pageKey } = useListContext();
    const disableArtistFilter = pageKey === ItemListKey.ALBUM_ARTIST_ALBUM;
    const disableGenreFilter = pageKey === ItemListKey.GENRE_ALBUM || pageKey === ItemListKey.GENRE_SONG;
    return (_jsx(ComponentErrorBoundary, { children: _jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(FilterComponent, { disableArtistFilter: disableArtistFilter, disableGenreFilter: disableGenreFilter }) }) }));
};
export const ListFiltersTitle = ({ itemType }) => {
    const { t } = useTranslation();
    const { pageKey, setIsSidebarOpen } = useListContext();
    const handleUnpin = () => {
        setIsSidebarOpen?.(false);
    };
    const canUnpin = Boolean(setIsSidebarOpen);
    const albumListFilters = useAlbumListFilters(pageKey);
    const songListFilters = useSongListFilters(pageKey);
    const clear = itemType === LibraryItem.ALBUM ? albumListFilters.clear : songListFilters.clear;
    return (_jsxs(Group, { justify: "space-between", pb: 0, pl: "md", pr: "md", pt: "md", children: [_jsx(Text, { fw: 500, size: "xl", children: t('common.filters', { postProcess: 'sentenceCase' }) }), _jsxs(Group, { gap: "xs", children: [_jsx(Button, { onClick: clear, size: "compact-sm", variant: "subtle", children: t('common.reset', { postProcess: 'sentenceCase' }) }), canUnpin && (_jsx(ActionIcon, { icon: "unpin", onClick: handleUnpin, size: "compact-sm", variant: "subtle" }))] })] }));
};
const FILTERS = {
    [ServerType.JELLYFIN]: {
        [LibraryItem.ALBUM]: JellyfinAlbumFilters,
        [LibraryItem.SONG]: JellyfinSongFilters,
    },
    [ServerType.NAVIDROME]: {
        [LibraryItem.ALBUM]: NavidromeAlbumFilters,
        [LibraryItem.SONG]: NavidromeSongFilters,
    },
    [ServerType.SUBSONIC]: {
        [LibraryItem.ALBUM]: SubsonicAlbumFilters,
        [LibraryItem.SONG]: SubsonicSongFilters,
    },
};
