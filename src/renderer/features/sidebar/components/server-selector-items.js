import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { openModal } from '@mantine/modals';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { isServerLock } from '/@/renderer/features/action-required/utils/window-properties';
import JellyfinLogo from '/@/renderer/features/servers/assets/jellyfin.png';
import NavidromeLogo from '/@/renderer/features/servers/assets/navidrome.png';
import OpenSubsonicLogo from '/@/renderer/features/servers/assets/opensubsonic.png';
import { ServerList } from '/@/renderer/features/servers/components/server-list';
import { sharedQueries } from '/@/renderer/features/shared/api/shared-api';
import { AppRoute } from '/@/renderer/router/routes';
import { useAuthStoreActions, useCurrentServer, useServerList } from '/@/renderer/store';
import { hasFeature } from '/@/shared/api/utils';
import { DropdownMenu } from '/@/shared/components/dropdown-menu/dropdown-menu';
import { Icon } from '/@/shared/components/icon/icon';
import { ServerType } from '/@/shared/types/domain-types';
import { ServerFeature } from '/@/shared/types/features-types';
export const ServerSelectorItems = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const currentServer = useCurrentServer();
    const serverList = useServerList();
    const { setCurrentServer, setMusicFolderId } = useAuthStoreActions();
    const { data: musicFolders } = useQuery(currentServer
        ? sharedQueries.musicFolders({ query: null, serverId: currentServer.id })
        : { enabled: false, queryKey: ['disabled'] });
    const handleSetCurrentServer = (server) => {
        navigate(AppRoute.HOME);
        setCurrentServer(server);
        setMusicFolderId(undefined);
    };
    const supportsMultiSelect = hasFeature(currentServer, ServerFeature.MUSIC_FOLDER_MULTISELECT);
    const queryClient = useQueryClient();
    const handleToggleMusicFolder = (musicFolderId) => {
        if (supportsMultiSelect) {
            const currentIds = currentServer.musicFolderId || [];
            const isSelected = currentIds.includes(musicFolderId);
            if (isSelected) {
                // Remove from selection
                const newIds = currentIds.filter((id) => id !== musicFolderId);
                setMusicFolderId(newIds.length > 0 ? newIds : undefined);
            }
            else {
                // Add to selection
                setMusicFolderId([...currentIds, musicFolderId]);
            }
        }
        else {
            const currentId = Array.isArray(currentServer.musicFolderId)
                ? currentServer.musicFolderId[0]
                : currentServer.musicFolderId;
            const isSelected = currentId === musicFolderId;
            if (isSelected) {
                setMusicFolderId(undefined);
            }
            else {
                setMusicFolderId([musicFolderId]);
            }
        }
        queryClient.removeQueries();
    };
    const handleClearMusicFolders = () => {
        setMusicFolderId(undefined);
        queryClient.removeQueries();
    };
    if (!currentServer) {
        return null;
    }
    const selectedMusicFolders = musicFolders?.items.filter((folder) => currentServer.musicFolderId?.includes(folder.id)) ||
        [];
    const handleManageServersModal = () => {
        openModal({
            children: _jsx(ServerList, {}),
            title: t('page.manageServers.title', { postProcess: 'titleCase' }),
        });
    };
    return (_jsxs(_Fragment, { children: [_jsx(DropdownMenu.Label, { children: t('page.appMenu.selectServer', { postProcess: 'titleCase' }) }), Object.values(serverList).map((server) => {
                const isNavidromeExpired = server.type === ServerType.NAVIDROME && !server.ndCredential;
                const isJellyfinExpired = server.type === ServerType.JELLYFIN && !server.credential;
                const isSessionExpired = isNavidromeExpired || isJellyfinExpired;
                const logo = server.type === ServerType.NAVIDROME
                    ? NavidromeLogo
                    : server.type === ServerType.JELLYFIN
                        ? JellyfinLogo
                        : OpenSubsonicLogo;
                return (_jsx(DropdownMenu.Item, { isSelected: currentServer?.id === server.id, leftSection: _jsx("img", { src: logo, style: { height: '1rem', width: '1rem' } }), onClick: () => {
                        if (!isSessionExpired) {
                            handleSetCurrentServer(server);
                        }
                    }, children: server.name }, `server-${server.id}`));
            }), !isServerLock() && (_jsx(DropdownMenu.Item, { leftSection: _jsx(Icon, { icon: "edit" }), onClick: handleManageServersModal, children: t('page.appMenu.manageServers', { postProcess: 'sentenceCase' }) })), musicFolders && musicFolders.items.length > 0 && (_jsxs(_Fragment, { children: [_jsx(DropdownMenu.Divider, {}), _jsx(DropdownMenu.Label, { children: t('page.appMenu.selectMusicFolder', { postProcess: 'sentenceCase' }) }), _jsx(DropdownMenu.Item, { isSelected: selectedMusicFolders.length === 0, leftSection: _jsx(Icon, { icon: "minus" }), onClick: handleClearMusicFolders, children: t('common.none', { postProcess: 'titleCase' }) }), musicFolders.items.map((folder) => {
                        const isSelected = supportsMultiSelect
                            ? currentServer.musicFolderId?.includes(folder.id) || false
                            : (Array.isArray(currentServer.musicFolderId)
                                ? currentServer.musicFolderId[0]
                                : currentServer.musicFolderId) === folder.id;
                        return (_jsx(DropdownMenu.Item, { isSelected: isSelected, leftSection: _jsx(Icon, { icon: isSelected ? 'check' : 'folder' }), onClick: () => handleToggleMusicFolder(folder.id), children: folder.name }, `musicFolder-${folder.id}`));
                    })] }))] }));
};
