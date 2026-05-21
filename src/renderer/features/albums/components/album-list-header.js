import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSuspenseQuery } from '@tanstack/react-query';
import { Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useIsFetchingItemListCount } from '/@/renderer/components/item-list/helpers/use-is-fetching-item-list';
import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { useListContext } from '/@/renderer/context/list-context';
import { AlbumListHeaderFilters } from '/@/renderer/features/albums/components/album-list-header-filters';
import { useAlbumListFilters } from '/@/renderer/features/albums/hooks/use-album-list-filters';
import { artistsQueries } from '/@/renderer/features/artists/api/artists-api';
import { useGenreList } from '/@/renderer/features/genres/api/genres-api';
import { FilterBar } from '/@/renderer/features/shared/components/filter-bar';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { ListSearchInput } from '/@/renderer/features/shared/components/list-search-input';
import { useCurrentServerId } from '/@/renderer/store';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';
import { LibraryItem } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const AlbumListHeader = ({ title }) => {
    return (_jsxs(Stack, { gap: 0, children: [_jsxs(PageHeader, { children: [_jsxs(LibraryHeaderBar, { ignoreMaxWidth: true, children: [_jsx(PlayButton, {}), _jsx(PageTitle, { title: title }), _jsx(AlbumListHeaderBadge, {})] }), _jsx(Group, { children: _jsx(ListSearchInput, {}) })] }), _jsx(FilterBar, { children: _jsx(AlbumListHeaderFilters, {}) })] }));
};
const AlbumListHeaderBadge = () => {
    const { itemCount } = useListContext();
    const isFetching = useIsFetchingItemListCount({
        itemType: LibraryItem.ALBUM,
    });
    return _jsx(LibraryHeaderBar.Badge, { isLoading: isFetching, children: itemCount });
};
const PageTitle = ({ title }) => {
    const { t } = useTranslation();
    const { pageKey } = useListContext();
    const pageTitle = title || t('page.albumList.title', { postProcess: 'titleCase' });
    switch (pageKey) {
        case ItemListKey.ALBUM_ARTIST_ALBUM:
            return (_jsx(Suspense, { fallback: _jsx(LibraryHeaderBar.Title, { children: "\u2014" }), children: _jsx(AlbumArtistTitle, {}) }));
        case ItemListKey.GENRE_ALBUM:
            return (_jsx(Suspense, { fallback: _jsx(LibraryHeaderBar.Title, { children: "\u2014" }), children: _jsx(GenreTitle, {}) }));
    }
    return _jsx(LibraryHeaderBar.Title, { children: pageTitle });
};
const GenreTitle = () => {
    const { id } = useListContext();
    const { data: genres } = useGenreList();
    const name = useMemo(() => {
        return genres?.items.find((g) => g.id === id)?.name || '—';
    }, [id, genres]);
    return _jsx(LibraryHeaderBar.Title, { children: name });
};
const AlbumArtistTitle = () => {
    const serverId = useCurrentServerId();
    const { id } = useListContext();
    const { data: albumArtist } = useSuspenseQuery(artistsQueries.albumArtistDetail({
        query: { id: id },
        serverId: serverId,
    }));
    return _jsx(LibraryHeaderBar.Title, { children: albumArtist?.name || '—' });
};
const PlayButton = () => {
    const { query } = useAlbumListFilters();
    const { customFilters } = useListContext();
    const mergedQuery = useMemo(() => {
        return {
            ...query,
            ...(customFilters ?? {}),
        };
    }, [query, customFilters]);
    return (_jsx(LibraryHeaderBar.PlayButton, { itemType: LibraryItem.ALBUM, listQuery: mergedQuery, variant: "filled" }));
};
