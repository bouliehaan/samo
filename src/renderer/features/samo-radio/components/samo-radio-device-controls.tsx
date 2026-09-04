import {
    SAMO_CHANNEL_SKIP_SETTLE_MS,
    type SamoRadioCommand,
    type SamoRadioDevice,
    type SamoRadioState,
    type SamoRadioStationRef,
    samoRadioTransportKind,
} from '@samo/core/server';
import { useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import styles from './samo-radio-device-controls.module.css';

import { invalidateLibraryQueries } from '/@/renderer/features/playlists/mutations/playlist-invalidation';
import {
    commandSamoRadio,
    fetchSamoRadioKeepableTrackId,
    getSamoRadioServer,
    keepSamoRadioAiringTrack,
    setSamoRadioVolume,
    tuneSamoRadio,
} from '/@/renderer/features/samo-radio/api/samo-radio-api';
import { refreshSamoRadioDeviceState } from '/@/renderer/features/samo-radio/hooks/use-samo-radio-polling';
import {
    patchSamoRadioDeviceState,
    useSamoRadioStations,
} from '/@/renderer/store/samo-radio.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Icon } from '/@/shared/components/icon/icon';
import { Slider } from '/@/shared/components/slider/slider';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';

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
            subtitle: state.channel.artist ?? state.channel.sourceLabel ?? state.channel.name ?? '',
            title: state.channel.title || state.channel.name || state.item.title,
        };
    }

    return { subtitle: state.item.subtitle ?? '', title: state.item.title };
};

const volumeIcon = (volume: number) => {
    if (volume <= 0) return 'volumeMute' as const;
    return volume < 0.5 ? ('volumeNormal' as const) : ('volumeMax' as const);
};

interface SamoRadioDeviceControlsProps {
    /** Tighter layout for the playerbar popover. Same controls either way. */
    compact?: boolean;
    device: SamoRadioDevice;
}

/**
 * One device's status and controls.
 *
 * Per-device rather than one shared block so a command sent to the kitchen does
 * not grey out the living room, and so each card's optimistic volume belongs to
 * the device it is nudging.
 */
export const SamoRadioDeviceControls = memo(
    ({ compact = false, device }: SamoRadioDeviceControlsProps) => {
        const stations = useSamoRadioStations();
        const queryClient = useQueryClient();
        const [busyCommand, setBusyCommand] = useState<null | string>(null);
        const [isTuneOpen, setIsTuneOpen] = useState(false);
        const [error, setError] = useState<null | string>(null);
        // The airing track when keeping it is possible AND permitted, straight
        // from the server. Null covers every "no" there is, so nothing here has
        // to know what an explo folder is.
        const [keepableTrackId, setKeepableTrackId] = useState<null | string>(null);
        const [isKeeping, setIsKeeping] = useState(false);
        // Optimistic volume: the slider must move under the cursor, not on the
        // next poll. It is cleared when the volume command settles rather than
        // by the poller, so a refresh landing mid-drag cannot snap it back.
        const [pendingVolume, setPendingVolume] = useState<null | number>(null);
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
                        patchSamoRadioDeviceState(device.id, next);
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
            [busyCommand, device.id],
        );

        const sendCommand = useCallback(
            (command: SamoRadioCommand) => {
                void runCommand(command, () => commandSamoRadio(device.id, command));

                // On a channel the transport commands are asking the station to
                // move on, and its answer arrives after the command's own reply
                // — see SAMO_CHANNEL_SKIP_SETTLE_MS.
                if (
                    transport === 'channel' &&
                    (command === 'next' || command === 'next-kind' || command === 'previous')
                ) {
                    if (settleTimerRef.current) {
                        clearTimeout(settleTimerRef.current);
                    }
                    settleTimerRef.current = setTimeout(() => {
                        void refreshSamoRadioDeviceState(device.id);
                    }, SAMO_CHANNEL_SKIP_SETTLE_MS);
                }
            },
            [device.id, runCommand, transport],
        );

        const handleTune = useCallback(
            (station: SamoRadioStationRef) => {
                setIsTuneOpen(false);
                void runCommand('tune', () => tuneSamoRadio(device.id, station));
            },
            [device.id, runCommand],
        );

        const commitVolume = useCallback(
            (next: number) => {
                void runCommand('volume', () => setSamoRadioVolume(device.id, next / 100));
            },
            [device.id, runCommand],
        );

        // What is airing, as an identity rather than a description. A channel
        // reports its now-playing through the device, so a change in these two
        // lines IS the signal that a new song started.
        //
        // Off `transport` rather than off `mode`, which is 'channel' for an
        // internet station too: the two are separate catalogs behind separate
        // id spaces, and a station id sent to the channels route names nothing.
        const airingChannelId = transport === 'channel' ? (state?.channel?.id ?? null) : null;
        const airingKey = airingChannelId
            ? [airingChannelId, state?.channel?.title ?? '', state?.channel?.artist ?? ''].join(
                  '\u0000',
              )
            : null;

        // Whether the airing song can be kept, asked once per song.
        //
        // Not folded into the device poll on purpose. The device knows what the
        // channel told it is on; whether that file sits in a drop folder the
        // weekly run empties is a question only samo can answer, and its answer
        // changes exactly when the song does — asking on every tick would
        // double this panel's request rate to re-learn the same thing about the
        // same track.
        //
        // Cleared before each ask so the control can never offer to keep the
        // song before last, and left cleared on failure: no answer has to mean
        // no offer, or the button appears and the keep behind it refuses.
        useEffect(() => {
            setKeepableTrackId(null);
            if (!airingChannelId) {
                return;
            }

            const controller = new AbortController();
            void fetchSamoRadioKeepableTrackId(airingChannelId, controller.signal).then(
                (trackId) => {
                    if (!controller.signal.aborted && mountedRef.current) {
                        setKeepableTrackId(trackId);
                    }
                },
            );

            return () => controller.abort();
        }, [airingChannelId, airingKey]);

        const handleKeep = useCallback(async () => {
            if (!keepableTrackId || isKeeping) {
                return;
            }

            setIsKeeping(true);
            try {
                const response = await keepSamoRadioAiringTrack(keepableTrackId);
                const failure = response.results.find((result) => result.error);

                if (failure?.error) {
                    toast.warn({ message: failure.error, title: 'Could not keep this track' });
                } else if (response.alreadyInLibrary > 0) {
                    // A success, not a no-op — the file was already where the
                    // copy would have gone. Saying "kept" would suggest this
                    // click did something it did not.
                    toast.success({ message: 'Already in your library' });
                } else {
                    toast.success({ message: 'Kept in your library' });
                    // The copy is a NEW track, in an album, under an artist,
                    // changing the counts on all three. Nothing else on screen
                    // knows to go looking for it.
                    invalidateLibraryQueries(queryClient, getSamoRadioServer()?.id);
                }
            } catch (keepError) {
                toast.error({
                    message:
                        keepError instanceof Error
                            ? keepError.message
                            : 'Could not keep this track.',
                });
            } finally {
                if (mountedRef.current) {
                    setIsKeeping(false);
                }
            }
        }, [isKeeping, keepableTrackId, queryClient]);

        // Only devices samo can reach are ever in the store, so a card without a
        // state snapshot is one that dropped off between a poll and this render
        // — it is already on its way out of the list. Nothing to draw, and
        // certainly not a row of controls that would all fail.
        if (!state) {
            return null;
        }

        const now = describeNowPlaying(state);
        const volume = Math.round((pendingVolume ?? state.volume ?? 0) * 100);
        const isPlaying = state.status === 'playing' || state.status === 'buffering';
        const isBusy = busyCommand !== null;
        const hasTransport = transport !== 'none';
        const tunedStationId = state.channel?.id ?? null;
        const showClock =
            transport === 'queue' && (state.durationSeconds ?? 0) > 0 && !state.item?.live;

        return (
            <div className={clsx(styles.controls, compact && styles.compact)}>
                <div className={styles.now}>
                    <span className={styles.deviceIcon}>
                        <Icon icon="radio" size={compact ? 'md' : 'lg'} />
                    </span>
                    <div className={styles.nowBody}>
                        <Text className={styles.deviceName} size="sm">
                            {device.name}
                            {state.status === 'paused' ? ' · Paused' : ''}
                            {state.status === 'buffering' ? ' · Buffering' : ''}
                        </Text>
                        <Text className={styles.title} fw={600} lineClamp={1}>
                            {now.title}
                        </Text>
                        {now.subtitle ? (
                            <Text className={styles.subtitle} lineClamp={1} size="sm">
                                {now.subtitle}
                            </Text>
                        ) : null}
                    </div>
                    {showClock ? (
                        <Text className={styles.clock} size="sm">
                            {formatClock(state.positionSeconds)} /{' '}
                            {formatClock(state.durationSeconds ?? 0)}
                        </Text>
                    ) : null}
                </div>

                <div className={styles.transport}>
                    <ActionIcon
                        disabled={isBusy || !hasTransport}
                        icon="mediaPrevious"
                        iconProps={{ size: 'lg' }}
                        onClick={() => sendCommand('previous')}
                        size="sm"
                        tooltip={{
                            label:
                                transport === 'channel'
                                    ? 'Back a programme on this station'
                                    : 'Previous',
                            openDelay: 300,
                        }}
                        variant="subtle"
                    />
                    {/* White circle, like the playerbar's own play button — the
                        primary action here should read the same way it does
                        three inches below. */}
                    <ActionIcon
                        className={styles.playButton}
                        disabled={isBusy}
                        icon={isPlaying ? 'mediaPause' : 'mediaPlay'}
                        iconProps={{ size: 'lg' }}
                        onClick={() => sendCommand(isPlaying ? 'pause' : 'resume')}
                        radius="xl"
                        size="md"
                        tooltip={{ label: isPlaying ? 'Pause' : 'Play', openDelay: 300 }}
                        variant="white"
                    />
                    <ActionIcon
                        disabled={isBusy || !hasTransport}
                        icon="mediaNext"
                        iconProps={{ size: 'lg' }}
                        onClick={() => sendCommand('next')}
                        size="sm"
                        tooltip={{
                            label:
                                transport === 'channel'
                                    ? 'Skip what this station is airing'
                                    : 'Next',
                            openDelay: 300,
                        }}
                        variant="subtle"
                    />
                    {transport === 'channel' ? (
                        <ActionIcon
                            disabled={isBusy}
                            icon="mediaShuffle"
                            onClick={() => sendCommand('next-kind')}
                            size="sm"
                            tooltip={{
                                label: 'Skip to a different kind of programme',
                                openDelay: 300,
                            }}
                            variant="subtle"
                        />
                    ) : null}

                    <div className={styles.volume}>
                        <Icon icon={volumeIcon(volume / 100)} size="sm" />
                        <Slider
                            className={styles.volumeSlider}
                            label={null}
                            max={100}
                            min={0}
                            onChange={setPendingVolume}
                            onChangeEnd={commitVolume}
                            step={1}
                            value={pendingVolume ?? volume}
                        />
                    </div>

                    {busyCommand ? <Spinner size={14} /> : null}
                </div>

                <div className={styles.secondary}>
                    <button
                        className={clsx(styles.linkButton, isTuneOpen && styles.linkButtonActive)}
                        disabled={stations.length === 0}
                        onClick={() => setIsTuneOpen((open) => !open)}
                        type="button"
                    >
                        Tune
                        <Icon icon={isTuneOpen ? 'arrowUpS' : 'arrowDownS'} size="sm" />
                    </button>
                    {/* Beside Tune rather than beside the off switches: this is
                        about what is playing, not about the device. It appears
                        only while the station is airing an Explore drop — a
                        file the weekly run deletes — so a station programmed
                        from the ordinary library never shows it, and the row is
                        the Tune / Stop / Standby it has always been. */}
                    {keepableTrackId ? (
                        <button
                            className={styles.linkButton}
                            disabled={isKeeping}
                            onClick={() => void handleKeep()}
                            type="button"
                        >
                            <Icon icon="download" size="sm" />
                            {isKeeping ? 'Keeping…' : 'Keep in library'}
                        </button>
                    ) : null}
                    <span className={styles.secondarySpacer} />
                    {/* Stop hands the device back to its station; standby is the
                        real off switch. Both exist because "stop this podcast"
                        and "silence the room" are different intentions on a
                        device whose job is to always be on air. */}
                    {/* No icon: the only square-ish stop glyph reads as an
                        unchecked checkbox next to a word, and Standby beside it
                        has none either. */}
                    <button
                        className={styles.linkButton}
                        disabled={isBusy}
                        onClick={() => sendCommand('stop')}
                        type="button"
                    >
                        Stop
                    </button>
                    <button
                        className={styles.linkButton}
                        disabled={isBusy}
                        onClick={() => sendCommand('standby')}
                        type="button"
                    >
                        Standby
                    </button>
                </div>

                {isTuneOpen ? (
                    <div className={styles.stations}>
                        {stations.map((station) => (
                            <button
                                className={clsx(
                                    styles.station,
                                    station.id === tunedStationId && styles.stationActive,
                                )}
                                key={`${station.kind}:${station.id}`}
                                onClick={() => handleTune(station)}
                                type="button"
                            >
                                <Icon icon="radio" size="sm" />
                                <span className={styles.stationName}>{station.name}</span>
                                <span className={styles.stationKind}>
                                    {station.kind === 'channel' ? 'Channel' : 'Internet'}
                                </span>
                            </button>
                        ))}
                    </div>
                ) : null}

                {error ? (
                    <Text c="red" size="sm">
                        {error}
                    </Text>
                ) : null}
            </div>
        );
    },
);

SamoRadioDeviceControls.displayName = 'SamoRadioDeviceControls';
