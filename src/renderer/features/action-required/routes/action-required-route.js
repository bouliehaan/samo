import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { openModal } from '@mantine/modals';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';
import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { ActionRequiredContainer } from '/@/renderer/features/action-required/components/action-required-container';
import { ServerCredentialRequired } from '/@/renderer/features/action-required/components/server-credential-required';
import { ServerRequired } from '/@/renderer/features/action-required/components/server-required';
import { isServerLock } from '/@/renderer/features/action-required/utils/window-properties';
import LoginRoute from '/@/renderer/features/login/routes/login-route';
import { ServerList } from '/@/renderer/features/servers/components/server-list';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { AppRoute } from '/@/renderer/router/routes';
import { useAuthHydrated, useCurrentServerWithCredential, useServerList } from '/@/renderer/store';
import { Button } from '/@/shared/components/button/button';
import { Center } from '/@/shared/components/center/center';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Stack } from '/@/shared/components/stack/stack';
const ActionRequiredRoute = () => {
    const { t } = useTranslation();
    const authHydrated = useAuthHydrated();
    const currentServer = useCurrentServerWithCredential();
    const serverList = useServerList();
    const isServerRequired = !currentServer;
    const isCredentialRequired = currentServer && !currentServer.credential;
    const isLoginRequired = isServerLock() && !currentServer;
    // Enter wizard mode only on a fresh install (no servers configured at mount time).
    // This is captured once — subsequent renders don't re-evaluate the initial state.
    const [wizardActive, setWizardActive] = useState(() => Object.keys(serverList).length === 0);
    const handledHydrationRef = useRef(false);
    useEffect(() => {
        if (!authHydrated || handledHydrationRef.current) {
            return;
        }
        handledHydrationRef.current = true;
        if (Object.keys(serverList).length > 0) {
            setWizardActive(false);
        }
    }, [authHydrated, serverList]);
    const checks = [
        {
            component: _jsx(ServerCredentialRequired, {}),
            title: t('error.credentialsRequired', { postProcess: 'sentenceCase' }),
            valid: !isCredentialRequired,
        },
        {
            component: _jsx(ServerRequired, {}),
            title: t('error.serverRequired', { postProcess: 'serverRequired' }),
            valid: !isServerRequired,
        },
    ];
    const canReturnHome = checks.every((c) => c.valid);
    const displayedCheck = checks.find((c) => !c.valid);
    const handleManageServersModal = () => {
        openModal({
            children: _jsx(ServerList, {}),
            title: t('page.appMenu.manageServers', { postProcess: 'sentenceCase' }),
        });
    };
    if (!authHydrated) {
        return (_jsx(Center, { style: { height: '100%', width: '100vw' }, children: _jsx(Spinner, { container: true }) }));
    }
    if (isLoginRequired) {
        return _jsx(LoginRoute, {});
    }
    return (_jsxs(AnimatedPage, { children: [_jsx(PageHeader, {}), _jsx(Center, { style: { height: '100%', width: '100vw' }, children: _jsx(Stack, { gap: "xl", style: { maxWidth: '50%' }, children: _jsxs(ScrollArea, { style: { maxHeight: 'calc(100vh - 50px)' }, children: [_jsx(Group, { wrap: "nowrap", children: wizardActive ? (_jsx(ActionRequiredContainer, { title: t('error.serverRequired', {
                                        postProcess: 'serverRequired',
                                    }), children: _jsx(ServerRequired, { isWizard: true, onWizardExit: () => setWizardActive(false) }) })) : (displayedCheck && (_jsx(ActionRequiredContainer, { title: displayedCheck.title, children: displayedCheck?.component }))) }), _jsxs(Stack, { mt: "2rem", children: [!wizardActive && canReturnHome && (_jsx(Navigate, { replace: true, to: AppRoute.HOME })), isCredentialRequired && !isServerLock && (_jsx(Group, { justify: "center", wrap: "nowrap", children: _jsx(Button, { fullWidth: true, leftSection: _jsx(Icon, { icon: "edit" }), onClick: handleManageServersModal, variant: "filled", children: t('page.appMenu.manageServers', {
                                                postProcess: 'sentenceCase',
                                            }) }) }))] })] }) }) })] }));
};
const ActionRequiredRouteWithBoundary = () => {
    return (_jsx(PageErrorBoundary, { children: _jsx(ActionRequiredRoute, {}) }));
};
export default ActionRequiredRouteWithBoundary;
