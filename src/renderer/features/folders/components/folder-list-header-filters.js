import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SONG_TABLE_COLUMNS } from '/@/renderer/components/item-list/item-table-list/default-columns';
import { useFolderListFilters } from '/@/renderer/features/folders/hooks/use-folder-list-filters';
import { ListConfigMenu, SONG_DISPLAY_TYPES, } from '/@/renderer/features/shared/components/list-config-menu';
import { ListRefreshButton } from '/@/renderer/features/shared/components/list-refresh-button';
import { ListSortByDropdown } from '/@/renderer/features/shared/components/list-sort-by-dropdown';
import { ListSortOrderToggleButton } from '/@/renderer/features/shared/components/list-sort-order-toggle-button';
import { useContainerQuery } from '/@/renderer/hooks';
import { truncateMiddle } from '/@/renderer/utils';
import { Breadcrumb } from '/@/shared/components/breadcrumb/breadcrumb';
import { Button } from '/@/shared/components/button/button';
import { Divider } from '/@/shared/components/divider/divider';
import { DropdownMenu } from '/@/shared/components/dropdown-menu/dropdown-menu';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Stack } from '/@/shared/components/stack/stack';
import { LibraryItem, SongListSort, SortOrder } from '/@/shared/types/domain-types';
import { ItemListKey, ListDisplayType } from '/@/shared/types/types';
const MAX_BREADCRUMB_TEXT_LENGTH = 26;
export const FolderListHeaderFilters = () => {
    const { t } = useTranslation();
    const { folderPath, navigateToPathIndex, setFolderPath } = useFolderListFilters();
    const { is2xl, isLg, isMd, isSm, isXl, isXs, ref: breadcrumbContainerRef, } = useContainerQuery();
    const maxItems = useMemo(() => {
        if (is2xl)
            return 8;
        if (isXl)
            return 6;
        if (isLg)
            return 4;
        if (isMd)
            return 3;
        if (isSm)
            return 2;
        if (isXs)
            return 2;
        return 1;
    }, [is2xl, isLg, isMd, isSm, isXl, isXs]);
    const allBreadcrumbItems = useMemo(() => {
        const items = [];
        const homeLabel = t('common.home', { postProcess: 'titleCase' });
        items.push({
            fullLabel: homeLabel,
            id: 'folder-root',
            label: homeLabel,
            onClick: () => {
                setFolderPath([]);
            },
        });
        folderPath.forEach((folder, index) => {
            items.push({
                fullLabel: folder.name,
                id: `folder-${folder.id}`,
                label: truncateMiddle(folder.name, MAX_BREADCRUMB_TEXT_LENGTH),
                onClick: () => navigateToPathIndex(index),
            });
        });
        return items;
    }, [folderPath, navigateToPathIndex, setFolderPath, t]);
    const visibleItems = useMemo(() => {
        const firstItem = allBreadcrumbItems[0];
        if (maxItems === 1) {
            return [firstItem];
        }
        if (allBreadcrumbItems.length <= maxItems) {
            return allBreadcrumbItems;
        }
        const lastItem = allBreadcrumbItems[allBreadcrumbItems.length - 1];
        const middleItems = allBreadcrumbItems.slice(1, -1);
        const availableSlots = maxItems - 2;
        if (availableSlots <= 0) {
            return [firstItem, lastItem];
        }
        if (middleItems.length <= availableSlots) {
            return [firstItem, ...middleItems, lastItem];
        }
        const startCount = Math.floor(availableSlots / 2);
        const endCount = availableSlots - startCount;
        const startMiddle = middleItems.slice(0, startCount);
        const endMiddle = middleItems.slice(-endCount);
        return [firstItem, ...startMiddle, ...endMiddle, lastItem];
    }, [allBreadcrumbItems, maxItems]);
    const collapsedItems = useMemo(() => {
        if (maxItems === 1) {
            return allBreadcrumbItems.slice(1);
        }
        if (allBreadcrumbItems.length <= maxItems) {
            return [];
        }
        const middleItems = allBreadcrumbItems.slice(1, -1);
        const availableSlots = maxItems - 2;
        if (availableSlots <= 0) {
            return middleItems;
        }
        if (middleItems.length <= availableSlots) {
            return [];
        }
        const startCount = Math.floor(availableSlots / 2);
        const endCount = availableSlots - startCount;
        const visibleStart = middleItems.slice(0, startCount);
        const visibleEnd = middleItems.slice(-endCount);
        return middleItems.filter((item) => !visibleStart.includes(item) && !visibleEnd.includes(item));
    }, [allBreadcrumbItems, maxItems]);
    const breadcrumbItems = useMemo(() => {
        const items = [];
        const firstItem = allBreadcrumbItems[0];
        const lastItem = allBreadcrumbItems[allBreadcrumbItems.length - 1];
        const hasCollapsedItems = collapsedItems.length > 0;
        const renderDropdown = () => (_jsxs(DropdownMenu, { position: "bottom-start", children: [_jsx(DropdownMenu.Target, { children: _jsx(Button, { size: "compact-sm", variant: "subtle", children: _jsx(Icon, { icon: "ellipsisHorizontal" }) }) }), _jsx(DropdownMenu.Dropdown, { children: collapsedItems.map((collapsedItem) => (_jsx(DropdownMenu.Item, { onClick: collapsedItem.onClick, children: collapsedItem.fullLabel }, collapsedItem.id))) })] }, "breadcrumb-dropdown"));
        if (hasCollapsedItems && maxItems === 1) {
            items.push(_jsx(Button, { onClick: firstItem.onClick, size: "compact-sm", variant: "subtle", children: firstItem.label }, firstItem.id));
            items.push(renderDropdown());
            return items;
        }
        if (hasCollapsedItems) {
            const middleItems = allBreadcrumbItems.slice(1, -1);
            const availableSlots = maxItems - 2;
            const startCount = Math.floor(availableSlots / 2);
            const visibleStartMiddle = middleItems.slice(0, startCount);
            const visibleEndMiddle = middleItems.slice(-(availableSlots - startCount));
            visibleItems.forEach((item, index) => {
                items.push(_jsx(Button, { onClick: item.onClick, size: "compact-sm", variant: "subtle", children: item.label }, item.id));
                if (index < visibleItems.length - 1) {
                    const nextItem = visibleItems[index + 1];
                    const isFirstItem = item.id === firstItem.id;
                    const isLastStartMiddle = item.id !== firstItem.id &&
                        item.id !== lastItem.id &&
                        visibleStartMiddle.length > 0 &&
                        item.id === visibleStartMiddle[visibleStartMiddle.length - 1].id;
                    const shouldInsertDropdown = (isFirstItem && nextItem.id === lastItem.id) ||
                        (isLastStartMiddle &&
                            (nextItem.id === lastItem.id ||
                                (visibleEndMiddle.length > 0 &&
                                    nextItem.id === visibleEndMiddle[0].id)));
                    if (shouldInsertDropdown) {
                        items.push(renderDropdown());
                    }
                }
            });
        }
        else {
            visibleItems.forEach((item) => {
                items.push(_jsx(Button, { onClick: item.onClick, size: "compact-sm", variant: "subtle", children: item.label }, item.id));
            });
        }
        return items;
    }, [visibleItems, collapsedItems, allBreadcrumbItems, maxItems]);
    return (_jsxs(Stack, { children: [_jsxs(Flex, { justify: "space-between", children: [_jsxs(Group, { gap: "sm", w: "100%", children: [_jsx(ListSortByDropdown, { defaultSortByValue: SongListSort.ID, itemType: LibraryItem.FOLDER, listKey: ItemListKey.FOLDER }), _jsx(Divider, { orientation: "vertical" }), _jsx(ListSortOrderToggleButton, { defaultSortOrder: SortOrder.ASC, listKey: ItemListKey.FOLDER }), _jsx(ListRefreshButton, { listKey: ItemListKey.SONG })] }), _jsx(Group, { gap: "sm", wrap: "nowrap", children: _jsx(ListConfigMenu, { displayTypes: [
                                { hidden: true, value: ListDisplayType.GRID },
                                ...SONG_DISPLAY_TYPES,
                            ], listKey: ItemListKey.SONG, optionsConfig: {
                                grid: {
                                    itemsPerPage: { hidden: true },
                                    pagination: { hidden: true },
                                },
                                table: {
                                    itemsPerPage: { hidden: true },
                                    pagination: { hidden: true },
                                },
                            }, tableColumnsData: SONG_TABLE_COLUMNS }) })] }), _jsx("div", { ref: breadcrumbContainerRef, children: _jsx(Breadcrumb, { separator: _jsx(Icon, { icon: "arrowRight" }), children: breadcrumbItems }) })] }));
};
