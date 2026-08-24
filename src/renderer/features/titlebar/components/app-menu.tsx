import { openModal } from '@mantine/modals';
import { useQueryClient } from '@tanstack/react-query';
import isElectron from 'is-electron';
import { Fragment, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

import { isServerLock } from '/@/renderer/features/action-required/utils/window-properties';
import { ServerList } from '/@/renderer/features/servers/components/server-list';
import { openSettingsModal } from '/@/renderer/features/settings/utils/open-settings-modal';
import { emitAllItemListRefresh } from '/@/renderer/features/shared/components/list-refresh-button';
import { useAppStore, useAppStoreActions } from '/@/renderer/store';
import { DropdownMenu, MenuItemProps } from '/@/shared/components/dropdown-menu/dropdown-menu';
import { Icon } from '/@/shared/components/icon/icon';
import { toast } from '/@/shared/components/toast/toast';

const browser = isElectron() ? window.api.browser : null;

interface BaseMenuItem {
    id: string;
    type: 'conditional-group' | 'conditional-item' | 'custom' | 'divider' | 'item';
}

interface ConditionalGroupItem extends BaseMenuItem {
    condition: boolean;
    items: MenuItem[];
    type: 'conditional-group';
}

interface ConditionalItem extends BaseMenuItem {
    condition: boolean;
    item: Omit<MenuItem, 'id' | 'type'>;
    type: 'conditional-item';
}

interface CustomItem extends BaseMenuItem {
    component: ReactNode;
    type: 'custom';
}

interface DividerItem extends BaseMenuItem {
    type: 'divider';
}

type MenuItem = ConditionalGroupItem | ConditionalItem | CustomItem | DividerItem | RegularMenuItem;

interface RegularMenuItem extends BaseMenuItem {
    component?: 'a' | typeof Link;
    href?: string;
    icon?: keyof typeof import('/@/shared/components/icon/icon').AppIcon;
    iconColor?:
        | 'contrast'
        | 'default'
        | 'error'
        | 'info'
        | 'inherit'
        | 'muted'
        | 'primary'
        | 'success'
        | 'warn';
    label: string;
    leftSection?: ReactNode;
    onClick?: () => void;
    rightSection?: ReactNode;
    target?: string;
    to?: string;
    type: 'item';
}

export const AppMenu = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const collapsed = useAppStore((state) => state.sidebar.collapsed);
    const privateMode = useAppStore((state) => state.privateMode);
    const { setPrivateMode, setSideBar } = useAppStoreActions();

    const handleCollapseSidebar = () => {
        setSideBar({ collapsed: true });
    };

    const handleExpandSidebar = () => {
        setSideBar({ collapsed: false });
    };

    const handlePrivateModeOff = () => {
        setPrivateMode(false);
        toast.info({
            message: t('form.privateMode.disabled', { postProcess: 'sentenceCase' }),
            title: t('form.privateMode.title', { postProcess: 'sentenceCase' }),
        });
    };

    const handlePrivateModeOn = () => {
        setPrivateMode(true);
        toast.info({
            message: t('form.privateMode.enabled', { postProcess: 'sentenceCase' }),
            title: t('form.privateMode.title', { postProcess: 'sentenceCase' }),
        });
    };

    const handleManageServersModal = () => {
        openModal({
            children: <ServerList />,
            title: t('page.manageServers.title', { postProcess: 'titleCase' }),
        });
    };

    const handleSyncWithServer = () => {
        // Subtle, mac-native toast: no color stripe, no title, no close button.
        const syncingId = toast.show({
            autoClose: false,
            color: 'transparent',
            message: t('page.appMenu.syncWithServerInProgress', {
                postProcess: 'sentenceCase',
            }),
            title: '',
            withCloseButton: false,
        });

        // Double rAF: menu close + toast must paint on the next frame BEFORE we kick off
        // invalidateQueries. Single rAF runs before the same frame's paint; double rAF
        // guarantees the previous frame fully painted, so reconciliation never blocks
        // the visual response to the click.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                void (async () => {
                    try {
                        // Data only. This used to follow the invalidation with
                        // `browser.clearCache()`, which empties Chromium's whole
                        // HTTP cache — every cover the app has ever painted, and
                        // the sections the outlet keeps mounted repaint by
                        // re-downloading and re-decoding originals. That single
                        // call was most of what made a desktop sync take so much
                        // longer than the phone's, which deliberately keeps its
                        // artwork on disk for exactly this reason.
                        //
                        // Nothing here needs it: every artwork URL now names the
                        // bytes behind it. Metadata images are addressed by an id
                        // that changes with the art, and the one URL that did not
                        // — the composited playlist grid — carries the playlist's
                        // updatedAt (samoPlaylistCoverVersion). Settings → Cache
                        // still clears the lot by hand.
                        await queryClient.invalidateQueries();
                        // The lists on screen hold their rows outside the
                        // queries that fetched them, so invalidation alone
                        // cannot move them. Say it directly.
                        emitAllItemListRefresh();

                        toast.hide(syncingId);
                        toast.show({
                            autoClose: 2000,
                            color: 'transparent',
                            message: t('page.appMenu.syncWithServerSuccess', {
                                postProcess: 'sentenceCase',
                            }),
                            title: '',
                            withCloseButton: false,
                        });
                    } catch (error) {
                        toast.hide(syncingId);
                        toast.error({ message: (error as Error).message });
                    }
                })();
            });
        });
    };

    const handleQuit = () => {
        browser?.quit();
    };

    const menuConfig: MenuItem[] = [
        {
            condition: collapsed,
            id: 'navigation-group',
            items: [
                {
                    icon: 'arrowLeftS',
                    id: 'go-back',
                    label: t('page.appMenu.goBack', { postProcess: 'sentenceCase' }),
                    onClick: () => navigate(-1),
                    type: 'item',
                },
                {
                    icon: 'arrowRightS',
                    id: 'go-forward',
                    label: t('page.appMenu.goForward', { postProcess: 'sentenceCase' }),
                    onClick: () => navigate(1),
                    type: 'item',
                },
            ],
            type: 'conditional-group',
        },
        {
            condition: collapsed,
            id: 'sidebar-expand',
            item: {
                icon: 'panelRightOpen',
                id: 'expand-sidebar',
                label: t('page.appMenu.expandSidebar', { postProcess: 'sentenceCase' }),
                onClick: handleExpandSidebar,
                type: 'item',
            },
            type: 'conditional-item',
        },
        {
            condition: !collapsed,
            id: 'sidebar-collapse',
            item: {
                icon: 'panelRightClose',
                id: 'collapse-sidebar',
                label: t('page.appMenu.collapseSidebar', { postProcess: 'sentenceCase' }),
                onClick: handleCollapseSidebar,
                type: 'item',
            },
            type: 'conditional-item',
        },
        {
            id: 'divider-2',
            type: 'divider',
        },
        {
            icon: 'refresh',
            id: 'sync-with-server',
            label: t('page.appMenu.syncWithServer', { postProcess: 'sentenceCase' }),
            onClick: handleSyncWithServer,
            type: 'item',
        },
        {
            condition: !isServerLock(),
            id: 'manage-servers',
            item: {
                label: t('page.appMenu.manageServers', { postProcess: 'sentenceCase' }),
                leftSection: <Icon icon="edit" />,
                onClick: handleManageServersModal,
                type: 'item',
            },
            type: 'conditional-item',
        },
        {
            id: 'divider-3',
            type: 'divider',
        },
        {
            icon: 'settings',
            id: 'settings',
            label: t('page.appMenu.settings', { postProcess: 'sentenceCase' }),
            onClick: () => openSettingsModal(),
            type: 'item',
        },
        {
            condition: privateMode,
            id: 'private-mode-off',
            item: {
                icon: 'lock',
                iconColor: 'error',
                label: t('page.appMenu.privateModeOff', { postProcess: 'sentenceCase' }),
                onClick: handlePrivateModeOff,
                type: 'item',
            },
            type: 'conditional-item',
        },
        {
            condition: !privateMode,
            id: 'private-mode-on',
            item: {
                icon: 'lockOpen',
                label: t('page.appMenu.privateModeOn', { postProcess: 'sentenceCase' }),
                onClick: handlePrivateModeOn,
                type: 'item',
            },
            type: 'conditional-item',
        },
        {
            id: 'divider-4',
            type: 'divider',
        },
        {
            condition: isElectron(),
            id: 'quit',
            item: {
                icon: 'x',
                id: 'quit-app',
                label: t('page.appMenu.quit', { postProcess: 'sentenceCase' }),
                onClick: handleQuit,
                type: 'item',
            },
            type: 'conditional-item',
        },
    ];

    const renderMenuItem = (item: MenuItem): ReactNode => {
        switch (item.type) {
            case 'conditional-group':
                if (!item.condition) return null;
                return (
                    <div key={item.id}>
                        {item.items.map((subItem) => {
                            return <Fragment key={subItem.id}>{renderMenuItem(subItem)}</Fragment>;
                        })}
                    </div>
                );

            case 'conditional-item':
                if (!item.condition) return null;
                return <Fragment key={item.id}>{renderMenuItem(item.item as MenuItem)}</Fragment>;

            case 'custom':
                return <div key={item.id}>{item.component}</div>;

            case 'divider':
                return <DropdownMenu.Divider key={item.id} />;

            case 'item': {
                const leftSection =
                    item.leftSection ||
                    (item.icon && <Icon color={item.iconColor} icon={item.icon} />);

                const props = {
                    leftSection,
                    ...(item.rightSection && { rightSection: item.rightSection }),
                    ...(item.onClick && { onClick: item.onClick }),
                    ...(item.component && { component: item.component }),
                    ...(item.to && { to: item.to }),
                    ...(item.href && { href: item.href }),
                    ...(item.target && { target: item.target }),
                } as MenuItemProps;

                return (
                    <DropdownMenu.Item key={item.id} {...props}>
                        {item.label}
                    </DropdownMenu.Item>
                );
            }

            default:
                return null;
        }
    };

    return <>{menuConfig.map((item) => renderMenuItem(item))}</>;
};
