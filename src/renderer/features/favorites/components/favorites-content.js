import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Suspense } from 'react';
import { useListContext } from '/@/renderer/context/list-context';
import { AlbumListView, } from '/@/renderer/features/albums/components/album-list-content';
import { AlbumArtistListView, } from '/@/renderer/features/artists/components/album-artist-list-content';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { SongListView, } from '/@/renderer/features/songs/components/song-list-content';
import { useListSettings } from '/@/renderer/store';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { LibraryItem } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const FavoritesContent = ({ itemType }) => {
    return (_jsx(AnimatedPage, { children: _jsxs(Suspense, { fallback: _jsx(Spinner, { container: true }), children: [itemType === LibraryItem.ALBUM && _jsx(AlbumFavorites, {}), itemType === LibraryItem.SONG && _jsx(SongFavorites, {}), itemType === LibraryItem.ALBUM_ARTIST && _jsx(ArtistFavorites, {})] }) }));
};
const AlbumFavorites = () => {
    const { display, grid, itemsPerPage, pagination, table } = useListSettings(ItemListKey.ALBUM);
    const { customFilters } = useListContext();
    const albumQuery = {
        ...customFilters,
    };
    return (_jsx(AlbumListView, { display: display, grid: grid, itemsPerPage: itemsPerPage, overrideQuery: albumQuery, pagination: pagination, table: table }));
};
const SongFavorites = () => {
    const { display, grid, itemsPerPage, pagination, table } = useListSettings(ItemListKey.SONG);
    const { customFilters } = useListContext();
    const songQuery = {
        ...customFilters,
    };
    return (_jsx(SongListView, { display: display, grid: grid, itemsPerPage: itemsPerPage, overrideQuery: songQuery, pagination: pagination, table: table }));
};
const ArtistFavorites = () => {
    const { display, grid, itemsPerPage, pagination, table } = useListSettings(ItemListKey.ARTIST);
    const { customFilters } = useListContext();
    const albumArtistQuery = {
        ...customFilters,
    };
    return (_jsx(AlbumArtistListView, { display: display, grid: grid, itemsPerPage: itemsPerPage, overrideQuery: albumArtistQuery, pagination: pagination, table: table }));
};
