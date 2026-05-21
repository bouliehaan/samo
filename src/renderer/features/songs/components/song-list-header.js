import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSuspenseQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useIsFetchingItemListCount } from '/@/renderer/components/item-list/helpers/use-is-fetching-item-list';
import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { useListContext } from '/@/renderer/context/list-context';
import { artistsQueries } from '/@/renderer/features/artists/api/artists-api';
import { useGenreList } from '/@/renderer/features/genres/api/genres-api';
import { FilterBar } from '/@/renderer/features/shared/components/filter-bar';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { ListSearchInput } from '/@/renderer/features/shared/components/list-search-input';
import { SongListHeaderFilters } from '/@/renderer/features/songs/components/song-list-header-filters';
import { useSongListFilters } from '/@/renderer/features/songs/hooks/use-song-list-filters';
import { useCurrentServerId } from '/@/renderer/store';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';
import { LibraryItem } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const SongListHeader = ({ title }) => {
    return (_jsxs(Stack, { gap: 0, children: [_jsx(PageHeader, { children: _jsxs(Flex, { justify: "space-between", w: "100%", children: [_jsxs(LibraryHeaderBar, { ignoreMaxWidth: true, children: [_jsx(PlayButton, {}), _jsx(PageTitle, { title: title }), _jsx(SongListHeaderBadge, {})] }), _jsx(Group, { children: _jsx(ListSearchInput, {}) })] }) }), _jsx(FilterBar, { children: _jsx(SongListHeaderFilters, {}) })] }));
};
const SongListHeaderBadge = () => {
    const { itemCount } = useListContext();
    const isFetching = useIsFetchingItemListCount({
        itemType: LibraryItem.SONG,
    });
    return _jsx(LibraryHeaderBar.Badge, { isLoading: isFetching, children: itemCount });
};
const PlayButton = () => {
    const { customFilters } = useListContext();
    const { query } = useSongListFilters();
    const mergedQuery = useMemo(() => {
        return {
            ...query,
            ...(customFilters ?? {}),
        };
    }, [query, customFilters]);
    return _jsx(LibraryHeaderBar.PlayButton, { itemType: LibraryItem.SONG, listQuery: mergedQuery });
};
const PageTitle = ({ title }) => {
    const { t } = useTranslation();
    const { pageKey } = useListContext();
    const pageTitle = title || t('page.trackList.title', { postProcess: 'titleCase' });
    switch (pageKey) {
        case ItemListKey.ALBUM_ARTIST_SONG:
            return _jsx(AlbumArtistTitle, {});
        case ItemListKey.GENRE_SONG:
            return _jsx(GenreTitle, {});
    }
    return _jsx(LibraryHeaderBar.Title, { children: pageTitle });
};
const AlbumArtistTitle = () => {
    const { id } = useListContext();
    const serverId = useCurrentServerId();
    const { data: albumArtist } = useSuspenseQuery(artistsQueries.albumArtistDetail({
        query: { id: id },
        serverId: serverId,
    }));
    return _jsx(LibraryHeaderBar.Title, { children: albumArtist?.name || '—' });
};
const GenreTitle = () => {
    const { id } = useListContext();
    const { data: genre } = useGenreList();
    const name = useMemo(() => {
        return genre?.items.find((g) => g.id === id)?.name || '—';
    }, [id, genre]);
    return _jsx(LibraryHeaderBar.Title, { children: name || '—' });
};
