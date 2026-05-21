import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import styles from './server-selector.module.css';
import JellyfinLogo from '/@/renderer/features/servers/assets/jellyfin.png';
import NavidromeLogo from '/@/renderer/features/servers/assets/navidrome.png';
import OpenSubsonicLogo from '/@/renderer/features/servers/assets/opensubsonic.png';
import { sharedQueries } from '/@/renderer/features/shared/api/shared-api';
import { ServerSelectorItems } from '/@/renderer/features/sidebar/components/server-selector-items';
import { useCurrentServer } from '/@/renderer/store';
import { hasFeature } from '/@/shared/api/utils';
import { Box } from '/@/shared/components/box/box';
import { DropdownMenu } from '/@/shared/components/dropdown-menu/dropdown-menu';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { ServerType } from '/@/shared/types/domain-types';
import { ServerFeature } from '/@/shared/types/features-types';
export const ServerSelector = () => {
    const { t } = useTranslation();
    const currentServer = useCurrentServer();
    const { data: musicFolders } = useQuery(currentServer
        ? sharedQueries.musicFolders({ query: null, serverId: currentServer.id })
        : { enabled: false, queryKey: ['disabled'] });
    if (!currentServer) {
        return null;
    }
    const supportsMultiSelect = hasFeature(currentServer, ServerFeature.MUSIC_FOLDER_MULTISELECT);
    const selectedMusicFolders = musicFolders?.items.filter((folder) => currentServer.musicFolderId?.includes(folder.id)) ||
        [];
    const musicFolderDisplayText = (() => {
        if (selectedMusicFolders.length === 0) {
            return t('page.appMenu.noMusicFolder', { postProcess: 'sentenceCase' });
        }
        if (supportsMultiSelect && selectedMusicFolders.length > 1) {
            return t('page.appMenu.multipleMusicFolders', {
                count: selectedMusicFolders.length,
                postProcess: 'sentenceCase',
            });
        }
        return selectedMusicFolders[0].name;
    })();
    const logo = currentServer.type === ServerType.NAVIDROME
        ? NavidromeLogo
        : currentServer.type === ServerType.JELLYFIN
            ? JellyfinLogo
            : OpenSubsonicLogo;
    return (_jsxs(DropdownMenu, { offset: 0, position: "right-start", withinPortal: false, children: [_jsx(DropdownMenu.Target, { children: _jsx("div", { className: styles.popoverTarget, children: _jsx(Box, { className: styles.buttonContainer, children: _jsxs(Group, { className: styles.buttonGroup, gap: "sm", children: [_jsx("img", { className: styles.logo, src: logo }), _jsxs(Stack, { className: styles.buttonStack, gap: 2, children: [_jsx(Text, { fw: 600, size: "sm", truncate: true, children: currentServer.name }), _jsx(Text, { isMuted: true, size: "xs", truncate: true, children: musicFolderDisplayText })] }), _jsx(Icon, { icon: "ellipsisVertical", size: "sm" })] }) }) }) }), _jsx(DropdownMenu.Dropdown, { miw: "16rem", children: _jsx(ScrollArea, { className: styles.scrollArea, children: _jsx(ServerSelectorItems, {}) }) })] }));
};
