import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { openModal } from '@mantine/modals';
import { useQueryClient } from '@tanstack/react-query';
import isElectron from 'is-electron';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { isServerLock } from '/@/renderer/features/action-required/utils/window-properties';
import { ServerList } from '/@/renderer/features/servers/components/server-list';
import { openSettingsModal } from '/@/renderer/features/settings/utils/open-settings-modal';
import { useAppStore, useAppStoreActions } from '/@/renderer/store';
import { DropdownMenu } from '/@/shared/components/dropdown-menu/dropdown-menu';
import { Icon } from '/@/shared/components/icon/icon';
import { toast } from '/@/shared/components/toast/toast';
const browser = isElectron() ? window.api.browser : null;
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
            children: _jsx(ServerList, {}),
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
                        await queryClient.invalidateQueries();
                        await browser?.clearCache();
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
                    }
                    catch (error) {
                        toast.hide(syncingId);
                        toast.error({ message: error.message });
                    }
                })();
            });
        });
    };
    const handleQuit = () => {
        browser?.quit();
    };
    const menuConfig = [
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
                leftSection: _jsx(Icon, { icon: "edit" }),
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
    const renderMenuItem = (item) => {
        switch (item.type) {
            case 'conditional-group':
                if (!item.condition)
                    return null;
                return (_jsx("div", { children: item.items.map((subItem) => {
                        return _jsx(Fragment, { children: renderMenuItem(subItem) }, subItem.id);
                    }) }, item.id));
            case 'conditional-item':
                if (!item.condition)
                    return null;
                return _jsx(Fragment, { children: renderMenuItem(item.item) }, item.id);
            case 'custom':
                return _jsx("div", { children: item.component }, item.id);
            case 'divider':
                return _jsx(DropdownMenu.Divider, {}, item.id);
            case 'item': {
                const leftSection = item.leftSection ||
                    (item.icon && _jsx(Icon, { color: item.iconColor, icon: item.icon }));
                const props = {
                    leftSection,
                    ...(item.rightSection && { rightSection: item.rightSection }),
                    ...(item.onClick && { onClick: item.onClick }),
                    ...(item.component && { component: item.component }),
                    ...(item.to && { to: item.to }),
                    ...(item.href && { href: item.href }),
                    ...(item.target && { target: item.target }),
                };
                return (_jsx(DropdownMenu.Item, { ...props, children: item.label }, item.id));
            }
            default:
                return null;
        }
    };
    return _jsx(_Fragment, { children: menuConfig.map((item) => renderMenuItem(item)) });
};
