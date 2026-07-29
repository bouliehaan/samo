import { openModal } from '@mantine/modals';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import SamoLogo from '../../../../../build/samologo.svg';

import { isServerLock } from '/@/renderer/features/action-required/utils/window-properties';
import { ServerList } from '/@/renderer/features/servers/components/server-list';
import { sharedQueries } from '/@/renderer/features/shared/api/shared-api';
import { AppRoute } from '/@/renderer/router/routes';
import { useAuthStoreActions, useCurrentServer, useServerList } from '/@/renderer/store';
import { DropdownMenu } from '/@/shared/components/dropdown-menu/dropdown-menu';
import { Icon } from '/@/shared/components/icon/icon';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

export const ServerSelectorItems = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const currentServer = useCurrentServer();
    const serverList = useServerList();
    const { setCurrentServer, setMusicFolderId } = useAuthStoreActions();

    const { data: musicFolders } = useQuery(
        currentServer
            ? sharedQueries.musicFolders({ query: null, serverId: currentServer.id })
            : { enabled: false, queryKey: ['disabled'] },
    );

    const handleSetCurrentServer = (server: ServerListItemWithCredential) => {
        navigate(AppRoute.HOME);
        setCurrentServer(server);
        setMusicFolderId(undefined);
    };

    const queryClient = useQueryClient();

    const handleToggleMusicFolder = (musicFolderId: string) => {
        const currentIds = currentServer.musicFolderId || [];

        if (currentIds.includes(musicFolderId)) {
            const newIds = currentIds.filter((id) => id !== musicFolderId);
            setMusicFolderId(newIds.length > 0 ? newIds : undefined);
        } else {
            setMusicFolderId([...currentIds, musicFolderId]);
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

    const selectedMusicFolders =
        musicFolders?.items.filter((folder) => currentServer.musicFolderId?.includes(folder.id)) ||
        [];

    const handleManageServersModal = () => {
        openModal({
            children: <ServerList />,
            title: t('page.manageServers.title', { postProcess: 'titleCase' }),
        });
    };

    return (
        <>
            <DropdownMenu.Label>
                {t('page.appMenu.selectServer', { postProcess: 'titleCase' })}
            </DropdownMenu.Label>
            {Object.values(serverList).map((server) => {
                const isSessionExpired = !server.credential;
                const logo = SamoLogo;

                return (
                    <DropdownMenu.Item
                        isSelected={currentServer?.id === server.id}
                        key={`server-${server.id}`}
                        leftSection={<img src={logo} style={{ height: '1rem', width: '1rem' }} />}
                        onClick={() => {
                            if (!isSessionExpired) {
                                handleSetCurrentServer(server);
                            }
                        }}
                    >
                        {server.name}
                    </DropdownMenu.Item>
                );
            })}
            {!isServerLock() && (
                <DropdownMenu.Item
                    leftSection={<Icon icon="edit" />}
                    onClick={handleManageServersModal}
                >
                    {t('page.appMenu.manageServers', { postProcess: 'sentenceCase' })}
                </DropdownMenu.Item>
            )}
            {musicFolders && musicFolders.items.length > 0 && (
                <>
                    <DropdownMenu.Divider />
                    <DropdownMenu.Label>
                        {t('page.appMenu.selectMusicFolder', { postProcess: 'sentenceCase' })}
                    </DropdownMenu.Label>
                    <DropdownMenu.Item
                        isSelected={selectedMusicFolders.length === 0}
                        leftSection={<Icon icon="minus" />}
                        onClick={handleClearMusicFolders}
                    >
                        {t('common.none', { postProcess: 'titleCase' })}
                    </DropdownMenu.Item>
                    {musicFolders.items.map((folder) => {
                        const isSelected =
                            currentServer.musicFolderId?.includes(folder.id) || false;
                        return (
                            <DropdownMenu.Item
                                isSelected={isSelected}
                                key={`musicFolder-${folder.id}`}
                                leftSection={<Icon icon={isSelected ? 'check' : 'folder'} />}
                                onClick={() => handleToggleMusicFolder(folder.id)}
                            >
                                {folder.name}
                            </DropdownMenu.Item>
                        );
                    })}
                </>
            )}
        </>
    );
};
