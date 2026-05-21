import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { openContextModal } from '@mantine/modals';
import isElectron from 'is-electron';
import { useTranslation } from 'react-i18next';
import AudiobookshelfLogo from '../../../../../assets/icons/audiobookshelf.svg';
import { isServerLock } from '/@/renderer/features/action-required/utils/window-properties';
import JellyfinLogo from '/@/renderer/features/servers/assets/jellyfin.png';
import NavidromeLogo from '/@/renderer/features/servers/assets/navidrome.png';
import OpenSubsonicLogo from '/@/renderer/features/servers/assets/opensubsonic.png';
import { AddServerForm } from '/@/renderer/features/servers/components/add-server-form';
import { IgnoreCorsSslSwitches } from '/@/renderer/features/servers/components/ignore-cors-ssl-switches';
import { ServerListItem } from '/@/renderer/features/servers/components/server-list-item';
import { useCurrentServer, useServerList } from '/@/renderer/store';
import { Accordion } from '/@/shared/components/accordion/accordion';
import { Button } from '/@/shared/components/button/button';
import { Divider } from '/@/shared/components/divider/divider';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { ServerType } from '/@/shared/types/domain-types';
export const ServerList = () => {
    const { t } = useTranslation();
    const currentServer = useCurrentServer();
    const serverListQuery = useServerList();
    const serverLock = isServerLock();
    const handleAddServerModal = () => {
        openContextModal({
            innerProps: {
                modalBody: (vars) => (_jsx(AddServerForm, { onCancel: () => vars.context.closeModal(vars.id) })),
            },
            modal: 'base',
            title: t('form.addServer.title', { postProcess: 'titleCase' }),
        });
    };
    return (_jsx(_Fragment, { children: _jsxs(Stack, { children: [_jsxs(Accordion, { variant: "separated", children: [Object.keys(serverListQuery)?.map((serverId) => {
                            const server = serverListQuery[serverId];
                            return (_jsxs(Accordion.Item, { value: server.name, children: [_jsx(Accordion.Control, { children: _jsxs(Group, { children: [_jsx("img", { src: server.type === ServerType.NAVIDROME
                                                        ? NavidromeLogo
                                                        : server.type === ServerType.JELLYFIN
                                                            ? JellyfinLogo
                                                            : server.type === ServerType.AUDIOBOOKSHELF
                                                                ? AudiobookshelfLogo
                                                                : OpenSubsonicLogo, style: {
                                                        height: 'var(--theme-font-size-lg)',
                                                        width: 'var(--theme-font-size-lg)',
                                                    } }), _jsx(Text, { fw: server.id === currentServer?.id ? 600 : 400, children: server?.name })] }) }), _jsx(Accordion.Panel, { children: _jsx(ServerListItem, { server: server }) })] }, server.id));
                        }), !serverLock && (_jsx(Group, { grow: true, pt: "md", children: _jsx(Button, { autoFocus: true, leftSection: _jsx(Icon, { icon: "add" }), onClick: handleAddServerModal, children: t('form.addServer.title', { postProcess: 'titleCase' }) }) }))] }), isElectron() && (_jsxs(_Fragment, { children: [_jsx(Divider, {}), _jsx(IgnoreCorsSslSwitches, {})] }))] }) }));
};
