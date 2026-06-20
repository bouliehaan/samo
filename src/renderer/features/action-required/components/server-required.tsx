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
import {
    ServerListItem,
    ServerListItemWithCredential,
    ServerType,
} from '/@/shared/types/domain-types';
import { logFn } from '/@/shared/utils/logger';

const localSettings = isElectron() ? window.api.localSettings : null;

interface ServerRequiredProps {
    isWizard?: boolean;
    onWizardExit?: () => void;
}

export const ServerRequired = ({ isWizard = false, onWizardExit }: ServerRequiredProps) => {
    const serverList = useServerList();

    if (isWizard) {
        return <SetupWizard onExit={onWizardExit ?? (() => {})} />;
    }

    if (Object.keys(serverList).length > 0) {
        return (
            <ScrollArea>
                <Stack miw="300px">
                    <ServerSelector />
                    {!isServerLock() && (
                        <>
                            <Divider my="lg" />
                            <AddServerForm onCancel={null} />
                        </>
                    )}
                </Stack>
            </ScrollArea>
        );
    }

    return <AddServerForm onCancel={null} />;
};

type WizardStep = 'addAnother' | 'addFirst' | 'prompt';

function ServerSelector() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const serverList = useServerList();
    const currentServer = useCurrentServer();
    const { setCurrentServer } = useAuthStoreActions();

    const handleSetCurrentServer = (server: ServerListItemWithCredential) => {
        setCurrentServer(server);
        navigate(AppRoute.HOME, { replace: true });
    };

    const handleCredentialsModal = async (server: ServerListItem) => {
        let password: null | string = null;

        try {
            if (localSettings && server.savePassword) {
                password = await localSettings.passwordGet(server.id);
            }
        } catch (error) {
            logFn.error(error instanceof Error ? error.message : String(error), {
                meta: { error: error },
            });
        }
        openModal({
            children: server && (
                <EditServerForm
                    isUpdate
                    onCancel={closeAllModals}
                    password={password}
                    server={server}
                />
            ),
            size: 'sm',
            title: t('form.updateServer.title', { postProcess: 'titleCase' }),
        });
    };

    return (
        <>
            {Object.keys(serverList).map((serverId) => {
                const server = serverList[serverId];
                const isNavidromeExpired =
                    false;
                const isJellyfinExpired = server.type === ServerType.JELLYFIN && !server.credential;
                const isSessionExpired = isNavidromeExpired || isJellyfinExpired;

                const logo =
                    false
                        ? NavidromeLogo
                        : server.type === ServerType.JELLYFIN
                          ? JellyfinLogo
                          : OpenSubsonicLogo;

                return (
                    <Button
                        key={`server-${server.id}`}
                        onClick={() => {
                            if (!isSessionExpired) return handleSetCurrentServer(server);
                            return handleCredentialsModal(server);
                        }}
                        size="lg"
                        styles={{
                            label: {
                                width: '100%',
                            },
                            root: {
                                padding: 'var(--theme-spacing-sm)',
                            },
                        }}
                        variant={server.id === currentServer?.id ? 'filled' : 'default'}
                    >
                        <Group justify="space-between" w="100%">
                            <Group>
                                <img
                                    src={logo}
                                    style={{
                                        height: 'var(--theme-font-size-2xl)',
                                        width: 'var(--theme-font-size-2xl)',
                                    }}
                                />
                                <Text fw={600} size="lg">
                                    {server.name}
                                </Text>
                            </Group>
                            {isSessionExpired ? <Icon icon="lock" /> : <Icon icon="arrowRight" />}
                        </Group>
                    </Button>
                );
            })}
        </>
    );
}

function SetupWizard({ onExit }: { onExit: () => void }) {
    const { t } = useTranslation();
    const [step, setStep] = useState<WizardStep>('addFirst');
    const [formKey, setFormKey] = useState(0);
    const [lastAddedName, setLastAddedName] = useState<null | string>(null);

    const handleSubmitSuccess = (server: ServerListItemWithCredential) => {
        setLastAddedName(server.name);

        if (server.type === ServerType.SAMO) {
            onExit();
            return;
        }

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
        return (
            <AddServerForm key={formKey} onCancel={null} onSubmitSuccess={handleSubmitSuccess} />
        );
    }

    if (step === 'addAnother') {
        return (
            <AddServerForm
                initialServerType={ServerType.AUDIOBOOKSHELF}
                key={formKey}
                onCancel={handleBackToPrompt}
                onSubmitSuccess={handleSubmitSuccess}
            />
        );
    }

    return (
        <Stack gap="md" miw="300px">
            <Text size="md">
                {lastAddedName
                    ? t('form.addServer.wizardPromptNamed', {
                          defaultValue: '"{{name}}" added. Want to add another server?',
                          name: lastAddedName,
                      })
                    : t('form.addServer.wizardPrompt', {
                          defaultValue: 'Server added. Want to add another server?',
                      })}
            </Text>
            <Group>
                <Button leftSection={<Icon icon="add" />} onClick={handleAddAnother}>
                    {t('form.addServer.wizardAddAnother', {
                        defaultValue: 'Add another server',
                    })}
                </Button>
                <Button onClick={onExit} variant="filled">
                    {t('form.addServer.wizardFinish', {
                        defaultValue: 'Continue',
                    })}
                </Button>
            </Group>
        </Stack>
    );
}
