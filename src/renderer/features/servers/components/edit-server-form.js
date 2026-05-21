import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { closeAllModals } from '@mantine/modals';
import isElectron from 'is-electron';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '/@/i18n/i18n';
import { api } from '/@/renderer/api';
import { queryClient } from '/@/renderer/lib/react-query';
import { getServerById, useAuthStoreActions } from '/@/renderer/store';
import { Checkbox } from '/@/shared/components/checkbox/checkbox';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { ModalButton } from '/@/shared/components/modal/model-shared';
import { PasswordInput } from '/@/shared/components/password-input/password-input';
import { Stack } from '/@/shared/components/stack/stack';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { toast } from '/@/shared/components/toast/toast';
import { Tooltip } from '/@/shared/components/tooltip/tooltip';
import { useFocusTrap } from '/@/shared/hooks/use-focus-trap';
import { useForm } from '/@/shared/hooks/use-form';
import { ServerType, } from '/@/shared/types/domain-types';
const localSettings = isElectron() ? window.api.localSettings : null;
const ModifiedFieldIndicator = () => {
    return (_jsx(Tooltip, { label: i18n.t('common.modified', { postProcess: 'titleCase' }), children: _jsx(Icon, { color: "warn", icon: "info" }) }));
};
export const EditServerForm = ({ isUpdate, onCancel, password, server }) => {
    const { t } = useTranslation();
    const { updateServer } = useAuthStoreActions();
    const focusTrapRef = useFocusTrap();
    const [isLoading, setIsLoading] = useState(false);
    const preferRemoteUrlLabel = t('form.addServer.input', { context: 'preferRemoteUrl' });
    const remoteUrlLabel = t('form.addServer.input', { context: 'remoteUrl' });
    const serverUrlLabel = t('form.addServer.input', { context: 'url' });
    const form = useForm({
        initialValues: {
            isAdmin: server?.isAdmin,
            legacyAuth: false,
            name: server?.name,
            password: password || '',
            preferInstantMix: server.preferInstantMix,
            preferRemoteUrl: server?.preferRemoteUrl || false,
            remoteUrl: server?.remoteUrl || '',
            type: server?.type,
            url: server?.url,
            username: server?.username,
        },
    });
    const isSubsonic = form.values.type === ServerType.SUBSONIC;
    const handleSubmit = form.onSubmit(async (values) => {
        try {
            setIsLoading(true);
            // Check if we can skip authentication
            const usernameChanged = values.username !== server.username;
            const passwordProvided = values.password && values.password.trim() !== '';
            const urlChanged = values.url !== server.url;
            const typeChanged = values.type !== server.type;
            // Skip authentication if username hasn't changed, password is empty, and URL/type haven't changed
            const canSkipAuth = !usernameChanged && !passwordProvided && !urlChanged && !typeChanged;
            let data;
            let serverItem;
            if (canSkipAuth) {
                // Use existing server credentials
                const existingServer = getServerById(server.id);
                if (!existingServer) {
                    return toast.error({
                        message: t('error.invalidServer', { postProcess: 'sentenceCase' }),
                    });
                }
                serverItem = {
                    ...existingServer,
                    id: server.id,
                    name: values.name,
                    type: values.type,
                    url: values.url,
                };
            }
            else {
                // Need to authenticate
                const authFunction = api.controller.authenticate;
                if (!authFunction) {
                    return toast.error({
                        message: t('error.invalidServer', { postProcess: 'sentenceCase' }),
                    });
                }
                data = await authFunction(values.url, {
                    legacy: values.legacyAuth,
                    password: values.password,
                    username: values.username,
                }, values.type);
                if (!data) {
                    return toast.error({
                        message: t('error.authenticationFailed', { postProcess: 'sentenceCase' }),
                    });
                }
                serverItem = {
                    credential: data.credential,
                    id: server.id,
                    isAdmin: data.isAdmin,
                    name: values.name,
                    type: values.type,
                    url: values.url,
                    userId: data.userId,
                    username: data.username,
                };
                if (data.ndCredential !== undefined) {
                    serverItem.ndCredential = data.ndCredential;
                }
            }
            // Update optional fields
            if (values.preferInstantMix !== undefined) {
                serverItem.preferInstantMix = values.preferInstantMix;
            }
            if (values.remoteUrl?.trim()) {
                serverItem.remoteUrl = values.remoteUrl.trim().replace(/\/$/, '');
            }
            else {
                serverItem.remoteUrl = undefined;
            }
            if (values.preferRemoteUrl !== undefined) {
                serverItem.preferRemoteUrl = values.preferRemoteUrl;
            }
            serverItem.savePassword = server.savePassword;
            if (!canSkipAuth && localSettings && passwordProvided) {
                const saved = await localSettings.passwordSet(values.password, server.id);
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
            updateServer(server.id, serverItem);
            toast.success({
                message: t('form.updateServer.title', { postProcess: 'sentenceCase' }),
            });
            queryClient.removeQueries();
        }
        catch (err) {
            setIsLoading(false);
            return toast.error({ message: err?.message });
        }
        if (isUpdate)
            closeAllModals();
        return setIsLoading(false);
    });
    return (_jsx("form", { onSubmit: handleSubmit, children: _jsxs(Stack, { ref: focusTrapRef, children: [_jsx(TextInput, { label: t('form.addServer.input', {
                        context: 'name',
                        postProcess: 'titleCase',
                    }), required: true, rightSection: form.isDirty('name') && _jsx(ModifiedFieldIndicator, {}), ...form.getInputProps('name') }), _jsx(TextInput, { label: serverUrlLabel, required: true, rightSection: form.isDirty('url') && _jsx(ModifiedFieldIndicator, {}), ...form.getInputProps('url') }), _jsx(TextInput, { label: remoteUrlLabel, placeholder: t('form.addServer.input', {
                        context: 'remoteUrlPlaceholder',
                        postProcess: 'sentenceCase',
                    }), rightSection: form.isDirty('remoteUrl') && _jsx(ModifiedFieldIndicator, {}), ...form.getInputProps('remoteUrl') }), form.values.remoteUrl && (_jsxs(Group, { gap: "xs", children: [_jsx(Checkbox, { label: preferRemoteUrlLabel, ...form.getInputProps('preferRemoteUrl', {
                                type: 'checkbox',
                            }) }), form.isDirty('preferRemoteUrl') && _jsx(ModifiedFieldIndicator, {})] })), _jsx(TextInput, { label: t('form.addServer.input', {
                        context: 'username',
                        postProcess: 'titleCase',
                    }), required: true, rightSection: form.isDirty('username') && _jsx(ModifiedFieldIndicator, {}), ...form.getInputProps('username') }), _jsx(PasswordInput, { "data-autofocus": true, label: t('form.addServer.input', {
                        context: 'password',
                        postProcess: 'titleCase',
                    }), ...form.getInputProps('password') }), isSubsonic && (_jsx(Checkbox, { label: t('form.addServer.input', {
                        context: 'legacyAuthentication',
                        postProcess: 'titleCase',
                    }), ...form.getInputProps('legacyAuth', {
                        type: 'checkbox',
                    }) })), form.values.type === ServerType.JELLYFIN && (_jsx(Checkbox, { description: t('form.addServer.input', {
                        context: 'preferInstantMixDescription',
                        postProcess: 'sentenceCase',
                    }), label: t('form.addServer.input', {
                        context: 'preferInstantMix',
                        postProcess: 'titleCase',
                    }), ...form.getInputProps('preferInstantMix', {
                        type: 'checkbox',
                    }) })), _jsxs(Group, { justify: "flex-end", children: [_jsx(ModalButton, { onClick: onCancel, children: t('common.cancel') }), _jsx(ModalButton, { loading: isLoading, type: "submit", variant: "filled", children: t('common.save') })] })] }) }));
};
