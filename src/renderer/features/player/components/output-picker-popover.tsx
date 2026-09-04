import { describeSamoRadioDevice } from '@samo/core/server';
import clsx from 'clsx';
import { t } from 'i18next';
import isElectron from 'is-electron';
import { memo, useCallback, useEffect, useState } from 'react';

import styles from './output-picker-modal.module.css';

import {
    getSamoRadioServer,
    sendToSamoRadioDevice,
} from '/@/renderer/features/samo-radio/api/samo-radio-api';
import { useSamoRadioPolling } from '/@/renderer/features/samo-radio/hooks/use-samo-radio-polling';
import { samoRadioQueueForSend } from '/@/renderer/features/samo-radio/utils/samo-radio-refs';
import {
    type AudioDeviceOption,
    useAudioDevices,
} from '/@/renderer/features/settings/components/playback/audio-settings';
import {
    getDesktopCastSnapshot,
    initializeDesktopCast,
    openDesktopCastNetworkSettings,
    requestDesktopCastSession,
    stopDesktopCastSession,
} from '/@/renderer/services/chromecast/desktop-cast-service';
import { useDesktopCastState } from '/@/renderer/store/cast.store';
import { getPlayerData, getQueue, usePlayerStatus } from '/@/renderer/store/player.store';
import { useSamoRadioDevices } from '/@/renderer/store/samo-radio.store';
import {
    usePlaybackSettings,
    usePlaybackType,
    useSettingsStoreActions,
} from '/@/renderer/store/settings.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Icon } from '/@/shared/components/icon/icon';
import { Popover } from '/@/shared/components/popover/popover';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Text } from '/@/shared/components/text/text';
import { Tooltip } from '/@/shared/components/tooltip/tooltip';
import { useDisclosure } from '/@/shared/hooks/use-disclosure';
import { PlayerStatus, PlayerType } from '/@/shared/types/types';

const getCastEmptyMessage = (status: ReturnType<typeof getDesktopCastSnapshot>['status']) => {
    if (!isElectron()) {
        return 'Chromecast is only available in the desktop app.';
    }
    if (status === 'blocked') {
        // The OS is refusing the subnet outright, so scanning harder cannot help.
        return window.api?.utils?.isMacOS?.()
            ? 'samo cannot reach your local network. Turn samo on under Privacy & Security → Local Network.'
            : 'samo cannot reach your local network. Allow it through your firewall.';
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
    return 'No Chromecast devices found.';
};

const getLocalDeviceLabel = (device: AudioDeviceOption) => {
    const label = device.label?.trim();
    if (label) {
        return label;
    }
    if (device.value === 'default') {
        return 'System default';
    }
    return 'Audio output';
};

const OutputPickerContent = memo(
    ({ onClose, opened }: { onClose: () => void; opened: boolean }) => {
        const castState = useDesktopCastState();
        const playbackType = usePlaybackType();
        const playbackSettings = usePlaybackSettings();
        const playerStatus = usePlayerStatus();
        const { setSettings } = useSettingsStoreActions();
        const audioDevices = useAudioDevices(playbackType, opened);
        const samoRadioDevices = useSamoRadioDevices();
        const [isLoading, setIsLoading] = useState(false);
        const [error, setError] = useState<null | string>(null);
        const [selectingId, setSelectingId] = useState<null | string>(null);

        useSamoRadioPolling({ active: opened });

        const isPlaying = playerStatus === PlayerStatus.PLAYING;
        const selectedLocalDeviceId =
            playbackType === PlayerType.LOCAL
                ? playbackSettings.mpvAudioDeviceId
                : playbackSettings.audioDeviceId;

        useEffect(() => {
            if (!opened) {
                return;
            }

            let cancelled = false;
            const refresh = async (showLoading: boolean) => {
                if (showLoading) {
                    setIsLoading(true);
                }
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
                    if (!cancelled && showLoading) {
                        setIsLoading(false);
                    }
                }
            };

            void refresh(true);
            const refreshTimers = [400, 900, 1600, 2500, 4000].map((delay) =>
                setTimeout(() => void refresh(false), delay),
            );
            const refreshInterval = setInterval(() => void refresh(false), 2500);

            return () => {
                cancelled = true;
                refreshTimers.forEach(clearTimeout);
                clearInterval(refreshInterval);
                setSelectingId(null);
            };
        }, [opened]);

        const handleSelectLocalDevice = useCallback(
            async (device: AudioDeviceOption) => {
                if (isPlaying) {
                    return;
                }

                const isSelected =
                    !castState.isConnected &&
                    (selectedLocalDeviceId === device.value ||
                        (!selectedLocalDeviceId && device.value === 'default'));

                if (isSelected) {
                    onClose();
                    return;
                }

                setSelectingId(device.value);
                setError(null);
                try {
                    if (castState.isConnected) {
                        await stopDesktopCastSession();
                    }
                    setSettings({
                        playback: {
                            ...playbackSettings,
                            ...(playbackType === PlayerType.LOCAL
                                ? { mpvAudioDeviceId: device.value }
                                : { audioDeviceId: device.value }),
                        },
                    });
                    onClose();
                } catch (selectError) {
                    setError(
                        selectError instanceof Error
                            ? selectError.message
                            : 'Could not switch audio output.',
                    );
                } finally {
                    setSelectingId(null);
                }
            },
            [
                castState.isConnected,
                isPlaying,
                onClose,
                playbackSettings,
                playbackType,
                selectedLocalDeviceId,
                setSettings,
            ],
        );

        const handleConnectCast = useCallback(
            async (deviceId?: string) => {
                setSelectingId(deviceId ?? '__cast_connect__');
                setError(null);
                try {
                    await requestDesktopCastSession(deviceId);
                    onClose();
                } catch (connectError) {
                    setError(
                        connectError instanceof Error
                            ? connectError.message
                            : 'Could not connect to Chromecast.',
                    );
                } finally {
                    setSelectingId(null);
                }
            },
            [onClose],
        );

        /**
         * Hand the current queue to a samo-radio device.
         *
         * This is a send, not a switch: the queue starts playing out of the
         * stereo's own socket and this computer keeps whatever it was doing.
         * That is why the row does not become "selected" the way a cast target
         * does — nothing about this app's output has changed.
         */
        const handleSendToSamoRadio = useCallback(
            async (deviceId: string) => {
                const server = getSamoRadioServer();
                const { items, startIndex } = samoRadioQueueForSend(
                    getQueue().items,
                    getPlayerData().index,
                    server?.id,
                );

                if (items.length === 0) {
                    setError('Nothing in the queue that this server can play.');
                    return;
                }

                setSelectingId(deviceId);
                setError(null);
                try {
                    await sendToSamoRadioDevice({ deviceId, items, startIndex });
                    onClose();
                } catch (sendError) {
                    setError(
                        sendError instanceof Error
                            ? sendError.message
                            : 'Could not reach that samo-radio device.',
                    );
                } finally {
                    setSelectingId(null);
                }
            },
            [onClose],
        );

        const handleDisconnectCast = useCallback(async () => {
            setSelectingId('__cast_disconnect__');
            setError(null);
            try {
                await stopDesktopCastSession();
                onClose();
            } catch (disconnectError) {
                setError(
                    disconnectError instanceof Error
                        ? disconnectError.message
                        : 'Could not disconnect Chromecast.',
                );
            } finally {
                setSelectingId(null);
            }
        }, [onClose]);

        const emptyMessage = getCastEmptyMessage(castState.status);
        const castDevices = castState.devices;
        const localDevices =
            audioDevices.length > 0 ? audioDevices : [{ label: 'This computer', value: 'default' }];
        const showCastConnectRow =
            !castState.isConnected &&
            castState.status !== 'blocked' &&
            castState.status !== 'unavailable' &&
            castState.status !== 'no-devices';
        const isScanningForCast =
            castState.isScanning || castState.status === 'connecting' || isLoading;

        const renderLocalRow = (device: AudioDeviceOption) => {
            const isSelected =
                !castState.isConnected &&
                (selectedLocalDeviceId === device.value ||
                    (!selectedLocalDeviceId && device.value === 'default'));
            const isSelecting = selectingId === device.value;
            const isDisabled = isPlaying || Boolean(selectingId);

            const row = (
                <button
                    className={clsx(
                        styles.row,
                        isSelected && styles.rowSelected,
                        isDisabled && !isSelecting && styles.rowDisabled,
                    )}
                    disabled={isDisabled}
                    key={device.value}
                    onClick={() => void handleSelectLocalDevice(device)}
                    type="button"
                >
                    <span className={clsx(styles.icon, isSelected && styles.iconSelected)}>
                        <Icon icon="outputPicker" size="lg" />
                    </span>
                    <span className={styles.body}>
                        <Text fw={600}>{getLocalDeviceLabel(device)}</Text>
                        <Text className={styles.subtitle} size="sm">
                            {playbackType === PlayerType.LOCAL ? 'Native (MPV)' : 'This computer'}
                        </Text>
                    </span>
                    <span className={styles.state}>
                        {isSelecting ? (
                            <Spinner size={16} />
                        ) : isSelected ? (
                            <Icon icon="check" />
                        ) : null}
                    </span>
                </button>
            );

            if (isPlaying) {
                return (
                    <Tooltip
                        key={device.value}
                        label={t('player.pausePlaybackToChangeSetting', {
                            postProcess: 'titleCase',
                        })}
                    >
                        <div>{row}</div>
                    </Tooltip>
                );
            }

            return row;
        };

        const renderCastRow = ({
            id,
            isSelected,
            onClick,
            subtitle,
            title,
        }: {
            id: string;
            isSelected: boolean;
            onClick: () => void;
            subtitle: string;
            title: string;
        }) => {
            const isSelecting = selectingId === id;
            const isDisabled = Boolean(selectingId);

            return (
                <button
                    className={clsx(
                        styles.row,
                        isSelected && styles.rowSelected,
                        isDisabled && !isSelecting && styles.rowDisabled,
                    )}
                    disabled={isDisabled}
                    key={id}
                    onClick={onClick}
                    type="button"
                >
                    <span className={clsx(styles.icon, isSelected && styles.iconSelected)}>
                        <Icon color={isSelected ? 'primary' : undefined} icon="cast" size="lg" />
                    </span>
                    <span className={styles.body}>
                        <Text fw={600}>{title}</Text>
                        <Text className={styles.subtitle} size="sm">
                            {subtitle}
                        </Text>
                    </span>
                    <span className={styles.state}>
                        {isSelecting ? (
                            <Spinner size={16} />
                        ) : isSelected ? (
                            <Icon icon="check" />
                        ) : null}
                    </span>
                </button>
            );
        };

        return (
            <div className={styles.container}>
                <Text className={styles.title} fw={700}>
                    Audio output
                </Text>
                <div className={styles.list}>
                    <Text className={styles.sectionLabel} size="sm">
                        {playbackType === PlayerType.LOCAL
                            ? 'This computer'
                            : 'Speakers and headphones'}
                    </Text>
                    {localDevices.map(renderLocalRow)}

                    {samoRadioDevices.length > 0 ? (
                        <>
                            <Text className={styles.sectionLabel} mt="sm" size="sm">
                                samo Radio
                            </Text>
                            {samoRadioDevices.map((device) => {
                                const isSending = selectingId === device.id;

                                return (
                                    <button
                                        className={clsx(
                                            styles.row,
                                            Boolean(selectingId) &&
                                                !isSending &&
                                                styles.rowDisabled,
                                        )}
                                        disabled={Boolean(selectingId)}
                                        key={device.id}
                                        onClick={() => void handleSendToSamoRadio(device.id)}
                                        type="button"
                                    >
                                        <span className={styles.icon}>
                                            <Icon icon="radio" size="lg" />
                                        </span>
                                        <span className={styles.body}>
                                            <Text fw={600}>{device.name}</Text>
                                            <Text className={styles.subtitle} size="sm">
                                                {describeSamoRadioDevice(device)}
                                            </Text>
                                        </span>
                                        <span className={styles.state}>
                                            {isSending ? <Spinner size={16} /> : null}
                                        </span>
                                    </button>
                                );
                            })}
                        </>
                    ) : null}

                    <Text className={styles.sectionLabel} mt="sm" size="sm">
                        Chromecast
                    </Text>
                    {castState.isConnected && castState.deviceName
                        ? renderCastRow({
                              id: castState.devices[0]?.id ?? '__cast_active__',
                              isSelected: true,
                              onClick: () => void handleDisconnectCast(),
                              subtitle: 'Connected — tap to switch to this computer',
                              title: castState.deviceName,
                          })
                        : null}
                    {!castState.isConnected && castDevices.length > 0
                        ? castDevices.map((device) =>
                              renderCastRow({
                                  id: device.id,
                                  isSelected: device.isSelected,
                                  onClick: () => void handleConnectCast(device.id),
                                  subtitle: 'Tap to connect',
                                  title: device.name,
                              }),
                          )
                        : null}
                    {showCastConnectRow
                        ? renderCastRow({
                              id: '__cast_connect__',
                              isSelected: false,
                              onClick: () => void handleConnectCast(),
                              subtitle: 'Choose a device on your network',
                              title: 'Connect to Chromecast',
                          })
                        : null}
                    {!castState.isConnected && castDevices.length === 0 && !showCastConnectRow ? (
                        <Text className={styles.hint} size="sm">
                            {isScanningForCast ? 'Looking for Chromecast devices...' : emptyMessage}
                        </Text>
                    ) : null}
                    {castState.status === 'blocked' && window.api?.utils?.isMacOS?.() ? (
                        <button
                            className={styles.hintAction}
                            onClick={() => void openDesktopCastNetworkSettings()}
                            type="button"
                        >
                            Open Local Network settings
                        </button>
                    ) : null}
                    {isScanningForCast && castDevices.length === 0 && showCastConnectRow ? (
                        <div className={styles.loading}>
                            <Spinner size={18} />
                        </div>
                    ) : null}
                </div>
                {error ? (
                    <Text c="red" mt="sm" size="sm">
                        {error}
                    </Text>
                ) : null}
            </div>
        );
    },
);

OutputPickerContent.displayName = 'OutputPickerContent';

export const OutputPickerPopover = memo(() => {
    const castState = useDesktopCastState();
    const [opened, { close, toggle }] = useDisclosure(false);
    const isActive = castState.isConnected;

    return (
        <Popover
            onChange={(nextOpened) => {
                if (!nextOpened) {
                    close();
                }
            }}
            opened={opened}
            position="top-end"
            width={360}
        >
            <Popover.Target>
                <ActionIcon
                    icon="outputPicker"
                    iconProps={{
                        color: isActive ? 'primary' : undefined,
                        size: 'lg',
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        toggle();
                    }}
                    size="sm"
                    stopsPropagation
                    tooltip={{
                        label: isActive
                            ? `Casting to ${castState.deviceName ?? 'Chromecast'}`
                            : 'Choose audio output',
                        openDelay: 0,
                    }}
                    variant="subtle"
                />
            </Popover.Target>
            <Popover.Dropdown>
                <OutputPickerContent onClose={close} opened={opened} />
            </Popover.Dropdown>
        </Popover>
    );
});

OutputPickerPopover.displayName = 'OutputPickerPopover';
