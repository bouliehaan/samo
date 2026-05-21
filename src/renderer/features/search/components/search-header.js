import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import debounce from 'lodash/debounce';
import { useTranslation } from 'react-i18next';
import { generatePath, Link, useParams, useSearchParams } from 'react-router';
import { ALBUM_ARTIST_TABLE_COLUMNS, ALBUM_TABLE_COLUMNS, SONG_TABLE_COLUMNS, } from '/@/renderer/components/item-list/item-table-list/default-columns';
import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { FilterBar } from '/@/renderer/features/shared/components/filter-bar';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { ListConfigMenu, SONG_DISPLAY_TYPES, } from '/@/renderer/features/shared/components/list-config-menu';
import { SearchInput } from '/@/renderer/features/shared/components/search-input';
import { AppRoute } from '/@/renderer/router/routes';
import { Button, ButtonGroup } from '/@/shared/components/button/button';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';
import { LibraryItem } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export const SearchHeader = ({ navigationId }) => {
    const { t } = useTranslation();
    const { itemType } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const handleSearch = debounce((e) => {
        setSearchParams({ query: e.target.value }, { replace: true, state: { navigationId } });
    }, 200);
    const listConfigMenuProps = {
        [LibraryItem.ALBUM]: {
            listKey: ItemListKey.ALBUM,
            tableColumnsData: ALBUM_TABLE_COLUMNS,
        },
        [LibraryItem.ALBUM_ARTIST]: {
            listKey: ItemListKey.ALBUM_ARTIST,
            tableColumnsData: ALBUM_ARTIST_TABLE_COLUMNS,
        },
        [LibraryItem.SONG]: {
            displayTypes: SONG_DISPLAY_TYPES,
            listKey: ItemListKey.SONG,
            tableColumnsData: SONG_TABLE_COLUMNS,
        },
    };
    return (_jsxs(Stack, { gap: 0, children: [_jsx(PageHeader, { children: _jsxs(Flex, { justify: "space-between", w: "100%", children: [_jsx(LibraryHeaderBar, { ignoreMaxWidth: true, children: _jsx(LibraryHeaderBar.Title, { children: "Search" }) }), _jsx(Group, { children: _jsx(SearchInput, { defaultValue: searchParams.get('query') || '', onChange: handleSearch }) })] }) }), _jsx(FilterBar, { children: _jsxs(Flex, { justify: "space-between", w: "100%", children: [_jsxs(ButtonGroup, { children: [_jsx(Button, { component: Link, fw: 600, replace: true, size: "compact-md", state: { navigationId }, to: {
                                        pathname: generatePath(AppRoute.SEARCH, {
                                            itemType: LibraryItem.SONG,
                                        }),
                                        search: searchParams.toString(),
                                    }, variant: itemType === LibraryItem.SONG ? 'filled' : 'default', children: t('entity.track', { count: 2, postProcess: 'sentenceCase' }) }), _jsx(Button, { component: Link, fw: 600, replace: true, size: "compact-md", state: { navigationId }, to: {
                                        pathname: generatePath(AppRoute.SEARCH, {
                                            itemType: LibraryItem.ALBUM,
                                        }),
                                        search: searchParams.toString(),
                                    }, variant: itemType === LibraryItem.ALBUM ? 'filled' : 'default', children: t('entity.album', { count: 2, postProcess: 'sentenceCase' }) }), _jsx(Button, { component: Link, fw: 600, replace: true, size: "compact-md", state: { navigationId }, to: {
                                        pathname: generatePath(AppRoute.SEARCH, {
                                            itemType: LibraryItem.ALBUM_ARTIST,
                                        }),
                                        search: searchParams.toString(),
                                    }, variant: itemType === LibraryItem.ALBUM_ARTIST ? 'filled' : 'default', children: t('entity.artist', { count: 2, postProcess: 'sentenceCase' }) })] }), _jsx(ListConfigMenu, { ...listConfigMenuProps[itemType] })] }) })] }));
};
