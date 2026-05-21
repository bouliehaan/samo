import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import isElectron from 'is-electron';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EditServerForm } from '/@/renderer/features/servers/components/edit-server-form';
import { ServerSection } from '/@/renderer/features/servers/components/server-section';
import { useAuthStoreActions } from '/@/renderer/store';
import { Button, TimeoutButton } from '/@/shared/components/button/button';
import { Divider } from '/@/shared/components/divider/divider';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Stack } from '/@/shared/components/stack/stack';
import { Table } from '/@/shared/components/table/table';
import { useDisclosure } from '/@/shared/hooks/use-disclosure';
import { logFn } from '/@/renderer/utils/logger';
const localSettings = isElectron() ? window.api.localSettings : null;
export const ServerListItem = ({ server }) => {
    const { t } = useTranslation();
    const [edit, editHandlers] = useDisclosure(false);
    const [savedPassword, setSavedPassword] = useState('');
    const { deleteServer } = useAuthStoreActions();
    const handleDeleteServer = () => {
        deleteServer(server.id);
        localSettings?.passwordRemove(server.id);
    };
    const handleEdit = useCallback(() => {
        if (!edit && localSettings && server.savePassword) {
            localSettings
                .passwordGet(server.id)
                .then((password) => {
                if (password) {
                    setSavedPassword(password);
                }
                else {
                    setSavedPassword('');
                }
                editHandlers.open();
                return null;
            })
                .catch((error) => {
                logFn.error(error instanceof Error ? error.message : String(error), { meta: { error: error } });
                setSavedPassword('');
                editHandlers.open();
            });
        }
        else {
            setSavedPassword('');
            editHandlers.open();
        }
    }, [edit, editHandlers, server.id, server.savePassword]);
    return (_jsxs(Stack, { children: [_jsx(ServerSection, { title: null, children: edit ? (_jsx(EditServerForm, { onCancel: () => editHandlers.toggle(), password: savedPassword, server: server })) : (_jsxs(Stack, { children: [_jsx(Table, { layout: "fixed", variant: "vertical", withTableBorder: true, children: _jsxs(Table.Tbody, { children: [_jsxs(Table.Tr, { children: [_jsx(Table.Th, { children: t('page.manageServers.url', {
                                                    postProcess: 'sentenceCase',
                                                }) }), _jsx(Table.Td, { children: server.url })] }), _jsxs(Table.Tr, { children: [_jsx(Table.Th, { children: t('page.manageServers.username', {
                                                    postProcess: 'sentenceCase',
                                                }) }), _jsx(Table.Td, { children: server.username })] })] }) }), _jsx(Group, { grow: true, children: _jsx(Button, { leftSection: _jsx(Icon, { icon: "edit" }), onClick: () => handleEdit(), tooltip: {
                                    label: t('page.manageServers.editServerDetailsTooltip', {
                                        postProcess: 'sentenceCase',
                                    }),
                                }, children: t('common.edit', { postProcess: 'titleCase' }) }) })] })) }), _jsx(Divider, { my: "sm" }), _jsx(TimeoutButton, { leftSection: _jsx(Icon, { icon: "delete" }), timeoutProps: { callback: handleDeleteServer, duration: 1000 }, variant: "state-error", children: t('page.manageServers.removeServer', { postProcess: 'sentenceCase' }) })] }));
};
