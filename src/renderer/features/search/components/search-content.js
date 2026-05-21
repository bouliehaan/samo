import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Suspense } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { AlbumListView, } from '/@/renderer/features/albums/components/album-list-content';
import { AlbumArtistListView, } from '/@/renderer/features/artists/components/album-artist-list-content';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { SongListView, } from '/@/renderer/features/songs/components/song-list-content';
import { useListSettings } from '/@/renderer/store';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { AlbumArtistListSort, AlbumListSort, LibraryItem, SongListSort, SortOrder, } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const SearchContent = () => {
    const { itemType } = useParams();
    return (_jsx(AnimatedPage, { children: _jsxs(Suspense, { fallback: _jsx(Spinner, { container: true }), children: [itemType === LibraryItem.ALBUM && _jsx(AlbumSearch, {}), itemType === LibraryItem.SONG && _jsx(SongSearch, {}), itemType === LibraryItem.ALBUM_ARTIST && _jsx(ArtistSearch, {})] }) }));
};
const AlbumSearch = () => {
    const { display, grid, itemsPerPage, pagination, table } = useListSettings(ItemListKey.ALBUM);
    const [searchParams] = useSearchParams();
    const albumQuery = {
        searchTerm: searchParams.get('query') || '',
        sortBy: AlbumListSort.NAME,
        sortOrder: SortOrder.ASC,
    };
    return (_jsx(AlbumListView, { display: display, grid: grid, itemsPerPage: itemsPerPage, overrideQuery: albumQuery, pagination: pagination, table: table }));
};
const SongSearch = () => {
    const { display, grid, itemsPerPage, pagination, table } = useListSettings(ItemListKey.SONG);
    const [searchParams] = useSearchParams();
    const songQuery = {
        searchTerm: searchParams.get('query') || '',
        sortBy: SongListSort.NAME,
        sortOrder: SortOrder.ASC,
    };
    return (_jsx(SongListView, { display: display, grid: grid, itemsPerPage: itemsPerPage, overrideQuery: songQuery, pagination: pagination, table: table }));
};
const ArtistSearch = () => {
    const { display, grid, itemsPerPage, pagination, table } = useListSettings(ItemListKey.ARTIST);
    const [searchParams] = useSearchParams();
    const albumArtistQuery = {
        searchTerm: searchParams.get('query') || '',
        sortBy: AlbumArtistListSort.NAME,
        sortOrder: SortOrder.ASC,
    };
    return (_jsx(AlbumArtistListView, { display: display, grid: grid, itemsPerPage: itemsPerPage, overrideQuery: albumArtistQuery, pagination: pagination, table: table }));
};
