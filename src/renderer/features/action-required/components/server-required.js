import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { closeAllModals, openModal } from '@mantine/modals';
import isElectron from 'is-electron';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { isServerLock } from '/@/renderer/features/action-required/utils/window-properties';
import JellyfinLogo from '/@/renderer/features/servers/assets/jellyfin.png';
import NavidromeLogo from '/@/renderer/features/servers/assets/navidrome.png';
import OpenSubsonicLogo from '/@/renderer/features/servers/assets/opensubsonic.png';
import { AddServerForm } from '/@/renderer/features/servers/components/add-server-form';
import { EditServerForm } from '/@/renderer/features/servers/components/edit-server-form';
import { AppRoute } from '/@/renderer/router/routes';
import { useAuthStoreActions, useCurrentServer, useServerList } from '/@/renderer/store';
import { Button } from '/@/shared/components/button/button';
import { Divider } from '/@/shared/components/divider/divider';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { logFn } from '/@/renderer/utils/logger';
import { ServerType, } from '/@/shared/types/domain-types';
const localSettings = isElectron() ? window.api.localSettings : null;
export const ServerRequired = ({ isWizard = false, onWizardExit }) => {
    const serverList = useServerList();
    if (isWizard) {
        return _jsx(SetupWizard, { onExit: onWizardExit ?? (() => { }) });
    }
    if (Object.keys(serverList).length > 0) {
        return (_jsx(ScrollArea, { children: _jsxs(Stack, { miw: "300px", children: [_jsx(ServerSelector, {}), !isServerLock() && (_jsxs(_Fragment, { children: [_jsx(Divider, { my: "lg" }), _jsx(AddServerForm, { onCancel: null })] }))] }) }));
    }
    return _jsx(AddServerForm, { onCancel: null });
};
function ServerSelector() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const serverList = useServerList();
    const currentServer = useCurrentServer();
    const { setCurrentServer } = useAuthStoreActions();
    const handleSetCurrentServer = (server) => {
        setCurrentServer(server);
        navigate(AppRoute.HOME, { replace: true });
    };
    const handleCredentialsModal = async (server) => {
        let password = null;
        try {
            if (localSettings && server.savePassword) {
                password = await localSettings.passwordGet(server.id);
            }
        }
        catch (error) {
            logFn.error(error instanceof Error ? error.message : String(error), { meta: { error: error } });
        }
        openModal({
            children: server && (_jsx(EditServerForm, { isUpdate: true, onCancel: closeAllModals, password: password, server: server })),
            size: 'sm',
            title: t('form.updateServer.title', { postProcess: 'titleCase' }),
        });
    };
    return (_jsx(_Fragment, { children: Object.keys(serverList).map((serverId) => {
            const server = serverList[serverId];
            const isNavidromeExpired = server.type === ServerType.NAVIDROME && !server.ndCredential;
            const isJellyfinExpired = server.type === ServerType.JELLYFIN && !server.credential;
            const isSessionExpired = isNavidromeExpired || isJellyfinExpired;
            const logo = server.type === ServerType.NAVIDROME
                ? NavidromeLogo
                : server.type === ServerType.JELLYFIN
                    ? JellyfinLogo
                    : OpenSubsonicLogo;
            return (_jsx(Button, { onClick: () => {
                    if (!isSessionExpired)
                        return handleSetCurrentServer(server);
                    return handleCredentialsModal(server);
                }, size: "lg", styles: {
                    label: {
                        width: '100%',
                    },
                    root: {
                        padding: 'var(--theme-spacing-sm)',
                    },
                }, variant: server.id === currentServer?.id ? 'filled' : 'default', children: _jsxs(Group, { justify: "space-between", w: "100%", children: [_jsxs(Group, { children: [_jsx("img", { src: logo, style: {
                                        height: 'var(--theme-font-size-2xl)',
                                        width: 'var(--theme-font-size-2xl)',
                                    } }), _jsx(Text, { fw: 600, size: "lg", children: server.name })] }), isSessionExpired ? _jsx(Icon, { icon: "lock" }) : _jsx(Icon, { icon: "arrowRight" })] }) }, `server-${server.id}`));
        }) }));
}
function SetupWizard({ onExit }) {
    const { t } = useTranslation();
    const [step, setStep] = useState('addFirst');
    const [formKey, setFormKey] = useState(0);
    const [lastAddedName, setLastAddedName] = useState(null);
    const handleSubmitSuccess = (server) => {
        setLastAddedName(server.name);
        setStep('prompt');
    };
    const handleAddAnother = () => {
        setFormKey((key) => key + 1);
        setStep('addAnother');
    };
    const handleBackToPrompt = () => {
        setStep('prompt');
    };
    if (step === 'addFirst') {
        return (_jsx(AddServerForm, { onCancel: null, onSubmitSuccess: handleSubmitSuccess }, formKey));
    }
    if (step === 'addAnother') {
        return (_jsx(AddServerForm, { initialServerType: ServerType.AUDIOBOOKSHELF, onCancel: handleBackToPrompt, onSubmitSuccess: handleSubmitSuccess }, formKey));
    }
    return (_jsxs(Stack, { gap: "md", miw: "300px", children: [_jsx(Text, { size: "md", children: lastAddedName
                    ? t('form.addServer.wizardPromptNamed', {
                        defaultValue: '"{{name}}" added. Want to add another server?',
                        name: lastAddedName,
                    })
                    : t('form.addServer.wizardPrompt', {
                        defaultValue: 'Server added. Want to add another server?',
                    }) }), _jsxs(Group, { children: [_jsx(Button, { leftSection: _jsx(Icon, { icon: "add" }), onClick: handleAddAnother, children: t('form.addServer.wizardAddAnother', {
                            defaultValue: 'Add another server',
                        }) }), _jsx(Button, { onClick: onExit, variant: "filled", children: t('form.addServer.wizardFinish', {
                            defaultValue: 'Continue',
                        }) })] })] }));
}
