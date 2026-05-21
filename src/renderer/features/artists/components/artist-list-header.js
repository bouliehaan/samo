import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { useIsFetchingItemListCount } from '/@/renderer/components/item-list/helpers/use-is-fetching-item-list';
import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { useListContext } from '/@/renderer/context/list-context';
import { ArtistListHeaderFilters } from '/@/renderer/features/artists/components/artist-list-header-filters';
import { useArtistListFilters } from '/@/renderer/features/artists/hooks/use-artist-list-filters';
import { FilterBar } from '/@/renderer/features/shared/components/filter-bar';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { ListSearchInput } from '/@/renderer/features/shared/components/list-search-input';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';
import { LibraryItem } from '/@/shared/types/domain-types';
export const ArtistListHeader = ({ title }) => {
    const { t } = useTranslation();
    const pageTitle = title || t('entity.artist', { count: 2, postProcess: 'titleCase' });
    return (_jsxs(Stack, { gap: 0, children: [_jsxs(PageHeader, { children: [_jsxs(LibraryHeaderBar, { ignoreMaxWidth: true, children: [_jsx(PlayButton, {}), _jsx(LibraryHeaderBar.Title, { children: pageTitle }), _jsx(ArtistListHeaderBadge, {})] }), _jsx(Group, { children: _jsx(ListSearchInput, {}) })] }), _jsx(FilterBar, { children: _jsx(ArtistListHeaderFilters, {}) })] }));
};
const ArtistListHeaderBadge = () => {
    const { itemCount } = useListContext();
    const isFetching = useIsFetchingItemListCount({
        itemType: LibraryItem.ARTIST,
    });
    return _jsx(LibraryHeaderBar.Badge, { isLoading: isFetching, children: itemCount });
};
const PlayButton = () => {
    const { query } = useArtistListFilters();
    return _jsx(LibraryHeaderBar.PlayButton, { itemType: LibraryItem.ARTIST, listQuery: query });
};
