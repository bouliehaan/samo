import { getMobileContentSource } from '@samo/core/mobile';
import {
    resolveSamoRadioArtworkUrl,
    type SamoRadioCommand,
    type SamoRadioDevice,
    type SamoRadioState,
    type SamoRadioStationRef,
    samoRadioTransportKind,
} from '@samo/core/server';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { triggerImpact } from '../services/haptics';
import { triggerCatalogSyncNow } from '../services/headless-catalog-sync';
import {
    controlSamoRadio,
    fetchSamoRadioKeepableTrackId,
    keepSamoRadioAiringTrack,
    refreshSamoRadioDeviceState,
    refreshSamoRadioDevices,
    refreshSamoRadioStations,
    setSamoRadioVolume,
    tuneSamoRadio,
} from '../services/samo-radio';
import { useAuthSessionSelector } from '../state/auth-session';
import { patchSamoRadioDeviceState } from '../state/samo-radio';

/**
 * samo-radio as a remote control: one device's state and every command the
 * panel can send it. The phone's Radio tab and the TV's draw this differently;
 * what a press does is decided here, once.
 */

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
export const describeSamoRadioNowPlaying = (
    state: SamoRadioState,
): { subtitle: string; title: string } => {
    if (!state.item) {
        return { subtitle: 'Sink open, nothing playing', title: 'Standby' };
    }
    if (state.mode === 'channel' && state.channel) {
        return {
            subtitle: state.channel.artist ?? state.channel.sourceLabel ?? (state.channel.name ?? ''),
            title: state.channel.title || state.channel.name || state.item.title,
        };
    }
    return { subtitle: state.item.subtitle ?? '', title: state.item.title };
};

/**
 * One line under the title: who it is by, how far in, where in the queue.
 *
 * Each of these used to own a line of its own, which on a channel meant the
 * station's name printed twice — once as the title, once as the subtitle — with
 * a clock underneath. Joined into one line, and with the subtitle dropped when
 * it only repeats the title, the readout is three lines instead of five and
 * says strictly more per line.
 */
export const describeSamoRadioMeta = (
    state: SamoRadioState,
    title: string,
    subtitle: string,
): string => {
    const parts: string[] = [];
    if (subtitle && subtitle !== title) {
        parts.push(subtitle);
    }
    if (state.item) {
        parts.push(
            `${formatClock(state.positionSeconds)}${
                state.durationSeconds ? ` / ${formatClock(state.durationSeconds)}` : ''
            }`,
        );
        if (state.queue && state.queue.length > 1) {
            parts.push(`${state.queueIndex + 1} of ${state.queue.length}`);
        }
    }
    return parts.join('  ·  ');
};

/**
 * Everything a stereo does but rarely: the two off switches, the step off the
 * whole medium, and keeping the airing drop. Words in a menu rather than
 * buttons, because each needs room to say what it actually does.
 */
export type SamoRadioDeviceActionId = 'keep-in-library' | 'next-kind' | 'standby' | 'stop';

export type SamoRadioDeviceAction = { id: SamoRadioDeviceActionId; label: string };

/**
 * One device's status and controls.
 *
 * Per-device rather than one shared block so a command sent to the kitchen does
 * not grey out the living room, and so each card's optimistic volume belongs to
 * the device it is nudging.
 */
export const useSamoRadioDevice = (device: SamoRadioDevice) => {
    const [busyCommand, setBusyCommand] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    // The airing track when keeping it is possible AND permitted, straight from
    // the server. Null covers every "no" there is, so nothing here has to know
    // what an explo folder is.
    const [keepableTrackId, setKeepableTrackId] = useState<string | null>(null);
    const [isKeeping, setIsKeeping] = useState(false);
    // What the keep did, shown where the press happened rather than as a toast:
    // the menu stays up to answer.
    const [keepFeedback, setKeepFeedback] = useState<string | null>(null);
    const mountedRef = useRef(true);
    const settleTimerRef = useRef<null | ReturnType<typeof setTimeout>>(null);
    // For the picture only: the device reports samo-hosted art relative to the
    // server, and the address this device reached samo on is the one it has to
    // be loaded from.
    const serverConnection = useAuthSessionSelector((session) => session.serverConnection);

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
    // station's programming on, or nothing at all. It decides which controls
    // exist, so it is computed once from the device's own state rather than
    // guessed per button.
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
                // Unconditional, unlike the two setState calls below.
                //
                // This response IS the device's new state and it belongs to a
                // module-scope store that outlives this card. Gating it on the
                // card still being mounted threw away the answer to a command
                // whenever the panel went away mid-flight — a screen lock drops
                // Wi-Fi, the offline path empties the device list, every card
                // unmounts, and a level the user had just committed was lost
                // with it.
                patchSamoRadioDeviceState(device.id, next);
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
                }
            }
        },
        [busyCommand, device.id],
    );

    const sendCommand = useCallback(
        (command: SamoRadioCommand) => {
            triggerImpact('light');
            void runCommand(command, () => controlSamoRadio(device.id, command));
            // On a channel the transport commands are asking the station to move
            // on, and its answer arrives after the command's own reply — see
            // CHANNEL_SKIP_SETTLE_MS.
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

    const commitVolume = useCallback(
        (next: number) => {
            triggerImpact('light');
            void runCommand('volume', () => setSamoRadioVolume(device.id, next));
        },
        [device.id, runCommand],
    );

    const tune = useCallback(
        (station: SamoRadioStationRef) => {
            triggerImpact('light');
            void runCommand('tune', () => tuneSamoRadio(device.id, station));
        },
        [device.id, runCommand],
    );

    // What is airing, as an identity rather than a description. A channel
    // reports its now-playing through the device, so a change in these two
    // lines IS the signal that a new song started.
    //
    // Off `transport` rather than off `mode`, which is 'channel' for an
    // internet station too: the two are separate catalogs behind separate id
    // spaces, and a station id sent to the channels route names nothing.
    const channelId = transport === 'channel' ? (state?.channel?.id ?? null) : null;
    const airingKey = channelId
        ? [channelId, state?.channel?.title ?? '', state?.channel?.artist ?? ''].join('\u0000')
        : null;

    // Whether the airing song can be kept, asked once per song.
    //
    // Not folded into the device poll on purpose. The device knows what the
    // channel told it is on; whether that file sits in a drop folder the weekly
    // run empties is a question only samo can answer, and its answer changes
    // exactly when the song does — asking on every five-second tick would
    // double the request rate to re-learn the same thing about the same track.
    //
    // Cleared before each ask so the menu can never offer to keep the song
    // before last, and left cleared on failure: no answer has to mean no offer,
    // or the entry appears and the keep behind it refuses.
    useEffect(() => {
        setKeepableTrackId(null);
        if (!channelId) {
            return;
        }
        const controller = new AbortController();
        void fetchSamoRadioKeepableTrackId(channelId, controller.signal).then((trackId) => {
            if (!controller.signal.aborted && mountedRef.current) {
                setKeepableTrackId(trackId);
            }
        });
        return () => controller.abort();
    }, [airingKey, channelId]);

    const keep = useCallback(async () => {
        if (!keepableTrackId || isKeeping) {
            return;
        }
        triggerImpact('light');
        setIsKeeping(true);
        setKeepFeedback('Keeping…');
        try {
            const response = await keepSamoRadioAiringTrack(keepableTrackId);
            const failure = response.results.find((result) => result.error);
            if (!mountedRef.current) {
                return;
            }
            if (failure?.error) {
                setKeepFeedback(failure.error);
            } else if (response.alreadyInLibrary > 0) {
                // A success, not a no-op — the file was already where the copy
                // would have gone. Saying "kept" would suggest this press did
                // something it did not.
                setKeepFeedback('Already in your library');
            } else {
                setKeepFeedback('Kept in your library');
                // The copy is a NEW track, album and artist. Nothing else on
                // this device knows to go looking for it.
                void triggerCatalogSyncNow();
            }
        } catch (keepError) {
            if (mountedRef.current) {
                setKeepFeedback(
                    keepError instanceof Error ? keepError.message : 'Could not keep this track.',
                );
            }
        } finally {
            if (mountedRef.current) {
                setIsKeeping(false);
            }
        }
    }, [isKeeping, keepableTrackId]);

    const clearKeepFeedback = useCallback(() => setKeepFeedback(null), []);

    const onChannel = transport === 'channel';
    const actions: SamoRadioDeviceAction[] = [];
    // First, because it is the one thing in this menu you came looking for and
    // the only one with a deadline. A drop lives in a folder the weekly run
    // empties, so a song heard once on the radio is gone by Tuesday unless it
    // is copied out. Absent for everything else a station plays: the server
    // decides, so a channel programmed from the ordinary library simply never
    // shows it.
    if (keepableTrackId) {
        actions.push({ id: 'keep-in-library', label: isKeeping ? 'Keeping…' : 'Keep in Library' });
    }
    if (onChannel) {
        // One item is not always the problem: sometimes it is the medium — "not
        // talk right now, put music on". The station steps off the whole kind
        // rather than to the next episode of the same thing.
        actions.push({ id: 'next-kind', label: 'Skip this kind of thing' });
    }
    // Stop hands the output back to its station; standby is the real off
    // switch. Different intentions, both needed on a device whose job is to
    // always be on air.
    actions.push(
        { id: 'stop', label: 'Back to its station' },
        { id: 'standby', label: 'Standby' },
    );

    /** Keep answers in place (the menu stays up for it); the rest are commands
     *  after which the caller's menu should close. */
    const runAction = useCallback(
        (id: SamoRadioDeviceActionId) => {
            if (id === 'keep-in-library') {
                void keep();
                return;
            }
            sendCommand(id);
        },
        [keep, sendCommand],
    );

    const now = state ? describeSamoRadioNowPlaying(state) : null;
    return {
        actions,
        artworkUrl:
            serverConnection && state
                ? resolveSamoRadioArtworkUrl(serverConnection, state)
                : undefined,
        busyCommand,
        canStep: transport !== 'none',
        clearKeepFeedback,
        commitVolume,
        contentSource: serverConnection ? getMobileContentSource(serverConnection) : undefined,
        error,
        isPaused: state?.status === 'paused',
        isTogglingPlayback: busyCommand === 'pause' || busyCommand === 'resume',
        keepFeedback,
        meta: state && now ? describeSamoRadioMeta(state, now.title, now.subtitle) : '',
        now,
        onChannel,
        runAction,
        sendCommand,
        serverConnection,
        state,
        tune,
    };
};

/**
 * Poll the server's devices and stations while `enabled` and the app is in
 * the foreground.
 *
 * Neither is safe to assume. A radio surface can stay mounted while nobody is
 * looking at it, so a bare interval keeps hitting the server from a page
 * nobody can see. And a media app spends most of its life with the screen off,
 * where a 5-second network poll is a battery leak buying a readout nobody can
 * see.
 */
export const useSamoRadioPolling = (enabled: boolean): void => {
    const [isForeground, setIsForeground] = useState(() => AppState.currentState === 'active');

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (next: AppStateStatus) =>
            setIsForeground(next === 'active'),
        );
        return () => subscription.remove();
    }, []);

    const isPolling = enabled && isForeground;

    useEffect(() => {
        if (!isPolling) {
            return;
        }
        const controller = new AbortController();
        // Refresh on the way in as well as on the tick, so returning shows
        // current state immediately instead of up to 5s stale.
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
};
