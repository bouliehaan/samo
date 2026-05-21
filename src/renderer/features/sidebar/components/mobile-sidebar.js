import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './mobile-sidebar.module.css';
import { ActionBar } from '/@/renderer/features/sidebar/components/action-bar';
import { SidebarIcon } from '/@/renderer/features/sidebar/components/sidebar-icon';
import { SidebarItem } from '/@/renderer/features/sidebar/components/sidebar-item';
import { SidebarPlaylistList, SidebarSharedPlaylistList, } from '/@/renderer/features/sidebar/components/sidebar-playlist-list';
import { useSidebarItems, useSidebarPlaylistList, } from '/@/renderer/store/settings.store';
import { Accordion } from '/@/shared/components/accordion/accordion';
import { Group } from '/@/shared/components/group/group';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Text } from '/@/shared/components/text/text';
export const MobileSidebar = () => {
    const { t } = useTranslation();
    const sidebarPlaylistList = useSidebarPlaylistList();
    const translatedSidebarItemMap = useMemo(() => ({
        Albums: t('page.sidebar.albums', { postProcess: 'titleCase' }),
        Artists: t('page.sidebar.albumArtists', { postProcess: 'titleCase' }),
        'Artists-all': t('page.sidebar.artists', { postProcess: 'titleCase' }),
        Favorites: t('page.sidebar.favorites', { postProcess: 'titleCase' }),
        Genres: t('page.sidebar.genres', { postProcess: 'titleCase' }),
        Home: t('page.sidebar.home', { postProcess: 'titleCase' }),
        'Now Playing': t('page.sidebar.nowPlaying', { postProcess: 'titleCase' }),
        Playlists: t('page.sidebar.playlists', { postProcess: 'titleCase' }),
        Search: t('page.sidebar.search', { postProcess: 'titleCase' }),
        Settings: t('page.sidebar.settings', { postProcess: 'titleCase' }),
        Tracks: t('page.sidebar.tracks', { postProcess: 'titleCase' }),
    }), [t]);
    const sidebarItems = useSidebarItems();
    const sidebarItemsWithRoute = useMemo(() => {
        if (!sidebarItems)
            return [];
        const items = sidebarItems
            .filter((item) => !item.disabled)
            .map((item) => ({
            ...item,
            label: translatedSidebarItemMap[item.id] ??
                item.label,
        }));
        return items;
    }, [sidebarItems, translatedSidebarItemMap]);
    return (_jsxs("div", { className: styles.container, id: "mobile-sidebar", children: [_jsx(Group, { grow: true, id: "global-search-container", style: { flexShrink: 0 }, children: _jsx(ActionBar, {}) }), _jsx(ScrollArea, { allowDragScroll: true, className: styles.scrollArea, children: _jsxs(Accordion, { classNames: {
                        content: styles.accordionContent,
                        control: styles.accordionControl,
                        item: styles.accordionItem,
                        root: styles.accordionRoot,
                    }, defaultValue: ['library', 'playlists'], multiple: true, children: [_jsxs(Accordion.Item, { value: "library", children: [_jsx(Accordion.Control, { children: _jsx(Text, { fw: 600, variant: "secondary", children: t('page.sidebar.myLibrary', {
                                            postProcess: 'titleCase',
                                        }) }) }), _jsx(Accordion.Panel, { children: sidebarItemsWithRoute.map((item) => {
                                        return (_jsx(SidebarItem, { to: item.route, children: _jsxs(Group, { gap: "sm", children: [_jsx(SidebarIcon, { route: item.route }), item.label] }) }, `sidebar-${item.route}`));
                                    }) })] }), sidebarPlaylistList && (_jsxs(_Fragment, { children: [_jsx(SidebarPlaylistList, {}), _jsx(SidebarSharedPlaylistList, {})] }))] }) })] }));
};
