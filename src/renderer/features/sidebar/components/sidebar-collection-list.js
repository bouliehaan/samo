import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import styles from './sidebar-collection-list.module.css';
import { SidebarIcon } from '/@/renderer/features/sidebar/components/sidebar-icon';
import { AppRoute } from '/@/renderer/router/routes';
import { useCollections, useSettingsStoreActions } from '/@/renderer/store';
import { getFilterQueryStringFromSearchParams } from '/@/renderer/utils/query-params';
import { Accordion } from '/@/shared/components/accordion/accordion';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Button } from '/@/shared/components/button/button';
import { DropdownMenu } from '/@/shared/components/dropdown-menu/dropdown-menu';
import { Group } from '/@/shared/components/group/group';
import { Popover } from '/@/shared/components/popover/popover';
import { Stack } from '/@/shared/components/stack/stack';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { Text } from '/@/shared/components/text/text';
import { useDisclosure } from '/@/shared/hooks/use-disclosure';
import { useForm } from '/@/shared/hooks/use-form';
import { LibraryItem } from '/@/shared/types/domain-types';
export const getCollectionTo = (collection) => {
    const pathname = collection.type === LibraryItem.ALBUM ? AppRoute.LIBRARY_ALBUMS : AppRoute.LIBRARY_SONGS;
    const search = collection.filterQueryString ? `?${collection.filterQueryString}` : '';
    return { pathname, search };
};
const CollectionRow = ({ collection, onRename, }) => {
    const { t } = useTranslation();
    const { removeCollection } = useSettingsStoreActions();
    const [isRenameOpen, renameHandlers] = useDisclosure(false);
    const form = useForm({
        initialValues: {
            name: collection.name,
        },
    });
    const location = useLocation();
    const to = getCollectionTo(collection);
    const currentFilterQuery = getFilterQueryStringFromSearchParams(new URLSearchParams(location.search));
    const collectionFilterQuery = collection.filterQueryString ?? '';
    const isActive = location.pathname === to.pathname && currentFilterQuery === collectionFilterQuery;
    const handleRenameOpen = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        form.setValues({ name: collection.name });
        renameHandlers.open();
    }, [collection.name, form, renameHandlers]);
    const handleRenameSubmit = form.onSubmit((values) => {
        const trimmed = values.name.trim();
        if (trimmed) {
            onRename(collection.id, trimmed);
            renameHandlers.close();
        }
    });
    const handleDelete = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        removeCollection(collection.id);
    }, [collection.id, removeCollection]);
    return (_jsxs(Popover, { onClose: renameHandlers.close, opened: isRenameOpen, position: "right-start", width: 280, children: [_jsx(Popover.Target, { children: _jsx("div", { className: clsx(styles.row, { [styles.rowActive]: isActive }), children: _jsxs(Link, { className: styles.rowLink, to: to, children: [_jsxs(Group, { className: styles.rowContent, wrap: "nowrap", children: [_jsx(SidebarIcon, { active: isActive, route: collection.type === LibraryItem.ALBUM
                                            ? AppRoute.LIBRARY_ALBUMS
                                            : AppRoute.LIBRARY_SONGS, size: "1rem" }), _jsx(Text, { className: styles.name, fw: 500, size: "md", children: collection.name })] }), _jsxs(DropdownMenu, { position: "right-start", trigger: "click", children: [_jsx(DropdownMenu.Target, { children: _jsx(ActionIcon, { className: styles.moreButton, icon: "ellipsisVertical", iconProps: { size: 'xs' }, onClick: (e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                            }, size: "compact-sm", variant: "transparent" }) }), _jsxs(DropdownMenu.Dropdown, { children: [_jsx(DropdownMenu.Item, { onClick: handleRenameOpen, children: t('common.rename', { postProcess: 'sentenceCase' }) }), _jsx(DropdownMenu.Item, { color: "red", onClick: handleDelete, children: t('common.delete', { postProcess: 'sentenceCase' }) })] })] })] }) }) }), _jsx(Popover.Dropdown, { children: _jsx("form", { onSubmit: handleRenameSubmit, children: _jsxs(Stack, { gap: "md", p: "xs", children: [_jsx(TextInput, { autoFocus: true, maxLength: 128, variant: "filled", ...form.getInputProps('name') }), _jsxs(Group, { gap: "xs", justify: "flex-end", children: [_jsx(Button, { onClick: renameHandlers.close, type: "button", variant: "subtle", children: t('common.cancel', { postProcess: 'sentenceCase' }) }), _jsx(Button, { type: "submit", variant: "filled", children: t('common.save', { postProcess: 'sentenceCase' }) })] })] }) }) })] }));
};
export const SidebarCollectionList = () => {
    const { t } = useTranslation();
    const collections = useCollections();
    const { updateCollection } = useSettingsStoreActions();
    const handleRename = useCallback((id, name) => {
        updateCollection(id, { name });
    }, [updateCollection]);
    if (!collections || collections.length === 0) {
        return null;
    }
    return (_jsxs(Accordion.Item, { value: "collections", children: [_jsx(Accordion.Control, { component: "div", role: "button", style: { userSelect: 'none' }, children: _jsx(Text, { fw: 500, children: t('page.sidebar.collections', { postProcess: 'titleCase' }) }) }), _jsx(Accordion.Panel, { children: collections.map((collection) => (_jsx(CollectionRow, { collection: collection, onRename: handleRename }, collection.id))) })] }));
};
