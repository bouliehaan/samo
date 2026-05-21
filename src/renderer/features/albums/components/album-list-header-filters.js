import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ALBUM_TABLE_COLUMNS, SONG_TABLE_COLUMNS, } from '/@/renderer/components/item-list/item-table-list/default-columns';
import { useListContext } from '/@/renderer/context/list-context';
import { useAlbumListFilters } from '/@/renderer/features/albums/hooks/use-album-list-filters';
import { ListConfigMenu } from '/@/renderer/features/shared/components/list-config-menu';
import { ListDisplayTypeToggleButton } from '/@/renderer/features/shared/components/list-display-type-toggle-button';
import { isFilterValueSet, ListFiltersModal, } from '/@/renderer/features/shared/components/list-filters';
import { ListRefreshButton } from '/@/renderer/features/shared/components/list-refresh-button';
import { ListSortByDropdown } from '/@/renderer/features/shared/components/list-sort-by-dropdown';
import { ListSortOrderToggleButton } from '/@/renderer/features/shared/components/list-sort-order-toggle-button';
import { FILTER_KEYS } from '/@/renderer/features/shared/utils';
import { useSongListFilters } from '/@/renderer/features/songs/hooks/use-song-list-filters';
import { GenreTarget, useGenreTarget, useSettingsStoreActions } from '/@/renderer/store';
import { Button } from '/@/shared/components/button/button';
import { Divider } from '/@/shared/components/divider/divider';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { AlbumListSort, LibraryItem, SortOrder } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const AlbumListHeaderFilters = ({ toggleGenreTarget }) => {
    const { t } = useTranslation();
    const target = useGenreTarget();
    const { setGenreBehavior } = useSettingsStoreActions();
    const albumFilters = useAlbumListFilters();
    const songFilters = useSongListFilters();
    const { pageKey } = useListContext();
    const choice = useMemo(() => {
        return target === GenreTarget.ALBUM
            ? t('entity.album', { count: 2, postProcess: 'titleCase' })
            : t('entity.track', { count: 2, postProcess: 'titleCase' });
    }, [target, t]);
    const handleToggleGenreTarget = useCallback(() => {
        albumFilters.clear();
        songFilters.clear();
        setGenreBehavior(target === GenreTarget.ALBUM ? GenreTarget.TRACK : GenreTarget.ALBUM);
    }, [target, setGenreBehavior, albumFilters, songFilters]);
    const hasActiveFilters = useMemo(() => {
        const query = albumFilters.query;
        return Boolean(isFilterValueSet(query[FILTER_KEYS.ALBUM._CUSTOM]) ||
            isFilterValueSet(query[FILTER_KEYS.ALBUM.ARTIST_IDS]) ||
            query[FILTER_KEYS.ALBUM.COMPILATION] !== undefined ||
            query[FILTER_KEYS.ALBUM.FAVORITE] !== undefined ||
            isFilterValueSet(query[FILTER_KEYS.ALBUM.GENRE_ID]) ||
            query[FILTER_KEYS.ALBUM.HAS_RATING] !== undefined ||
            isFilterValueSet(query[FILTER_KEYS.ALBUM.MAX_YEAR]) ||
            isFilterValueSet(query[FILTER_KEYS.ALBUM.MIN_YEAR]) ||
            query[FILTER_KEYS.ALBUM.RECENTLY_PLAYED] !== undefined ||
            isFilterValueSet(query[FILTER_KEYS.SHARED.SEARCH_TERM]));
    }, [albumFilters.query]);
    return (_jsxs(Flex, { justify: "space-between", children: [_jsxs(Group, { gap: "sm", w: "100%", children: [toggleGenreTarget && (_jsxs(_Fragment, { children: [_jsx(Button, { leftSection: _jsx(Icon, { icon: "arrowLeftRight" }), onClick: handleToggleGenreTarget, variant: "subtle", children: choice }), _jsx(Divider, { orientation: "vertical" })] })), _jsx(ListSortByDropdown, { defaultSortByValue: AlbumListSort.NAME, itemType: LibraryItem.ALBUM, listKey: pageKey }), _jsx(Divider, { orientation: "vertical" }), _jsx(ListSortOrderToggleButton, { defaultSortOrder: SortOrder.ASC, listKey: pageKey }), _jsx(ListFiltersModal, { isActive: hasActiveFilters, itemType: LibraryItem.ALBUM }), _jsx(ListRefreshButton, { listKey: pageKey })] }), _jsxs(Group, { gap: "sm", wrap: "nowrap", children: [_jsx(ListDisplayTypeToggleButton, { enableDetail: true, listKey: ItemListKey.ALBUM }), _jsx(ListConfigMenu, { detailConfig: {
                            optionsConfig: {
                                autoFitColumns: { hidden: true },
                            },
                            tableColumnsData: SONG_TABLE_COLUMNS,
                            tableKey: 'detail',
                        }, listKey: ItemListKey.ALBUM, tableColumnsData: ALBUM_TABLE_COLUMNS })] })] }));
};
