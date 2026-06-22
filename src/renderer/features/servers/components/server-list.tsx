import { openContextModal } from '@mantine/modals';
import isElectron from 'is-electron';
import { useTranslation } from 'react-i18next';

import SamoLogo from '../../../../../build/samologo.svg';

import { isServerLock } from '/@/renderer/features/action-required/utils/window-properties';
import { AddServerForm } from '/@/renderer/features/servers/components/add-server-form';
import { IgnoreCorsSslSwitches } from '/@/renderer/features/servers/components/ignore-cors-ssl-switches';
import { ServerListItem } from '/@/renderer/features/servers/components/server-list-item';
import { useCurrentServer, useServerList } from '/@/renderer/store';
import { Accordion } from '/@/shared/components/accordion/accordion';
import { Button } from '/@/shared/components/button/button';
import { Divider } from '/@/shared/components/divider/divider';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { ContextModalVars } from '/@/shared/components/modal/modal';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';

export const ServerList = () => {
    const { t } = useTranslation();
    const currentServer = useCurrentServer();
    const serverListQuery = useServerList();
    const serverLock = isServerLock();

    const handleAddServerModal = () => {
        openContextModal({
            innerProps: {
                modalBody: (vars: ContextModalVars) => (
                    <AddServerForm onCancel={() => vars.context.closeModal(vars.id)} />
                ),
            },
            modal: 'base',
            title: t('form.addServer.title', { postProcess: 'titleCase' }),
        });
    };

    return (
        <>
            <Stack>
                <Accordion variant="separated">
                    {Object.keys(serverListQuery)?.map((serverId) => {
                        const server = serverListQuery[serverId];
                        return (
                            <Accordion.Item key={server.id} value={server.name}>
                                <Accordion.Control>
                                    <Group>
                                        <img
                                            src={SamoLogo}
                                            style={{
                                                height: 'var(--theme-font-size-lg)',
                                                width: 'var(--theme-font-size-lg)',
                                            }}
                                        />
                                        <Text fw={server.id === currentServer?.id ? 600 : 400}>
                                            {server?.name}
                                        </Text>
                                    </Group>
                                </Accordion.Control>
                                <Accordion.Panel>
                                    <ServerListItem server={server} />
                                </Accordion.Panel>
                            </Accordion.Item>
                        );
                    })}
                    {!serverLock && (
                        <Group grow pt="md">
                            <Button
                                autoFocus
                                leftSection={<Icon icon="add" />}
                                onClick={handleAddServerModal}
                            >
                                {t('form.addServer.title', { postProcess: 'titleCase' })}
                            </Button>
                        </Group>
                    )}
                </Accordion>
                {isElectron() && (
                    <>
                        <Divider />
                        <IgnoreCorsSslSwitches />
                    </>
                )}
            </Stack>
        </>
    );
};
