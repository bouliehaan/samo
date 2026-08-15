import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    AppState,
    type AppStateStatus,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';

import {
    type SamoRadioCommand,
    type SamoRadioDevice,
    type SamoRadioStationRef,
    type SamoRadioState,
    samoRadioTransportKind,
} from '@samo/core/server';

import { triggerImpact } from '../services/haptics';
import {
    controlSamoRadio,
    refreshSamoRadioDeviceState,
    refreshSamoRadioDevices,
    refreshSamoRadioStations,
    setSamoRadioVolume,
    tuneSamoRadio,
} from '../services/samo-radio';
import { useAppNavigationSelector } from '../state/app-navigation';
import { patchSamoRadioDeviceState, useSamoRadioSelector } from '../state/samo-radio';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';

const VOLUME_STEP = 0.05;
const POLL_INTERVAL_MS = 5000;

/**
 * How long to wait before re-reading state after skipping on a channel.
 *
 * A channel skip is a request to the STATION, not a local seek: the device
 * forwards it, throws away the seconds of audio it had already pulled down the
 * pipe, and only then does the channel report what is now airing. The command's
 * own response still describes the programme being skipped, so without this the
 * readout keeps showing it and the button looks broken. Same wait the web panel
 * uses.
 */
const CHANNEL_SKIP_SETTLE_MS = 1200;

const formatClock = (seconds: number): string => {
    const total = Math.max(0, Math.floor(seconds || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const pad = (value: number) => String(value).padStart(2, '0');
    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
};

/**
 * What the aux port is playing, in one line each.
 *
 * On a channel the item is the station, so the interesting part — what is
 * actually airing — comes from the channel's own now-playing, which the device
 * polls from the server.
 */
const describeNowPlaying = (state: SamoRadioState): { subtitle: string; title: string } => {
    if (!state.item) {
        return { subtitle: 'Sink open, nothing playing', title: 'Standby' };
    }
    if (state.mode === 'channel' && state.channel) {
        return {
            subtitle:
                state.channel.artist ?? state.channel.sourceLabel ?? (state.channel.name ?? ''),
            title: state.channel.title || state.channel.name || state.item.title,
        };
    }
    return { subtitle: state.item.subtitle ?? '', title: state.item.title };
};

/**
 * One device's status and controls.
 *
 * Per-device rather than one shared block so a command sent to the kitchen does
 * not grey out the living room, and so each card's optimistic volume belongs to
 * the device it is nudging.
 */
const SamoRadioDeviceCard = memo(
    ({
        device,
        onState,
        stations,
    }: {
        device: SamoRadioDevice;
        onState: (deviceId: string, state: SamoRadioState) => void;
        stations: SamoRadioStationRef[];
    }) => {
        const [busyCommand, setBusyCommand] = useState<string | null>(null);
        const [isTuneOpen, setIsTuneOpen] = useState(false);
        const [error, setError] = useState<string | null>(null);
        // Optimistic volume: the readout must move on tap, not on the next poll.
        // It is cleared when the volume command settles rather than by the
        // poller, so a refresh landing mid-tap cannot snap the number back.
        const [pendingVolume, setPendingVolume] = useState<number | null>(null);
        const mountedRef = useRef(true);
        const settleTimerRef = useRef<null | ReturnType<typeof setTimeout>>(null);

        useEffect(() => {
            mountedRef.current = true;
            return () => {
                mountedRef.current = false;
                if (settleTimerRef.current) {
                    clearTimeout(settleTimerRef.current);
                }
            };
        }, []);

        const state = device.state ?? null;
        // What PREV/NEXT would actually do here — advance a queue, move the
        // station's programming on, or nothing at all. It decides which
        // controls exist, so it is computed once from the device's own state
        // rather than guessed per button.
        const transport = state ? samoRadioTransportKind(state) : 'none';

        const runCommand = useCallback(
            async (action: string, run: () => Promise<SamoRadioState>) => {
                if (busyCommand) {
                    return;
                }
                setBusyCommand(action);
                setError(null);
                try {
                    const next = await run();
                    if (mountedRef.current) {
                        onState(device.id, next);
                    }
                } catch (commandError) {
                    if (mountedRef.current) {
                        setError(
                            commandError instanceof Error
                                ? commandError.message
                                : 'samo-radio did not respond.',
                        );
                    }
                } finally {
                    if (mountedRef.current) {
                        setBusyCommand(null);
                        if (action === 'volume') {
                            setPendingVolume(null);
                        }
                    }
                }
            },
            [busyCommand, device.id, onState],
        );

        const sendCommand = useCallback(
            (command: SamoRadioCommand) => {
                triggerImpact('light');
                void runCommand(command, () => controlSamoRadio(device.id, command));
                // On a channel the transport commands are asking the station to
                // move on, and its answer arrives after the command's own reply
                // — see CHANNEL_SKIP_SETTLE_MS.
                if (
                    transport === 'channel' &&
                    (command === 'next' || command === 'next-kind' || command === 'previous')
                ) {
                    if (settleTimerRef.current) {
                        clearTimeout(settleTimerRef.current);
                    }
                    settleTimerRef.current = setTimeout(() => {
                        void refreshSamoRadioDeviceState(device.id);
                    }, CHANNEL_SKIP_SETTLE_MS);
                }
            },
            [device.id, runCommand, transport],
        );

        const nudgeVolume = useCallback(
            (delta: number) => {
                if (!state || busyCommand) {
                    return;
                }
                const base = pendingVolume ?? state.volume ?? 0;
                const next = Math.min(1, Math.max(0, Number((base + delta).toFixed(2))));
                setPendingVolume(next);
                triggerImpact('light');
                void runCommand('volume', () => setSamoRadioVolume(device.id, next));
            },
            [busyCommand, device.id, pendingVolume, runCommand, state],
        );

        // Only devices Samo can reach are ever in the store, so a card without
        // a state snapshot is one that dropped off between a poll and this
        // render — it is already on its way out of the list. Nothing to draw,
        // and certainly not a row of controls that would all fail.
        if (!state) {
            return null;
        }

        const now = describeNowPlaying(state);
        const volume = Math.round((pendingVolume ?? state.volume ?? 0) * 100);
        const isPaused = state.status === 'paused';
        const onChannel = transport === 'channel';
        const canStep = transport !== 'none';

        return (
            <View style={styles.samoRadioPanel}>
                <View style={styles.samoRadioHead}>
                    <Text style={styles.samoRadioEyebrow}>{device.name}</Text>
                    <Text style={styles.samoRadioStatus}>{state.status.toUpperCase()}</Text>
                </View>

                <Text numberOfLines={1} style={styles.samoRadioTitle}>
                    {now.title}
                </Text>
                {now.subtitle ? (
                    <Text numberOfLines={1} style={styles.samoRadioSubtitle}>
                        {now.subtitle}
                    </Text>
                ) : null}
                {state.item ? (
                    <Text style={styles.samoRadioMeta}>
                        {formatClock(state.positionSeconds)}
                        {state.durationSeconds ? ` / ${formatClock(state.durationSeconds)}` : ''}
                        {state.queue && state.queue.length > 1
                            ? `  ·  ${state.queueIndex + 1} of ${state.queue.length}`
                            : ''}
                    </Text>
                ) : null}

                <View style={styles.samoRadioControls}>
                    {/* On a channel these move the STATION on — everyone
                        listening hears it — so they are worded as the station's
                        programming rather than as your queue. An internet
                        station is somebody else's stream with nothing to skip
                        to, and the device refuses: no buttons there. */}
                    {canStep ? (
                        <Pressable
                            accessibilityLabel={
                                onChannel ? 'Back to the previous programme' : 'Previous'
                            }
                            accessibilityRole="button"
                            onPress={() => sendCommand('previous')}
                            style={styles.samoRadioButton}
                        >
                            <Text style={styles.samoRadioButtonText}>
                                {onChannel ? 'BACK' : 'PREV'}
                            </Text>
                        </Pressable>
                    ) : null}
                    <Pressable
                        accessibilityLabel={isPaused ? 'Resume' : 'Pause'}
                        accessibilityRole="button"
                        onPress={() => sendCommand(isPaused ? 'resume' : 'pause')}
                        style={[styles.samoRadioButton, styles.samoRadioButtonPrimary]}
                    >
                        {busyCommand === 'pause' || busyCommand === 'resume' ? (
                            <ActivityIndicator color={colors.background} size="small" />
                        ) : (
                            <Text
                                style={[
                                    styles.samoRadioButtonText,
                                    styles.samoRadioButtonTextPrimary,
                                ]}
                            >
                                {isPaused ? 'PLAY' : 'PAUSE'}
                            </Text>
                        )}
                    </Pressable>
                    {canStep ? (
                        <Pressable
                            accessibilityLabel={
                                onChannel ? 'Skip what the station is playing' : 'Next'
                            }
                            accessibilityRole="button"
                            onPress={() => sendCommand('next')}
                            style={styles.samoRadioButton}
                        >
                            <Text style={styles.samoRadioButtonText}>
                                {onChannel ? 'SKIP' : 'NEXT'}
                            </Text>
                        </Pressable>
                    ) : null}
                    {/* One item is not always the problem: sometimes it is the
                        medium — "not talk right now, put music on". The station
                        steps off the whole kind rather than to the next episode
                        of the same thing. */}
                    {onChannel ? (
                        <Pressable
                            accessibilityLabel="Skip to a different kind of media"
                            accessibilityRole="button"
                            onPress={() => sendCommand('next-kind')}
                            style={styles.samoRadioButton}
                        >
                            <Text style={styles.samoRadioButtonText}>NEXT MEDIA TYPE</Text>
                        </Pressable>
                    ) : null}
                    {/* Stop hands the aux back to its station; standby is
                        the real off switch. Different intentions, both
                        needed on a device whose job is to always be on air. */}
                    <Pressable
                        accessibilityLabel="Back to station"
                        accessibilityRole="button"
                        onPress={() => sendCommand('stop')}
                        style={styles.samoRadioButton}
                    >
                        <Text style={styles.samoRadioButtonText}>STATION</Text>
                    </Pressable>
                    <Pressable
                        accessibilityLabel="Standby"
                        accessibilityRole="button"
                        onPress={() => sendCommand('standby')}
                        style={styles.samoRadioButton}
                    >
                        <Text style={styles.samoRadioButtonText}>OFF</Text>
                    </Pressable>
                </View>

                <View style={styles.samoRadioControls}>
                    <Pressable
                        accessibilityLabel="Volume down"
                        accessibilityRole="button"
                        onPress={() => nudgeVolume(-VOLUME_STEP)}
                        style={styles.samoRadioButton}
                    >
                        <Text style={styles.samoRadioButtonText}>VOL −</Text>
                    </Pressable>
                    <Text style={styles.samoRadioVolume}>{volume}%</Text>
                    <Pressable
                        accessibilityLabel="Volume up"
                        accessibilityRole="button"
                        onPress={() => nudgeVolume(VOLUME_STEP)}
                        style={styles.samoRadioButton}
                    >
                        <Text style={styles.samoRadioButtonText}>VOL +</Text>
                    </Pressable>
                    {stations.length > 0 ? (
                        <Pressable
                            accessibilityLabel="Tune to a channel"
                            accessibilityRole="button"
                            onPress={() => {
                                triggerImpact('light');
                                setIsTuneOpen((open) => !open);
                            }}
                            style={styles.samoRadioButton}
                        >
                            <Text style={styles.samoRadioButtonText}>
                                {isTuneOpen ? 'CLOSE' : 'TUNE'}
                            </Text>
                        </Pressable>
                    ) : null}
                </View>

                {isTuneOpen && stations.length > 0 ? (
                    <ScrollView
                        contentContainerStyle={styles.samoRadioChannelRow}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                    >
                        {stations.map((station) => (
                            <Pressable
                                accessibilityLabel={`Tune to ${station.name ?? station.id}`}
                                accessibilityRole="button"
                                key={`${station.kind}:${station.id}`}
                                onPress={() => {
                                    triggerImpact('light');
                                    setIsTuneOpen(false);
                                    void runCommand('tune', () =>
                                        tuneSamoRadio(device.id, station),
                                    );
                                }}
                                style={[
                                    styles.samoRadioChannelChip,
                                    state.channel?.id === station.id &&
                                        styles.samoRadioChannelChipActive,
                                ]}
                            >
                                <Text numberOfLines={1} style={styles.samoRadioChannelText}>
                                    {station.name ?? station.id}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                ) : null}

                {error ? <Text style={styles.samoRadioError}>{error}</Text> : null}
            </View>
        );
    },
);
SamoRadioDeviceCard.displayName = 'SamoRadioDeviceCard';

/**
 * The samo-radio control surface on the phone.
 *
 * Playback lives on the server, so this is a remote: it renders each device's
 * own state and posts commands back. It polls rather than holding a stream
 * open — a phone that sleeps mid-SSE learns nothing, and a full snapshot every
 * few seconds is both cheaper and always correct on wake.
 */
export const SamoRadioPanel = memo(() => {
    // The device list is shared with the output picker and every long-press
    // menu, so it lives in a store rather than here: this panel is the surface
    // that polls it, not the one that owns it.
    const devices = useSamoRadioSelector((state) => state.devices);
    const stations = useSamoRadioSelector((state) => state.stations);

    // A command's response IS the new state, so it lands straight in the list
    // instead of waiting for the next poll to catch up.
    const handleDeviceState = useCallback((deviceId: string, state: SamoRadioState) => {
        patchSamoRadioDeviceState(deviceId, state);
    }, []);

    // Poll ONLY while the Radio tab is on screen and the app is in the
    // foreground.
    //
    // Neither is safe to assume. Tab scenes are not unmounted on switch — the
    // three most recent stay mounted and react-freeze only suspends their
    // *rendering* — so a bare interval here keeps hitting the server from a tab
    // nobody is looking at. And a media app spends most of its life with the
    // screen off, where a 5-second network poll is a battery leak buying a
    // readout nobody can see.
    const isRadioTabActive = useAppNavigationSelector((state) => state.activeTab === 'radio');
    const [isForeground, setIsForeground] = useState(() => AppState.currentState === 'active');

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (next: AppStateStatus) =>
            setIsForeground(next === 'active'),
        );
        return () => subscription.remove();
    }, []);

    const isPolling = isRadioTabActive && isForeground;

    useEffect(() => {
        if (!isPolling) {
            return;
        }
        const controller = new AbortController();
        // Refresh on the way in as well as on the tick, so returning to the tab
        // shows current state immediately instead of up to 5s stale.
        void refreshSamoRadioDevices(controller.signal);
        void refreshSamoRadioStations(controller.signal);
        const interval = setInterval(() => {
            void refreshSamoRadioDevices(controller.signal);
        }, POLL_INTERVAL_MS);
        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, [isPolling]);

    // No device the server can reach right now — a server without samo-radio,
    // one whose device has never been paired, or one that is switched off.
    // Render nothing at all rather than a panel of dead controls explaining a
    // feature this install may not even have.
    if (devices.length === 0) {
        return null;
    }

    return (
        <>
            {devices.map((device) => (
                <SamoRadioDeviceCard
                    device={device}
                    key={device.id}
                    onState={handleDeviceState}
                    stations={stations}
                />
            ))}
        </>
    );
});
SamoRadioPanel.displayName = 'SamoRadioPanel';
