import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { openModal } from '@mantine/modals';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { isServerLock } from '/@/renderer/features/action-required/utils/window-properties';
import { Command, CommandPalettePages } from '/@/renderer/features/search/components/command';
import { ServerList } from '/@/renderer/features/servers/components/server-list';
import { AppRoute } from '/@/renderer/router/routes';
import { useAuthStoreActions, useServerList } from '/@/renderer/store';
export const ServerCommands = ({ handleClose, setPages, setQuery }) => {
    const { t } = useTranslation();
    const serverList = useServerList();
    const navigate = useNavigate();
    const { setCurrentServer } = useAuthStoreActions();
    const handleManageServersModal = useCallback(() => {
        openModal({
            children: _jsx(ServerList, {}),
            title: t('page.appMenu.manageServers', { postProcess: 'sentenceCase' }),
        });
        handleClose();
        setQuery('');
        setPages([CommandPalettePages.HOME]);
    }, [handleClose, setPages, setQuery, t]);
    const handleSelectServer = useCallback((server) => {
        navigate(AppRoute.HOME);
        setCurrentServer(server);
        handleClose();
        setQuery('');
        setPages([CommandPalettePages.HOME]);
    }, [handleClose, navigate, setCurrentServer, setPages, setQuery]);
    return (_jsxs(_Fragment, { children: [_jsx(Command.Group, { heading: t('page.appMenu.selectServer', { postProcess: 'sentenceCase' }), children: Object.keys(serverList).map((key) => (_jsx(Command.Item, { onSelect: () => handleSelectServer(serverList[key]), children: `${serverList[key].name}...` }, key))) }), !isServerLock() && (_jsx(Command.Group, { heading: t('common.manage', { postProcess: 'sentenceCase' }), children: _jsxs(Command.Item, { onSelect: handleManageServersModal, children: [t('page.appMenu.manageServers', { postProcess: 'sentenceCase' }), "..."] }) })), _jsx(Command.Separator, {})] }));
};
