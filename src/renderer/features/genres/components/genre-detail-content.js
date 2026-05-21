import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Suspense, useMemo } from 'react';
import { useParams } from 'react-router';
import { AlbumListView } from '/@/renderer/features/albums/components/album-list-content';
import { ListFilters, ListFiltersTitle } from '/@/renderer/features/shared/components/list-filters';
import { ListWithSidebarContainer } from '/@/renderer/features/shared/components/list-with-sidebar-container';
import { SaveAsCollectionButton } from '/@/renderer/features/shared/components/save-as-collection-button';
import { SongListView } from '/@/renderer/features/songs/components/song-list-content';
import { GenreTarget, useGenreTarget, useListSettings } from '/@/renderer/store';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Stack } from '/@/shared/components/stack/stack';
import { LibraryItem } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
const GenreDetailFilters = () => {
    const genreTarget = useGenreTarget();
    if (genreTarget === GenreTarget.ALBUM) {
        return (_jsx(ListWithSidebarContainer.SidebarPortal, { children: _jsxs(Stack, { h: "100%", style: { minHeight: 0 }, children: [_jsx(ListFiltersTitle, { itemType: LibraryItem.ALBUM }), _jsx(ScrollArea, { style: { flex: 1, minHeight: 0 }, children: _jsx(ListFilters, { itemType: LibraryItem.ALBUM }) }), _jsx(Stack, { p: "sm", children: _jsx(SaveAsCollectionButton, { fullWidth: true, itemType: LibraryItem.ALBUM }) })] }) }));
    }
    if (genreTarget === GenreTarget.TRACK) {
        return (_jsx(ListWithSidebarContainer.SidebarPortal, { children: _jsxs(Stack, { h: "100%", style: { minHeight: 0 }, children: [_jsx(ListFiltersTitle, { itemType: LibraryItem.SONG }), _jsx(ScrollArea, { style: { flex: 1, minHeight: 0 }, children: _jsx(ListFilters, { itemType: LibraryItem.SONG }) }), _jsx(Stack, { p: "sm", children: _jsx(SaveAsCollectionButton, { fullWidth: true, itemType: LibraryItem.SONG }) })] }) }));
    }
    return null;
};
export const GenreDetailContent = () => {
    const genreTarget = useGenreTarget();
    return (_jsxs(_Fragment, { children: [_jsx(GenreDetailFilters, {}), genreTarget === GenreTarget.ALBUM && _jsx(GenreDetailContentAlbums, {}), genreTarget === GenreTarget.TRACK && _jsx(GenreDetailContentSongs, {})] }));
};
function GenreDetailContentAlbums() {
    const { genreId } = useParams();
    const { display, grid, itemsPerPage, pagination, table } = useListSettings(ItemListKey.ALBUM);
    const overrideQuery = useMemo(() => {
        return {
            genreIds: [genreId],
        };
    }, [genreId]);
    return (_jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(AlbumListView, { display: display, grid: grid, itemsPerPage: itemsPerPage, overrideQuery: overrideQuery, pagination: pagination, table: table }) }));
}
function GenreDetailContentSongs() {
    const { genreId } = useParams();
    const { display, grid, itemsPerPage, pagination, table } = useListSettings(ItemListKey.SONG);
    const overrideQuery = useMemo(() => {
        return {
            genreIds: [genreId],
        };
    }, [genreId]);
    return (_jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(SongListView, { display: display, grid: grid, itemsPerPage: itemsPerPage, overrideQuery: overrideQuery, pagination: pagination, table: table }) }));
}
