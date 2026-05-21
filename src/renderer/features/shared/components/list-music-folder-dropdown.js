import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery } from '@tanstack/react-query';
import { sharedQueries } from '/@/renderer/features/shared/api/shared-api';
import { FolderButton } from '/@/renderer/features/shared/components/folder-button';
import { useMusicFolderIdFilter } from '/@/renderer/features/shared/hooks/use-music-folder-id-filter';
import { useCurrentServer } from '/@/renderer/store';
import { DropdownMenu } from '/@/shared/components/dropdown-menu/dropdown-menu';
export const ListMusicFolderDropdown = ({ listKey }) => {
    const server = useCurrentServer();
    const { data: musicFolders } = useQuery(sharedQueries.musicFolders({ query: null, serverId: server.id }));
    const { musicFolderId, setMusicFolderId } = useMusicFolderIdFilter('', listKey);
    const handleSetMusicFolder = (e) => {
        if (e === musicFolderId) {
            setMusicFolderId('');
            return;
        }
        setMusicFolderId(e);
    };
    return (_jsxs(DropdownMenu, { position: "bottom-start", children: [_jsx(DropdownMenu.Target, { children: _jsx(FolderButton, { isActive: !!musicFolderId }) }), _jsx(DropdownMenu.Dropdown, { children: musicFolders?.items.map((folder) => (_jsx(DropdownMenu.Item, { isSelected: musicFolderId === folder.id, onClick: () => handleSetMusicFolder(folder.id), value: folder.id, children: folder.name }, `musicFolder-${folder.id}`))) })] }));
};
