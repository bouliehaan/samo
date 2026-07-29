import { openModal } from '@mantine/modals';
import isElectron from 'is-electron';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import packageJson from '../../../package.json';

import { ServerList } from '/@/renderer/features/servers/components/server-list';
import { openSettingsModal } from '/@/renderer/features/settings/utils/open-settings-modal';
import { openReleaseNotesModal } from '/@/renderer/release-notes-modal';
import {
    useAppStore,
    useAppStoreActions,
    useCommandPalette,
    usePlayerHydrated,
    usePlayerPlaybackControlsState,
} from '/@/renderer/store';
import { PlayerShuffle } from '/@/shared/types/types';

const playerState = isElectron() ? window.api.playerState : null;
const utils = isElectron() ? window.api.utils : null;

export const useNativeMenuSync = () => {
    const { t } = useTranslation();
    const privateMode = useAppStore((state) => state.privateMode);
    const sidebar = useAppStore((state) => state.sidebar);
    const { setPrivateMode, setSideBar } = useAppStoreActions();
    const { open: openCommandPalette } = useCommandPalette();
    const playerHydrated = usePlayerHydrated();
    const {
        repeat: playerRepeat,
        shuffle: playerShuffle,
        status: playerStatus,
    } = usePlayerPlaybackControlsState();

    useEffect(() => {
        return utils?.rendererOpenSettings(() => {
            openSettingsModal();
        });
    }, []);

    useEffect(() => {
        return utils?.rendererOpenCommandPalette(() => {
            openCommandPalette();
        });
    }, [openCommandPalette]);

    useEffect(() => {
        return utils?.rendererOpenManageServers(() => {
            openModal({
                children: <ServerList />,
                title: t('page.manageServers.title', { postProcess: 'titleCase' }),
            });
        });
    }, [t]);

    useEffect(() => {
        return utils?.rendererTogglePrivateMode(() => {
            setPrivateMode(!privateMode);
        });
    }, [privateMode, setPrivateMode]);

    useEffect(() => {
        return utils?.rendererToggleSidebar(() => {
            setSideBar({ collapsed: !sidebar.collapsed });
        });
    }, [setSideBar, sidebar.collapsed]);

    useEffect(() => {
        if (!playerHydrated) {
            return;
        }

        playerState?.updatePlayback(playerStatus);
        playerState?.updateRepeat(playerRepeat);
        playerState?.updateShuffle(playerShuffle !== PlayerShuffle.NONE);
    }, [playerHydrated, playerRepeat, playerShuffle, playerStatus]);

    useEffect(() => {
        playerState?.updatePrivateMode(privateMode);
    }, [privateMode]);

    useEffect(() => {
        playerState?.updateSidebarCollapsed(sidebar.collapsed);
    }, [sidebar.collapsed]);

    useEffect(() => {
        return utils?.rendererOpenReleaseNotes(() => {
            openReleaseNotesModal(
                t('common.newVersion', {
                    postProcess: 'sentenceCase',
                    version: packageJson.version,
                }) as string,
            );
        });
    }, [t]);
};
