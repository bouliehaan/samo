import { memo, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
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

import {
    DownloadGlyph,
    MediaKindGlyph,
    MoreGlyph,
    PlayPauseGlyph,
    PowerGlyph,
    RadioWaveGlyph,
    StationReturnGlyph,
    TrackSkipGlyph,
} from './Glyphs';
import { MotionSheet } from './MotionSheet';
import { PressableScale } from './PressableScale';
import { SamoRadioVolumeSlider } from './SamoRadioVolumeSlider';
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
import { useAppNavigationSelector } from '../state/app-navigation';
import { presses } from '../theme/motion';
import { patchSamoRadioDeviceState, useSamoRadioSelector } from '../state/samo-radio';
import { styles } from '../theme/styles';
import { colors } from '../theme/tokens';

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
 * One line under the title: who it is by, how far in, where in the queue.
 *
 * Each of these used to own a line of its own, which on a channel meant the
 * station's name printed twice — once as the title, once as the subtitle — with
 * a clock underneath. Joined into one line, and with the subtitle dropped when
 * it only repeats the title, the readout is three lines instead of five and
 * says strictly more per line.
 */
const describeMeta = (state: SamoRadioState, title: string, subtitle: string): string => {
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
 * A transport control on the panel.
 *
 * Same shape as the player's own `PlayerIconButton` — borderless glyph, one
 * filled primary — at the smaller size a card inside a scroll page can carry.
 * `chrome` because the row is fixed furniture within the card: nothing under
 * the thumb here is going to turn into a scroll, so the press starts sinking on
 * the frame the finger lands rather than after the scroll-safety window.
 */
const SamoRadioIconButton = ({
    accessibilityLabel,
    children,
    onPress,
    primary,
}: {
    accessibilityLabel: string;
    children: ReactNode;
    onPress: () => void;
    primary?: boolean;
}) => (
    <PressableScale
        {...presses.control}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        chrome
        onPress={onPress}
        style={[styles.samoRadioIconButton, primary && styles.samoRadioIconButtonPrimary]}
    >
        {children}
    </PressableScale>
);

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
        const [isMenuOpen, setIsMenuOpen] = useState(false);
        const [error, setError] = useState<string | null>(null);
        // The airing track when keeping it is possible AND permitted, straight
        // from the server. Null covers every "no" there is, so nothing here has
        // to know what an explo folder is.
        const [keepableTrackId, setKeepableTrackId] = useState<string | null>(null);
        const [isKeeping, setIsKeeping] = useState(false);
        // What the keep did, shown inside the sheet rather than as a toast: the
        // sheet is where the tap happened and it stays up to answer.
        const [keepFeedback, setKeepFeedback] = useState<string | null>(null);
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
                    // Unconditional, unlike the two setState calls below.
                    //
                    // This response IS the device's new state and it belongs to
                    // a module-scope store that outlives this card. Gating it on
                    // the card still being mounted threw away the answer to a
                    // command whenever the panel went away mid-flight — a
                    // screen lock drops Wi-Fi, the offline path empties the
                    // device list, every card unmounts, and a level the user
                    // had just committed was lost with it.
                    onState(device.id, next);
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

        const commitVolume = useCallback(
            (next: number) => {
                triggerImpact('light');
                void runCommand('volume', () => setSamoRadioVolume(device.id, next));
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
        const channelId = transport === 'channel' ? (state?.channel?.id ?? null) : null;
        const airingKey = channelId
            ? [channelId, state?.channel?.title ?? '', state?.channel?.artist ?? ''].join('\u0000')
            : null;

        // Whether the airing song can be kept, asked once per song.
        //
        // Not folded into the device poll on purpose. The device knows what the
        // channel told it is on; whether that file sits in a drop folder the
        // weekly run empties is a question only samo can answer, and its answer
        // changes exactly when the song does — asking on every five-second tick
        // would double this screen's request rate to re-learn the same thing
        // about the same track.
        //
        // Cleared before each ask so the sheet can never offer to keep the
        // song before last, and left cleared on failure: no answer has to mean
        // no offer, or the entry appears and the keep behind it refuses.
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

        const handleKeep = useCallback(async () => {
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
                    // A success, not a no-op — the file was already where the
                    // copy would have gone. Saying "kept" would suggest this
                    // tap did something it did not.
                    setKeepFeedback('Already in your library');
                } else {
                    setKeepFeedback('Kept in your library');
                    // The copy is a NEW track, album and artist. Nothing else
                    // on the phone knows to go looking for it.
                    void triggerCatalogSyncNow();
                }
            } catch (keepError) {
                if (mountedRef.current) {
                    setKeepFeedback(
                        keepError instanceof Error
                            ? keepError.message
                            : 'Could not keep this track.',
                    );
                }
            } finally {
                if (mountedRef.current) {
                    setIsKeeping(false);
                }
            }
        }, [isKeeping, keepableTrackId]);

        const closeMenu = useCallback(() => setIsMenuOpen(false), []);

        // Only devices samo can reach are ever in the store, so a card without
        // a state snapshot is one that dropped off between a poll and this
        // render — it is already on its way out of the list. Nothing to draw,
        // and certainly not a row of controls that would all fail.
        if (!state) {
            return null;
        }

        const now = describeNowPlaying(state);
        const meta = describeMeta(state, now.title, now.subtitle);
        const isPaused = state.status === 'paused';
        const onChannel = transport === 'channel';
        const canStep = transport !== 'none';
        const isTogglingPlayback = busyCommand === 'pause' || busyCommand === 'resume';

        // Everything a stereo does but rarely: the two off switches, and the
        // step off the whole medium. They were six shouting mono buttons that
        // wrapped onto three lines and buried play/pause among them; here they
        // are words in a sheet, which has room to say what they actually do.
        //
        // Each row carries its own onPress rather than a command id, because
        // not everything in here is a command to the device — and not
        // everything dismisses the sheet.
        const menuActions: { glyph: ReactNode; id: string; label: string; onPress: () => void }[] =
            [];
        // First, because it is the one thing in this sheet you came looking for
        // and the only one with a deadline. A drop lives in a folder the weekly
        // run empties, so a song heard once on the radio is gone by Tuesday
        // unless it is copied out — which until now meant leaving the room,
        // opening the app and searching for something you only half caught the
        // name of. Absent for everything else a station plays: the server
        // decides, so a channel programmed from the ordinary library — a
        // Christmas rotation swapped in for the season — simply never shows it.
        if (keepableTrackId) {
            menuActions.push({
                glyph: <DownloadGlyph color={colors.text} />,
                id: 'keep-in-library',
                // Deliberately does NOT close the sheet: the answer renders
                // inside it, and closing first would write the result into
                // something already gone and leave the tap looking inert.
                label: isKeeping ? 'Keeping…' : 'Keep in Library',
                onPress: () => void handleKeep(),
            });
        }
        if (onChannel) {
            // One item is not always the problem: sometimes it is the medium —
            // "not talk right now, put music on". The station steps off the
            // whole kind rather than to the next episode of the same thing.
            menuActions.push({
                glyph: <MediaKindGlyph color={colors.text} />,
                id: 'next-kind',
                label: 'Skip this kind of thing',
                onPress: () => {
                    closeMenu();
                    sendCommand('next-kind');
                },
            });
        }
        // Stop hands the output back to its station; standby is the real off
        // switch. Different intentions, both needed on a device whose job is to
        // always be on air.
        menuActions.push(
            {
                glyph: <StationReturnGlyph color={colors.text} />,
                id: 'stop',
                label: 'Back to its station',
                onPress: () => {
                    closeMenu();
                    sendCommand('stop');
                },
            },
            {
                glyph: <PowerGlyph color={colors.text} />,
                id: 'standby',
                label: 'Standby',
                onPress: () => {
                    closeMenu();
                    sendCommand('standby');
                },
            },
        );

        return (
            <View style={styles.samoRadioPanel}>
                <View style={styles.samoRadioHead}>
                    <Text style={styles.samoRadioEyebrow}>{device.name}</Text>
                    <Text style={styles.samoRadioStatus}>{state.status.toUpperCase()}</Text>
                </View>

                <Text numberOfLines={1} style={styles.samoRadioTitle}>
                    {now.title}
                </Text>
                {meta ? (
                    <Text numberOfLines={1} style={styles.samoRadioMeta}>
                        {meta}
                    </Text>
                ) : null}

                <View style={styles.samoRadioTransport}>
                    {/* On a channel these move the STATION on — everyone
                        listening hears it. An internet station is somebody
                        else's stream with nothing to skip to, and the device
                        refuses: no buttons there. */}
                    {canStep ? (
                        <SamoRadioIconButton
                            accessibilityLabel={
                                onChannel ? 'Back to the previous programme' : 'Previous'
                            }
                            onPress={() => sendCommand('previous')}
                        >
                            <TrackSkipGlyph color={colors.text} direction={-1} size={19} />
                        </SamoRadioIconButton>
                    ) : null}
                    <SamoRadioIconButton
                        accessibilityLabel={isPaused ? 'Resume' : 'Pause'}
                        onPress={() => sendCommand(isPaused ? 'resume' : 'pause')}
                        primary
                    >
                        {isTogglingPlayback ? (
                            <ActivityIndicator color={colors.background} size="small" />
                        ) : (
                            <PlayPauseGlyph
                                color={colors.background}
                                isPlaying={!isPaused}
                                size={18}
                            />
                        )}
                    </SamoRadioIconButton>
                    {canStep ? (
                        <SamoRadioIconButton
                            accessibilityLabel={
                                onChannel ? 'Skip what the station is playing' : 'Next'
                            }
                            onPress={() => sendCommand('next')}
                        >
                            <TrackSkipGlyph color={colors.text} direction={1} size={19} />
                        </SamoRadioIconButton>
                    ) : null}
                    <View style={styles.samoRadioTransportSpacer} />
                    {stations.length > 0 ? (
                        <SamoRadioIconButton
                            accessibilityLabel={isTuneOpen ? 'Close the station list' : 'Tune'}
                            onPress={() => {
                                triggerImpact('light');
                                setIsTuneOpen((open) => !open);
                            }}
                        >
                            <RadioWaveGlyph color={isTuneOpen ? colors.accent : colors.text} />
                        </SamoRadioIconButton>
                    ) : null}
                    <SamoRadioIconButton
                        accessibilityLabel="More controls"
                        onPress={() => {
                            triggerImpact('light');
                            // Cleared on the way in rather than on the way out,
                            // so last time's answer is gone before the sheet
                            // draws and the closing animation stays clean.
                            setKeepFeedback(null);
                            setIsMenuOpen(true);
                        }}
                    >
                        <MoreGlyph color={colors.text} />
                    </SamoRadioIconButton>
                </View>

                <SamoRadioVolumeSlider onCommit={commitVolume} volume={state.volume ?? 0} />

                <MotionSheet
                    backdropStyle={styles.mediaContextBackdrop}
                    onRequestClose={closeMenu}
                    sheetStyle={styles.mediaContextSheet}
                    variant="bottom"
                    visible={isMenuOpen}
                >
                    <View style={styles.samoRadioMenuHeader}>
                        <Text style={styles.mediaContextEyebrow}>{device.name}</Text>
                        <Text numberOfLines={1} style={styles.mediaContextTitle}>
                            {now.title}
                        </Text>
                    </View>
                    <View style={styles.mediaContextDivider} />
                    <View style={styles.mediaContextActions}>
                        {menuActions.map((action, index) => (
                            <Pressable
                                accessibilityRole="button"
                                android_ripple={{
                                    borderless: false,
                                    color: 'rgba(255, 255, 255, 0.06)',
                                }}
                                key={action.id}
                                onPress={action.onPress}
                                style={[
                                    styles.mediaContextActionRow,
                                    index === menuActions.length - 1 &&
                                        styles.mediaContextActionRowLast,
                                ]}
                            >
                                <View style={styles.mediaContextActionIcon}>{action.glyph}</View>
                                <Text numberOfLines={1} style={styles.mediaContextActionLabel}>
                                    {action.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                    {keepFeedback ? (
                        <Text style={styles.mediaContextFeedback}>{keepFeedback}</Text>
                    ) : null}
                </MotionSheet>

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
