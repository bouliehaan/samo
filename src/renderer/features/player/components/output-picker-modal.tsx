import clsx from 'clsx';
import isElectron from 'is-electron';
import { memo, useCallback, useEffect, useState } from 'react';

import styles from './output-picker-modal.module.css';

import {
    getDesktopCastSnapshot,
    initializeDesktopCast,
    requestDesktopCastSession,
    stopDesktopCastSession,
} from '/@/renderer/services/chromecast/desktop-cast-service';
import { useDesktopCastState } from '/@/renderer/store/cast.store';
import { Button } from '/@/shared/components/button/button';
import { Icon } from '/@/shared/components/icon/icon';
import { Modal, type ModalProps } from '/@/shared/components/modal/modal';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Text } from '/@/shared/components/text/text';

const getCastEmptyMessage = (status: ReturnType<typeof getDesktopCastSnapshot>['status']) => {
    if (!isElectron()) {
        return 'Chromecast is only available in the desktop app.';
    }
    if (status === 'unavailable') {
        return 'Chromecast is unavailable. Check your network connection and restart the app.';
    }
    if (status === 'connecting') {
        return 'Looking for Chromecast devices...';
    }
    if (status === 'no-devices') {
        return 'No Chromecast on this network. Use the same Wi‑Fi as your TV.';
    }
    return 'No Chromecast devices found. Use the cast button in the player to connect.';
};

export const OutputPickerModal = memo(
    ({ handlers, opened }: { handlers: ModalProps['handlers']; opened: boolean }) => {
        const castState = useDesktopCastState();
        const [isLoading, setIsLoading] = useState(false);
        const [error, setError] = useState<string | null>(null);

        useEffect(() => {
            if (!opened) return;

            // The Cast SDK pushes state via CAST_STATE_CHANGED / SESSION_STATE_CHANGED
            // (installed in desktop-cast-service); we only need to (re)initialize so the
            // listener is wired and prod-warmed discovery is running. No polling.
            let cancelled = false;
            const refresh = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    await initializeDesktopCast();
                    if (!cancelled) {
                        getDesktopCastSnapshot();
                    }
                } catch (refreshError) {
                    if (!cancelled) {
                        setError(
                            refreshError instanceof Error
                                ? refreshError.message
                                : 'Could not load audio outputs.',
                        );
                    }
                } finally {
                    if (!cancelled) {
                        setIsLoading(false);
                    }
                }
            };

            void refresh();

            return () => {
                cancelled = true;
            };
        }, [opened]);

        const handleConnectCast = useCallback(async () => {
            setError(null);
            try {
                await requestDesktopCastSession();
                handlers.close();
            } catch (connectError) {
                setError(
                    connectError instanceof Error
                        ? connectError.message
                        : 'Could not connect to Chromecast.',
                );
            }
        }, [handlers]);

        const handleDisconnectCast = useCallback(async () => {
            setError(null);
            try {
                await stopDesktopCastSession();
                handlers.close();
            } catch (disconnectError) {
                setError(
                    disconnectError instanceof Error
                        ? disconnectError.message
                        : 'Could not disconnect Chromecast.',
                );
            }
        }, [handlers]);

        const emptyMessage = getCastEmptyMessage(castState.status);

        return (
            <Modal handlers={handlers} opened={opened} title="Audio output" zIndex={500}>
                <div className={styles.container}>
                    <Text className={styles.sectionLabel} size="sm">
                        This device
                    </Text>
                    <button
                        className={clsx(styles.row, !castState.isConnected && styles.rowSelected)}
                        onClick={() => {
                            if (castState.isConnected) {
                                void handleDisconnectCast();
                                return;
                            }
                            handlers.close();
                        }}
                        type="button"
                    >
                        <span className={styles.icon}>
                            <Icon icon="outputPicker" size="lg" />
                        </span>
                        <span className={styles.body}>
                            <Text fw={600}>This computer</Text>
                            <Text className={styles.subtitle} size="sm">
                                Play audio on this machine
                            </Text>
                        </span>
                    </button>

                    <Text className={styles.sectionLabel} mt="md" size="sm">
                        Chromecast
                    </Text>
                    {isLoading ? (
                        <div className={styles.loading}>
                            <Spinner size={18} />
                        </div>
                    ) : null}
                    {castState.isConnected && castState.deviceName ? (
                        <button
                            className={clsx(styles.row, styles.rowSelected)}
                            onClick={() => void handleDisconnectCast()}
                            type="button"
                        >
                            <span className={styles.icon}>
                                <Icon color="primary" icon="cast" size="lg" />
                            </span>
                            <span className={styles.body}>
                                <Text fw={600}>{castState.deviceName}</Text>
                                <Text className={styles.subtitle} size="sm">
                                    Connected — tap to disconnect
                                </Text>
                            </span>
                        </button>
                    ) : (
                        <div className={styles.castActions}>
                            <Button onClick={() => void handleConnectCast()} variant="light">
                                Connect to Chromecast
                            </Button>
                            <Text className={styles.hint} size="sm">
                                {emptyMessage}
                            </Text>
                        </div>
                    )}
                    {error ? (
                        <Text c="red" mt="sm" size="sm">
                            {error}
                        </Text>
                    ) : null}
                </div>
            </Modal>
        );
    },
);

OutputPickerModal.displayName = 'OutputPickerModal';
