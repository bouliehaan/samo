import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    type GestureResponderEvent,
    Modal,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';

import { type SamoRadioDevice, describeSamoRadioDevice } from '@samo/core/server';

import { CastGlyph, CheckGlyph } from '../components/Glyphs';
import {
    type AndroidCastState,
    type AndroidMediaOutputRoute,
    type AndroidMediaOutputState,
    getAndroidOutputRoutes,
    pauseAndroidAudio,
    selectAndroidOutputRoute,
    subscribeToAndroidOutputRouteEvents,
} from '../services/audio-playback';
import {
    refreshSamoRadioDevices,
    samoRadioSendPayloadForQueue,
    sendToSamoRadio,
} from '../services/samo-radio';
import { getPlaybackQueue } from '../state/playback-queue-store';
import { useSamoRadioSelector } from '../state/samo-radio';
import { QUEUE_CLOSE_DISTANCE } from '../theme/layout';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';

const EMPTY_OUTPUT_ROUTES: AndroidMediaOutputRoute[] = [];

export const getOutputRouteGlyphLabel = (route: AndroidMediaOutputRoute): string => {
    const type = route.type ?? '';
    if (type.includes('bluetooth') || type.startsWith('ble') || type === 'hearing-aid') {
        return 'BT';
    }
    if (type.startsWith('usb')) {
        return 'USB';
    }
    if (type.startsWith('wired')) {
        return 'AUX';
    }
    return 'SP';
};

export const getCastPickerEmptyMessage = (
    castState: AndroidCastState | undefined,
    isScanning = false,
): string => {
    if (castState?.status === 'unavailable') {
        return 'Chromecast is unavailable on this device.';
    }
    if (castState?.status === 'connecting' || isScanning) {
        return 'Looking for Chromecast devices...';
    }
    if (castState?.status === 'no-devices') {
        return 'No Chromecast on this Wi‑Fi. Use the same network as the TV, or register the device in the Google Cast developer console for app 062D005A.';
    }
    return 'No Chromecast devices found.';
};

export const OutputPickerModal = memo(({
    castState,
    onClose,
    visible,
}: {
    castState: AndroidCastState;
    onClose: () => void;
    visible: boolean;
}) => {
    const [outputState, setOutputState] = useState<AndroidMediaOutputState | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [selectingRouteId, setSelectingRouteId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    // Shared with the Radio tab's panel and every long-press menu, and already
    // narrowed to devices the server can reach — an unpaired or unreachable one
    // is not an output, and offering it here would only fail on tap.
    const samoRadioDevices = useSamoRadioSelector((state) => state.devices);
    const [sendingDeviceId, setSendingDeviceId] = useState<string | null>(null);

    // samo-radio devices are a server round trip, not a native route scan, so
    // this re-reads once per open instead of joining the Chromecast poll. The
    // list already in the store renders immediately; this only corrects it.
    useEffect(() => {
        if (!visible) {
            return;
        }
        const controller = new AbortController();
        void refreshSamoRadioDevices(controller.signal);
        return () => {
            controller.abort();
            setSendingDeviceId(null);
        };
    }, [visible]);

    useEffect(() => {
        if (!visible) {
            return;
        }

        let cancelled = false;
        const loadRoutes = async (showLoading: boolean) => {
            if (showLoading) {
                setIsLoading(true);
            }
            setError(null);
            try {
                const next = await getAndroidOutputRoutes();
                if (!cancelled) {
                    setOutputState(next);
                }
            } catch (routeError) {
                if (!cancelled) {
                    setError(
                        routeError instanceof Error
                            ? routeError.message
                            : 'Could not load audio outputs.',
                    );
                }
            } finally {
                if (!cancelled && showLoading) {
                    setIsLoading(false);
                }
            }
        };

        void loadRoutes(true);
        const subscription = subscribeToAndroidOutputRouteEvents((next) => {
            if (cancelled) {
                return;
            }
            setOutputState(next);
            setIsLoading(false);
            setError(null);
        });
        // Active scan can take a few seconds — keep polling while the sheet
        // is open so Chromecast rows populate after the first empty snapshot.
        const refreshTimers: Array<ReturnType<typeof setTimeout>> = [
            400, 900, 1600, 2500, 4000, 6000, 9000, 12_000, 16_000, 22_000,
        ].map((delay) => setTimeout(() => void loadRoutes(false), delay));
        const refreshInterval = setInterval(() => {
            void loadRoutes(false);
        }, 2500);

        return () => {
            cancelled = true;
            subscription.remove();
            refreshTimers.forEach(clearTimeout);
            clearInterval(refreshInterval);
            setSelectingRouteId(null);
        };
    }, [visible]);

    const routes = outputState?.routes ?? EMPTY_OUTPUT_ROUTES;
    const localRoutes = routes.filter((route) => route.kind === 'local');
    const castRoutes = routes.filter((route) => route.kind === 'cast');
    const pickerCastState = outputState?.cast ?? castState;
    const isScanningForCast =
        castRoutes.length === 0 && pickerCastState?.status !== 'unavailable';
    const listScrollYRef = useRef(0);
    const listDragStartYRef = useRef<number | null>(null);
    const listDragStartedAtTopRef = useRef(false);
    const handleListScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        listScrollYRef.current = event.nativeEvent.contentOffset.y;
    }, []);
    const handleListTouchStart = useCallback((event: GestureResponderEvent) => {
        listDragStartYRef.current = event.nativeEvent.pageY;
        listDragStartedAtTopRef.current = listScrollYRef.current <= 2;
    }, []);
    const handleListTouchEnd = useCallback((event: GestureResponderEvent) => {
        const startY = listDragStartYRef.current;
        listDragStartYRef.current = null;

        if (
            startY !== null &&
            listDragStartedAtTopRef.current &&
            event.nativeEvent.pageY - startY > QUEUE_CLOSE_DISTANCE + 18
        ) {
            onClose();
        }
    }, [onClose]);

    const handleSelectRoute = useCallback(
        async (route: AndroidMediaOutputRoute) => {
            if (selectingRouteId) {
                return;
            }
            if (route.isSelected) {
                onClose();
                return;
            }

            setSelectingRouteId(route.id);
            setError(null);
            try {
                const next = await selectAndroidOutputRoute(route);
                setOutputState(next);
                onClose();
            } catch (selectError) {
                setError(
                    selectError instanceof Error
                        ? selectError.message
                        : 'Could not switch audio output.',
                );
            } finally {
                setSelectingRouteId(null);
            }
        },
        [onClose, selectingRouteId],
    );

    // Sending is a hand-off, not a route switch: the queue goes to the server's
    // audio output and the phone pauses. Pause rather than stop so the queue and
    // position survive — taking it back is one tap on the dock.
    const handleSendToSamoRadio = useCallback(
        async (device: SamoRadioDevice) => {
            if (sendingDeviceId) {
                return;
            }
            // Index and items are derived together: dropping an entry the
            // device cannot play renumbers the rest, so reusing the queue's own
            // index here would start it on the wrong track.
            const { items, startIndex } = samoRadioSendPayloadForQueue(getPlaybackQueue());
            if (items.length === 0) {
                setError('Nothing playing that samo-radio can pick up.');
                return;
            }

            setSendingDeviceId(device.id);
            setError(null);
            try {
                await sendToSamoRadio({ deviceId: device.id, items, startIndex });
                await pauseAndroidAudio().catch(() => undefined);
                onClose();
            } catch (sendError) {
                setError(
                    sendError instanceof Error
                        ? sendError.message
                        : `Could not send to ${device.name}.`,
                );
            } finally {
                setSendingDeviceId(null);
            }
        },
        [onClose, sendingDeviceId],
    );

    const renderSamoRadioDevice = (device: SamoRadioDevice) => {
        const isSending = sendingDeviceId === device.id;

        return (
            <Pressable
                accessibilityLabel={`Play to ${device.name}`}
                accessibilityRole="button"
                disabled={Boolean(sendingDeviceId)}
                key={device.id}
                onPress={(event) => {
                    event.stopPropagation();
                    void handleSendToSamoRadio(device);
                }}
                style={({ pressed }) => [
                    styles.outputPickerRow,
                    pressed && styles.outputPickerRowPressed,
                    Boolean(sendingDeviceId) && !isSending && styles.outputPickerRowDisabled,
                ]}
            >
                <View style={styles.outputPickerIcon}>
                    {/* Not "AUX": that glyph already means the phone's own
                        headphone jack in the list above, and two rows reading
                        AUX is exactly the ambiguity this sheet exists to
                        resolve. The style has no textTransform, so the
                        wordmark stays lowercase. */}
                    <Text
                        adjustsFontSizeToFit
                        numberOfLines={1}
                        style={styles.outputPickerIconLabel}
                    >
                        samo
                    </Text>
                </View>
                <View style={styles.outputPickerRowBody}>
                    <Text numberOfLines={1} style={styles.outputPickerTitle}>
                        {device.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.outputPickerSubtitle}>
                        {describeSamoRadioDevice(device)}
                    </Text>
                </View>
                <View style={styles.outputPickerState}>
                    {isSending ? <ActivityIndicator color={colors.accent} size="small" /> : null}
                </View>
            </Pressable>
        );
    };

    const renderRoute = (route: AndroidMediaOutputRoute) => {
        const isSelecting = selectingRouteId === route.id;
        const isDisabled = Boolean(selectingRouteId) || route.isAvailable === false;
        const iconColor = route.isSelected ? colors.accent : colors.text;

        return (
            <Pressable
                accessibilityLabel={`${route.title}${route.subtitle ? `, ${route.subtitle}` : ''}`}
                accessibilityRole="button"
                disabled={isDisabled}
                key={route.id}
                onPress={(event) => {
                    event.stopPropagation();
                    void handleSelectRoute(route);
                }}
                style={({ pressed }) => [
                    styles.outputPickerRow,
                    pressed && styles.outputPickerRowPressed,
                    route.isSelected && styles.outputPickerRowSelected,
                    isDisabled && !isSelecting && styles.outputPickerRowDisabled,
                ]}
            >
                <View
                    style={[
                        styles.outputPickerIcon,
                        route.isSelected && styles.outputPickerIconSelected,
                    ]}
                >
                    {route.kind === 'cast' ? (
                        <CastGlyph color={iconColor} size={20} />
                    ) : (
                        <Text
                            adjustsFontSizeToFit
                            numberOfLines={1}
                            style={[
                                styles.outputPickerIconLabel,
                                route.isSelected && styles.outputPickerIconLabelSelected,
                            ]}
                        >
                            {getOutputRouteGlyphLabel(route)}
                        </Text>
                    )}
                </View>
                <View style={styles.outputPickerRowBody}>
                    <Text numberOfLines={1} style={styles.outputPickerTitle}>
                        {route.title}
                    </Text>
                    {route.subtitle ? (
                        <Text numberOfLines={1} style={styles.outputPickerSubtitle}>
                            {route.subtitle}
                        </Text>
                    ) : null}
                </View>
                <View style={styles.outputPickerState}>
                    {isSelecting ? (
                        <ActivityIndicator color={colors.accent} size="small" />
                    ) : route.isSelected ? (
                        <CheckGlyph color={colors.accent} size={16} />
                    ) : null}
                </View>
            </Pressable>
        );
    };

    return (
        <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
            <Pressable onPress={onClose} style={styles.modalBackdrop}>
                <Pressable
                    onPress={(event) => event.stopPropagation()}
                    style={styles.actionSheet}
                >
                    <View style={styles.actionSheetHandle} />
                    <Text style={styles.actionSheetTitle}>Audio Output</Text>
                    {isLoading && !outputState ? (
                        <View style={styles.outputPickerLoading}>
                            <ActivityIndicator color={colors.accent} size="small" />
                        </View>
                    ) : (
                        <ScrollView
                            contentContainerStyle={styles.outputPickerList}
                            keyboardShouldPersistTaps="handled"
                            nestedScrollEnabled
                            onScroll={handleListScroll}
                            onTouchEnd={handleListTouchEnd}
                            onTouchStart={handleListTouchStart}
                            scrollEventThrottle={16}
                            style={styles.outputPickerScroll}
                        >
                            {localRoutes.length > 0 ? (
                                <>
                                    <Text style={styles.outputPickerSectionLabel}>
                                        Phone and Bluetooth
                                    </Text>
                                    {localRoutes.map(renderRoute)}
                                </>
                            ) : null}
                            {samoRadioDevices.length > 0 ? (
                                <>
                                    <Text style={styles.outputPickerSectionLabel}>
                                        samo-radio
                                    </Text>
                                    {samoRadioDevices.map(renderSamoRadioDevice)}
                                </>
                            ) : null}
                            <Text style={styles.outputPickerSectionLabel}>Chromecast</Text>
                            {castRoutes.length > 0 ? (
                                castRoutes.map(renderRoute)
                            ) : (
                                <Text style={styles.outputPickerEmpty}>
                                    {getCastPickerEmptyMessage(
                                        pickerCastState,
                                        isLoading || isScanningForCast,
                                    )}
                                </Text>
                            )}
                            {error ? (
                                <Text style={styles.outputPickerError}>{error}</Text>
                            ) : null}
                        </ScrollView>
                    )}
                </Pressable>
            </Pressable>
        </Modal>
    );
});
OutputPickerModal.displayName = 'OutputPickerModal';
