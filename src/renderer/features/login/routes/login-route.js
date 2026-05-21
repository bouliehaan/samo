import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import isElectron from 'is-electron';
import { nanoid } from 'nanoid/non-secure';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router';
import AudiobookshelfIcon from '../../../../../assets/icons/audiobookshelf.svg';
import { api } from '/@/renderer/api';
import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { isLegacyAuth, isServerLock, } from '/@/renderer/features/action-required/utils/window-properties';
import JellyfinIcon from '/@/renderer/features/servers/assets/jellyfin.png';
import NavidromeIcon from '/@/renderer/features/servers/assets/navidrome.png';
import SubsonicIcon from '/@/renderer/features/servers/assets/opensubsonic.png';
import { IgnoreCorsSslSwitches } from '/@/renderer/features/servers/components/ignore-cors-ssl-switches';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { AppRoute } from '/@/renderer/router/routes';
import { getServerById, useAuthStoreActions, useCurrentServer, useServerList, } from '/@/renderer/store';
import { Button } from '/@/shared/components/button/button';
import { Center } from '/@/shared/components/center/center';
import { Code } from '/@/shared/components/code/code';
import { Paper } from '/@/shared/components/paper/paper';
import { PasswordInput } from '/@/shared/components/password-input/password-input';
import { Stack } from '/@/shared/components/stack/stack';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { TextTitle } from '/@/shared/components/text-title/text-title';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { useForm } from '/@/shared/hooks/use-form';
import { ServerType, toServerType } from '/@/shared/types/types';
const localSettings = isElectron() ? window.api.localSettings : null;
const SERVER_ICONS = {
    [ServerType.AUDIOBOOKSHELF]: AudiobookshelfIcon,
    [ServerType.JELLYFIN]: JellyfinIcon,
    [ServerType.NAVIDROME]: NavidromeIcon,
    [ServerType.SUBSONIC]: SubsonicIcon,
};
const SERVER_NAMES = {
    [ServerType.AUDIOBOOKSHELF]: 'Audiobookshelf',
    [ServerType.JELLYFIN]: 'Jellyfin',
    [ServerType.NAVIDROME]: 'Navidrome',
    [ServerType.SUBSONIC]: 'OpenSubsonic',
};
const normalizeUrl = (url) => url.replace(/\/$/, '');
const LoginRoute = () => {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const { addServer, setCurrentServer, updateServer } = useAuthStoreActions();
    const currentServer = useCurrentServer();
    const serverList = useServerList();
    // Check if server lock is configured
    const serverLock = isServerLock();
    const serverType = window.SERVER_TYPE ? toServerType(window.SERVER_TYPE) : null;
    const serverName = window.SERVER_NAME || '';
    const serverUrl = window.SERVER_URL || '';
    const remoteUrl = window.REMOTE_URL || '';
    const legacyAuth = serverLock && isLegacyAuth();
    const config = [
        {
            isValid: true,
            key: 'SERVER_LOCK',
            value: serverLock,
        },
        {
            isValid: serverType !== null,
            key: 'SERVER_TYPE',
            value: serverType,
        },
        {
            isValid: true,
            key: 'SERVER_NAME',
            value: serverName,
        },
        {
            isValid: serverUrl !== '',
            key: 'SERVER_URL',
            value: serverUrl,
        },
        {
            isValid: true,
            key: 'REMOTE_URL',
            value: remoteUrl,
        },
    ];
    const form = useForm({
        initialValues: {
            password: '',
            username: '',
        },
    });
    // If server lock is not enabled, or we already have a server, redirect to home
    if (currentServer) {
        return _jsx(Navigate, { replace: true, to: AppRoute.HOME });
    }
    // If any of the config values are invalid, show error
    if (config.some((c) => !c.isValid)) {
        return (_jsxs(AnimatedPage, { children: [_jsx(PageHeader, {}), _jsx(Center, { style: { height: '100%', width: '100vw' }, children: _jsxs(Stack, { children: [_jsx(TextTitle, { fw: 600, children: t('error.genericError', { postProcess: 'sentenceCase' }) }), _jsx(Text, { fw: 500, children: t('error.serverNotSelectedError', { postProcess: 'sentenceCase' }) }), _jsx(Code, { block: true, children: JSON.stringify(config, null, 2) })] }) })] }));
    }
    const handleSubmit = form.onSubmit(async (values) => {
        const authFunction = api.controller.authenticate;
        if (!authFunction) {
            return toast.error({
                message: t('error.invalidServer', { postProcess: 'sentenceCase' }),
            });
        }
        try {
            setIsLoading(true);
            const data = await authFunction(serverUrl, {
                legacy: legacyAuth,
                password: values.password,
                username: values.username,
            }, serverType);
            if (!data) {
                return toast.error({
                    message: t('error.authenticationFailed', { postProcess: 'sentenceCase' }),
                });
            }
            const normalizedUrl = normalizeUrl(serverUrl);
            const normalizedRemoteURL = normalizeUrl(remoteUrl);
            const existingServer = serverLock
                ? Object.values(serverList).find((s) => normalizeUrl(s.url) === normalizedUrl)
                : undefined;
            const serverId = existingServer?.id ?? nanoid();
            const serverItem = {
                credential: data.credential,
                id: serverId,
                isAdmin: data.isAdmin,
                name: serverName,
                remoteUrl: normalizedRemoteURL,
                type: serverType,
                url: normalizedUrl,
                userId: data.userId,
                username: data.username,
            };
            if (localSettings && values.password) {
                const saved = await localSettings.passwordSet(values.password, serverId);
                serverItem.savePassword = saved;
                if (!saved) {
                    toast.error({
                        message: t('form.addServer.error', {
                            context: 'savePassword',
                            postProcess: 'sentenceCase',
                        }),
                    });
                }
            }
            if (existingServer) {
                const updates = {
                    credential: data.credential,
                    isAdmin: data.isAdmin,
                    savePassword: serverItem.savePassword,
                    userId: data.userId,
                    username: data.username,
                };
                if (data.ndCredential !== undefined) {
                    updates.ndCredential = data.ndCredential;
                }
                updateServer(existingServer.id, updates);
                const updated = getServerById(existingServer.id);
                if (updated)
                    setCurrentServer(updated);
            }
            else {
                if (data.ndCredential !== undefined) {
                    serverItem.ndCredential = data.ndCredential;
                }
                addServer(serverItem);
                setCurrentServer(serverItem);
            }
            toast.success({
                message: t('form.addServer.success', { postProcess: 'sentenceCase' }),
            });
        }
        catch (err) {
            setIsLoading(false);
            return toast.error({ message: err?.message });
        }
        return setIsLoading(false);
    });
    const isSubmitDisabled = !form.values.username || !form.values.password;
    const serverIcon = SERVER_ICONS[serverType];
    const serverDisplayName = SERVER_NAMES[serverType];
    return (_jsxs(AnimatedPage, { children: [_jsx(PageHeader, {}), _jsx(Center, { style: { height: '100%', width: '100vw' }, children: _jsx(Paper, { p: "xl", style: { maxWidth: '400px', width: '100%' }, children: _jsx("form", { onSubmit: handleSubmit, children: _jsxs(Stack, { gap: "xl", children: [_jsxs(Stack, { align: "center", gap: "md", children: [_jsx("img", { alt: serverDisplayName, height: "80", src: serverIcon, width: "80" }), _jsx(Text, { fw: 600, size: "xl", children: serverName }), serverName && (_jsx(Text, { c: "dimmed", size: "sm", children: serverDisplayName }))] }), _jsxs(Stack, { gap: "md", children: [_jsx(TextInput, { "data-autofocus": true, label: t('form.addServer.input', {
                                                context: 'username',
                                                postProcess: 'titleCase',
                                            }), required: true, variant: "filled", ...form.getInputProps('username') }), _jsx(PasswordInput, { label: t('form.addServer.input', {
                                                context: 'password',
                                                postProcess: 'titleCase',
                                            }), required: true, variant: "filled", ...form.getInputProps('password') }), _jsx(IgnoreCorsSslSwitches, {})] }), _jsx(Button, { disabled: isSubmitDisabled, fullWidth: true, loading: isLoading, type: "submit", variant: "filled", children: t('common.login', {
                                        defaultValue: 'Login',
                                        postProcess: 'titleCase',
                                    }) })] }) }) }) })] }));
};
const LoginRouteWithBoundary = () => {
    return (_jsx(PageErrorBoundary, { children: _jsx(LoginRoute, {}) }));
};
export default LoginRouteWithBoundary;
