import { closeAllModals } from '@mantine/modals';
import { normalizeBaseUrl } from '@samo/core/server';
import { useQueryClient } from '@tanstack/react-query';
import isElectron from 'is-electron';
import { nanoid } from 'nanoid/non-secure';
import { type FocusEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AudiobookshelfIcon from '../../../../../assets/icons/audiobookshelf.svg';
import SamoIcon from '../../../../../build/samologo.svg';

import { api } from '/@/renderer/api';
import {
    isLegacyAuth,
    isServerLock,
} from '/@/renderer/features/action-required/utils/window-properties';
import JellyfinIcon from '/@/renderer/features/servers/assets/jellyfin.png';
import NavidromeIcon from '/@/renderer/features/servers/assets/navidrome.png';
import { IgnoreCorsSslSwitches } from '/@/renderer/features/servers/components/ignore-cors-ssl-switches';
import { useAuthStoreActions, useServerList } from '/@/renderer/store';
import { Checkbox } from '/@/shared/components/checkbox/checkbox';
import { Divider } from '/@/shared/components/divider/divider';
import { Group } from '/@/shared/components/group/group';
import { ModalButton } from '/@/shared/components/modal/model-shared';
import { Paper } from '/@/shared/components/paper/paper';
import { PasswordInput } from '/@/shared/components/password-input/password-input';
import { SegmentedControl } from '/@/shared/components/segmented-control/segmented-control';
import { Stack } from '/@/shared/components/stack/stack';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { useFocusTrap } from '/@/shared/hooks/use-focus-trap';
import { useForm } from '/@/shared/hooks/use-form';
import { AuthenticationResponse, ServerListItemWithCredential } from '/@/shared/types/domain-types';
import { DiscoveredServerItem, ServerType, toServerType } from '/@/shared/types/types';

const autodiscover = isElectron() ? window.api.autodiscover : null;
const localSettings = isElectron() ? window.api.localSettings : null;

interface AddServerFormProps {
    initialServerType?: ServerType;
    onCancel: (() => void) | null;
    onSubmitSuccess?: (server: ServerListItemWithCredential) => void;
}

interface ServerDetails {
    icon: string;
    name: string;
}

function ServerIconWithLabel({ icon, label }: { icon: string; label: string }) {
    return (
        <Stack align="center" justify="center">
            <img height="50" src={icon} width="50" />
            <Text>{label}</Text>
        </Stack>
    );
}

function useAutodiscovery() {
    const [isDone, setDone] = useState(false);
    const [servers, setServers] = useState<DiscoveredServerItem[]>([]);

    useEffect(() => {
        setServers([]);

        autodiscover
            ?.discover((newServer) => {
                setServers((tail) => [...tail, newServer]);
            })
            .then(() => {
                setDone(true);
            });
    }, []);

    return { isDone, servers };
}

const SERVER_TYPES: Record<ServerType, ServerDetails> = {
    [ServerType.AUDIOBOOKSHELF]: {
        icon: AudiobookshelfIcon,
        name: 'Audiobookshelf',
    },
    [ServerType.JELLYFIN]: {
        icon: JellyfinIcon,
        name: 'Jellyfin',
    },
    [ServerType.SAMO]: {
        icon: SamoIcon,
        name: 'Samo',
    },
    };

const ALL_SERVERS = Object.keys(SERVER_TYPES).map((serverType) => {
    const info = SERVER_TYPES[serverType];
    return {
        label: <ServerIconWithLabel icon={info.icon} label={info.name} />,
        value: serverType,
    };
});

export const AddServerForm = ({
    initialServerType: preferredInitialServerType,
    onCancel,
    onSubmitSuccess,
}: AddServerFormProps) => {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const focusTrapRef = useFocusTrap(true);
    const urlInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { addServer, ensureActiveServers, setCurrentServer } = useAuthStoreActions();
    const serverList = useServerList();
    const { servers: discovered } = useAutodiscovery();
    const configuredServerUrl = localSettings ? localSettings.env.SERVER_URL : window.SERVER_URL;
    const initialServerType =
        preferredInitialServerType ??
        (localSettings ? localSettings.env.SERVER_TYPE : toServerType(window.SERVER_TYPE)) ??
        ServerType.NAVIDROME;

    const serverLock = isServerLock();

    const form = useForm({
        initialValues: {
            legacyAuth: isLegacyAuth(),
            name:
                (localSettings ? localSettings.env.SERVER_NAME : window.SERVER_NAME) ||
                SERVER_TYPES[initialServerType].name,
            password: '',
            preferInstantMix: undefined,
            preferRemoteUrl: false,
            remoteUrl: '',
            type: initialServerType,
            url: configuredServerUrl || 'http://',
            username: '',
        },
    });

    const preferRemoteUrlLabel = t('form.addServer.input', { context: 'preferRemoteUrl' });
    const remoteUrlLabel = t('form.addServer.input', { context: 'remoteUrl' });
    const serverUrlLabel = t('form.addServer.input', { context: 'url' });
    const urlInputProps = form.getInputProps('url');

    const placeCursorAfterProtocol = useCallback((urlInput: HTMLInputElement) => {
        const protocolMatch = urlInput.value.match(/^https?:\/\//);
        const cursorPosition = protocolMatch ? protocolMatch[0].length : urlInput.value.length;

        urlInput.setSelectionRange(cursorPosition, cursorPosition);
    }, []);

    const focusServerUrlInput = useCallback(() => {
        if (serverLock) return false;

        const urlInput = urlInputRef.current;

        if (!urlInput || urlInput.disabled) return false;

        urlInput.focus({ preventScroll: true });
        placeCursorAfterProtocol(urlInput);

        return document.activeElement === urlInput;
    }, [placeCursorAfterProtocol, serverLock]);

    useLayoutEffect(() => {
        if (serverLock) return;

        let animationFrameId: null | number = null;
        let retryTimeoutId: null | number = null;
        let hasFocusedServerUrl = false;
        const startedAt = performance.now();

        const focusUntilActive = () => {
            hasFocusedServerUrl = focusServerUrlInput();

            if (hasFocusedServerUrl || performance.now() - startedAt > 2500) {
                return;
            }

            animationFrameId = window.requestAnimationFrame(focusUntilActive);
        };

        const handleWindowFocus = () => {
            if (!hasFocusedServerUrl) {
                window.setTimeout(() => {
                    hasFocusedServerUrl = focusServerUrlInput();
                }, 0);
            }
        };

        focusUntilActive();
        retryTimeoutId = window.setTimeout(focusUntilActive, 350);
        window.addEventListener('focus', handleWindowFocus);

        return () => {
            if (animationFrameId !== null) {
                window.cancelAnimationFrame(animationFrameId);
            }

            if (retryTimeoutId !== null) {
                window.clearTimeout(retryTimeoutId);
            }

            window.removeEventListener('focus', handleWindowFocus);
        };
    }, [focusServerUrlInput, serverLock]);

    const handleServerUrlFocus = (event: FocusEvent<HTMLInputElement>) => {
        urlInputProps.onFocus?.(event);
        placeCursorAfterProtocol(event.currentTarget);
    };

    const isSubmitDisabled = !form.values.name || !form.values.url || !form.values.username;

    const handleServerTypeChange = (type: string) => {
        const nextType = type as ServerType;
        const currentTypeName = SERVER_TYPES[form.values.type].name;
        const shouldUseTypeName =
            !form.values.name ||
            form.values.name === 'My Server' ||
            form.values.name === currentTypeName;

        form.setFieldValue('type', nextType);

        if (shouldUseTypeName) {
            form.setFieldValue('name', SERVER_TYPES[nextType].name);
        }
    };

    const fillServerDetails = (server: DiscoveredServerItem) => {
        form.setValues({ ...server });
    };

    const handleSubmit = form.onSubmit(async (values) => {
        if (serverLock && Object.keys(serverList).length >= 1) {
            toast.error({
                message: t('error.serverLockSingleServer', { postProcess: 'sentenceCase' }),
            });
            return;
        }

        const authFunction = api.controller.authenticate;

        if (!authFunction) {
            return toast.error({
                message: t('error.invalidServer', { postProcess: 'sentenceCase' }),
            });
        }

        try {
            setIsLoading(true);
            const data: AuthenticationResponse | undefined = await authFunction(
                values.url,
                {
                    legacy: values.legacyAuth,
                    password: values.password,
                    username: values.username,
                },
                values.type as ServerType,
            );

            if (!data) {
                return toast.error({
                    message: t('error.authenticationFailed', { postProcess: 'sentenceCase' }),
                });
            }

            const serverItem: ServerListItemWithCredential = {
                credential: data.credential,
                id: nanoid(),
                isAdmin: data.isAdmin,
                name: values.name,
                type: values.type as ServerType,
                url: normalizeBaseUrl(values.url),
                userId: data.userId,
                username: data.username,
            };

            if (values.preferInstantMix !== undefined) {
                serverItem.preferInstantMix = values.preferInstantMix;
            }

            if (values.remoteUrl?.trim()) {
                serverItem.remoteUrl = normalizeBaseUrl(values.remoteUrl);
            }

            if (values.preferRemoteUrl !== undefined) {
                serverItem.preferRemoteUrl = values.preferRemoteUrl;
            }

            
            if (localSettings && values.password) {
                const saved = await localSettings.passwordSet(values.password, serverItem.id);
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

            addServer(serverItem);

            if (serverItem.type !== ServerType.AUDIOBOOKSHELF) {
                setCurrentServer(serverItem);
            }

            ensureActiveServers();
            void queryClient.invalidateQueries({ queryKey: ['home'] });
            void queryClient.invalidateQueries({ queryKey: ['audiobookshelf'] });
            void queryClient.invalidateQueries({ queryKey: ['search'] });
            closeAllModals();

            toast.success({
                message: t('form.addServer.success', { postProcess: 'sentenceCase' }),
            });

            onSubmitSuccess?.(serverItem);
        } catch (err: any) {
            setIsLoading(false);
            return toast.error({ message: err?.message });
        }

        return setIsLoading(false);
    });

    return (
        <>
            <Stack>
                {discovered.map((server) => (
                    <Paper key={server.url} p="10px">
                        <Group>
                            <img height="32" src={SERVER_TYPES[server.type].icon} width="32" />
                            <div
                                onClick={() => fillServerDetails(server)}
                                style={{ cursor: 'pointer' }}
                            >
                                <Text fw={700}>{server.name}</Text>
                                <Text>
                                    {SERVER_TYPES[server.type].name} server at {server.url}
                                </Text>
                            </div>
                        </Group>
                    </Paper>
                ))}
            </Stack>
            <form onSubmit={handleSubmit}>
                <Stack m={5} ref={focusTrapRef}>
                    <SegmentedControl
                        data={ALL_SERVERS}
                        disabled={serverLock}
                        onChange={handleServerTypeChange}
                        p="md"
                        value={form.values.type}
                        withItemsBorders={false}
                    />
                    <Group grow>
                        <TextInput
                            disabled={serverLock}
                            label={t('form.addServer.input', {
                                context: 'name',
                                postProcess: 'titleCase',
                            })}
                            required
                            {...form.getInputProps('name')}
                        />
                        <TextInput
                            autoFocus
                            data-autofocus
                            disabled={serverLock}
                            label={serverUrlLabel}
                            ref={urlInputRef}
                            required
                            {...urlInputProps}
                            onFocus={handleServerUrlFocus}
                        />
                    </Group>
                    <TextInput
                        disabled={serverLock}
                        label={remoteUrlLabel}
                        placeholder={t('form.addServer.input', {
                            context: 'remoteUrlPlaceholder',
                            postProcess: 'sentenceCase',
                        })}
                        {...form.getInputProps('remoteUrl')}
                    />
                    {form.values.remoteUrl && (
                        <Checkbox
                            label={preferRemoteUrlLabel}
                            {...form.getInputProps('preferRemoteUrl', {
                                type: 'checkbox',
                            })}
                        />
                    )}
                    <TextInput
                        label={t('form.addServer.input', {
                            context: 'username',
                            postProcess: 'titleCase',
                        })}
                        required
                        {...form.getInputProps('username')}
                    />
                    <PasswordInput
                        label={t('form.addServer.input', {
                            context: 'password',
                            postProcess: 'titleCase',
                        })}
                        {...form.getInputProps('password')}
                    />

                    {form.values.type === ServerType.JELLYFIN && (
                        <Checkbox
                            description={t('form.addServer.input', {
                                context: 'preferInstantMixDescription',
                                postProcess: 'sentenceCase',
                            })}
                            label={t('form.addServer.input', {
                                context: 'preferInstantMix',
                                postProcess: 'titleCase',
                            })}
                            {...form.getInputProps('preferInstantMix', {
                                type: 'checkbox',
                            })}
                        />
                    )}
                    {isElectron() && (
                        <>
                            <Divider />
                            <IgnoreCorsSslSwitches />
                            <Divider />
                        </>
                    )}
                    <Group grow justify="flex-end">
                        {onCancel && (
                            <ModalButton onClick={onCancel}>{t('common.cancel')}</ModalButton>
                        )}
                        <ModalButton
                            disabled={isSubmitDisabled}
                            loading={isLoading}
                            type="submit"
                            variant="filled"
                        >
                            {t('common.add')}
                        </ModalButton>
                    </Group>
                </Stack>
            </form>
        </>
    );
};
