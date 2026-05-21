import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { motion } from 'motion/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useNavigate } from 'react-router';
import samoLogo from '../../../../../build/samologo.svg';
import styles from './collapsed-sidebar.module.css';
import JellyfinLogo from '/@/renderer/features/servers/assets/jellyfin.png';
import NavidromeLogo from '/@/renderer/features/servers/assets/navidrome.png';
import OpenSubsonicLogo from '/@/renderer/features/servers/assets/opensubsonic.png';
import { CollapsedSidebarButton } from '/@/renderer/features/sidebar/components/collapsed-sidebar-button';
import { CollapsedSidebarItem } from '/@/renderer/features/sidebar/components/collapsed-sidebar-item';
import { ServerSelectorItems } from '/@/renderer/features/sidebar/components/server-selector-items';
import { getCollectionTo } from '/@/renderer/features/sidebar/components/sidebar-collection-list';
import { SidebarIcon } from '/@/renderer/features/sidebar/components/sidebar-icon';
import { AppMenu } from '/@/renderer/features/titlebar/components/app-menu';
import { AppRoute } from '/@/renderer/router/routes';
import { useCollections, useCurrentServer, useSidebarCollapsedNavigation, useSidebarItems, useWindowSettings, } from '/@/renderer/store';
import { DropdownMenu } from '/@/shared/components/dropdown-menu/dropdown-menu';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Stack } from '/@/shared/components/stack/stack';
import { LibraryItem, ServerType } from '/@/shared/types/domain-types';
import { Platform } from '/@/shared/types/types';
export const CollapsedSidebar = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const collections = useCollections();
    const { windowBarStyle } = useWindowSettings();
    const sidebarCollapsedNavigation = useSidebarCollapsedNavigation();
    const sidebarItems = useSidebarItems();
    const currentServer = useCurrentServer();
    const translatedSidebarItemMap = useMemo(() => ({
        Albums: t('page.sidebar.albums', { postProcess: 'titleCase' }),
        Artists: t('page.sidebar.albumArtists', { postProcess: 'titleCase' }).replace(' ', '\n'),
        'Artists-all': t('page.sidebar.artists', { postProcess: 'titleCase' }),
        Collections: t('page.sidebar.collections', { postProcess: 'titleCase' }),
        Favorites: t('page.sidebar.favorites', { postProcess: 'titleCase' }),
        Folders: t('page.sidebar.folders', { postProcess: 'titleCase' }),
        Genres: t('page.sidebar.genres', { postProcess: 'titleCase' }),
        Home: t('page.sidebar.home', { postProcess: 'titleCase' }),
        'Now Playing': t('page.sidebar.nowPlaying', { postProcess: 'titleCase' }),
        Playlists: t('page.sidebar.playlists', { postProcess: 'titleCase' }),
        Radio: t('page.sidebar.radio', { postProcess: 'titleCase' }),
        Search: t('page.sidebar.search', { postProcess: 'titleCase' }),
        Settings: t('page.sidebar.settings', { postProcess: 'titleCase' }),
        Tracks: t('page.sidebar.tracks', { postProcess: 'titleCase' }),
    }), [t]);
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
    return (_jsx(motion.div, { className: clsx({
            [styles.linux]: windowBarStyle === Platform.LINUX,
            [styles.sidebarContainer]: true,
            [styles.web]: windowBarStyle === Platform.WEB,
        }), children: _jsxs(ScrollArea, { children: [sidebarCollapsedNavigation && (_jsxs(Group, { gap: 0, grow: true, children: [_jsx(CollapsedSidebarButton, { "aria-label": "Go back", onClick: () => navigate(-1), children: _jsx(Icon, { icon: "arrowLeftS", size: "2xl" }) }), _jsx(CollapsedSidebarButton, { "aria-label": "Go forward", onClick: () => navigate(1), children: _jsx(Icon, { icon: "arrowRightS", size: "2xl" }) })] })), _jsxs(DropdownMenu, { position: "right-start", children: [_jsx(DropdownMenu.Target, { children: _jsx(CollapsedSidebarItem, { activeIcon: null, component: Flex, icon: _jsx("img", { alt: "Samo", src: samoLogo, style: { height: 40, objectFit: 'contain', width: 40 } }), label: t('common.menu', { postProcess: 'titleCase' }), style: {
                                    cursor: 'pointer',
                                    minHeight: '4.25rem',
                                    padding: 'var(--theme-spacing-lg) 0',
                                } }) }), _jsx(DropdownMenu.Dropdown, { children: _jsx(AppMenu, {}) })] }), sidebarItemsWithRoute.map((item) => item.id === 'Collections' ? (collections && collections.length > 0 ? (_jsxs(DropdownMenu, { offset: 0, position: "right-end", children: [_jsx(DropdownMenu.Target, { children: _jsx(CollapsedSidebarItem, { activeIcon: null, component: Flex, icon: _jsx(Icon, { color: "muted", icon: "collection", size: "3xl" }), label: item.label, style: {
                                    cursor: 'pointer',
                                    padding: 'var(--theme-spacing-md) 0',
                                } }) }), _jsx(DropdownMenu.Dropdown, { children: _jsx(ScrollArea, { style: { maxHeight: '50vh' }, children: _jsx(Stack, { gap: 0, p: "xs", children: collections.map((collection) => {
                                        const to = getCollectionTo(collection);
                                        return (_jsx(DropdownMenu.Item, { component: Link, leftSection: _jsx(SidebarIcon, { route: collection.type ===
                                                    LibraryItem.ALBUM
                                                    ? AppRoute.LIBRARY_ALBUMS
                                                    : AppRoute.LIBRARY_SONGS }), to: to, children: collection.name }, collection.id));
                                    }) }) }) })] }, item.id)) : null) : (_jsx(CollapsedSidebarItem, { activeIcon: _jsx(SidebarIcon, { active: true, route: item.route, size: "25" }), component: NavLink, icon: _jsx(SidebarIcon, { route: item.route, size: "25" }), label: item.label, route: item.route, to: item.route }, item.id))), currentServer && (_jsxs(DropdownMenu, { offset: 0, position: "right-end", width: 240, children: [_jsx(DropdownMenu.Target, { children: _jsx(CollapsedSidebarItem, { activeIcon: null, component: Flex, icon: _jsx("img", { className: styles.serverIcon, src: currentServer.type === ServerType.NAVIDROME
                                        ? NavidromeLogo
                                        : currentServer.type === ServerType.JELLYFIN
                                            ? JellyfinLogo
                                            : OpenSubsonicLogo }), label: '', py: "md", style: {
                                    cursor: 'pointer',
                                } }) }), _jsx(DropdownMenu.Dropdown, { children: _jsx(ScrollArea, { style: { maxHeight: '95vh' }, children: _jsx(ServerSelectorItems, {}) }) })] }))] }) }));
};
