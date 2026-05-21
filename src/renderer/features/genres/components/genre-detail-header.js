import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { useListContext } from '/@/renderer/context/list-context';
import { AlbumListHeaderFilters } from '/@/renderer/features/albums/components/album-list-header-filters';
import { useAlbumListFilters } from '/@/renderer/features/albums/hooks/use-album-list-filters';
import { FilterBar } from '/@/renderer/features/shared/components/filter-bar';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { ListSearchInput } from '/@/renderer/features/shared/components/list-search-input';
import { SongListHeaderFilters } from '/@/renderer/features/songs/components/song-list-header-filters';
import { useSongListFilters } from '/@/renderer/features/songs/hooks/use-song-list-filters';
import { GenreTarget, useGenreTarget } from '/@/renderer/store';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';
import { LibraryItem } from '/@/shared/types/domain-types';
export const GenreDetailHeader = ({ title }) => {
    const { t } = useTranslation();
    const { itemCount } = useListContext();
    const pageTitle = title || t('page.genreList.title', { postProcess: 'titleCase' });
    const genreTarget = useGenreTarget();
    return (_jsxs(Stack, { gap: 0, children: [_jsxs(PageHeader, { children: [_jsxs(LibraryHeaderBar, { ignoreMaxWidth: true, children: [_jsx(PlayButton, {}), _jsx(LibraryHeaderBar.Title, { children: pageTitle }), _jsx(LibraryHeaderBar.Badge, { isLoading: !itemCount, children: itemCount })] }), _jsx(Group, { children: _jsx(ListSearchInput, {}) })] }), _jsx(FilterBar, { children: genreTarget === GenreTarget.ALBUM ? (_jsx(AlbumListHeaderFilters, { toggleGenreTarget: true })) : (_jsx(SongListHeaderFilters, { toggleGenreTarget: true })) })] }));
};
const PlayButton = () => {
    const genreTarget = useGenreTarget();
    switch (genreTarget) {
        case GenreTarget.ALBUM:
            return _jsx(AlbumPlayButton, {});
        case GenreTarget.TRACK:
            return _jsx(SongPlayButton, {});
        default:
            return null;
    }
};
const AlbumPlayButton = () => {
    const { query } = useAlbumListFilters();
    const { id } = useListContext();
    const mergedQuery = useMemo(() => {
        return {
            ...query,
            genreIds: [id],
        };
    }, [query, id]);
    return (_jsx(LibraryHeaderBar.PlayButton, { itemType: LibraryItem.ALBUM, listQuery: mergedQuery, variant: "filled" }));
};
const SongPlayButton = () => {
    const { query } = useSongListFilters();
    const { id } = useListContext();
    const mergedQuery = useMemo(() => {
        return {
            ...query,
            genreIds: [id],
        };
    }, [query, id]);
    return (_jsx(LibraryHeaderBar.PlayButton, { itemType: LibraryItem.SONG, listQuery: mergedQuery, variant: "filled" }));
};
