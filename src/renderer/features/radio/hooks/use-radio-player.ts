import { samoChannelNowPlayingLine } from '@samo/core/mobile';
import { getSamoChannelNowPlaying, parseSamoChannelIdFromStreamUrl } from '@samo/core/server';
import IcecastMetadataStats from 'icecast-metadata-stats';
import isElectron from 'is-electron';
import React, { useEffect } from 'react';
import { createWithEqualityFn } from 'zustand/traditional';

import { samoFetch } from '/@/renderer/api/samo/samo-fetch';
import { usePlayerEvents } from '/@/renderer/features/player/audio-player/hooks/use-player-events';
import {
    samoChannelAuth,
    type SamoChannelAuth,
} from '/@/renderer/features/radio/utils/samo-channel-auth';
import { useCurrentServerWithCredential, usePlayerStoreBase } from '/@/renderer/store';
import { useLastPlaybackSessionStore } from '/@/renderer/store/last-playback-session.store';
import { recordRecentItem } from '/@/renderer/store/play-history.store';
import { usePlaybackOwnerStore } from '/@/renderer/store/playback-owner.store';
import { LibraryItem } from '/@/shared/types/domain-types';
import { PlayerStatus } from '/@/shared/types/types';

const streamMetadataReader = isElectron() ? window.api.mpvPlayer : null;

/** How often to ask a channel what it is airing. Matches the ICY poll. */
const CHANNEL_METADATA_POLL_MS = 5000;

export type RadioCurrentStationArt = {
    id: string;
    imageId?: null | string;
    imageUrl?: null | string;
    serverId: string;
};

export interface RadioMetadata {
    artist: null | string;
    title: null | string;
}

/**
 * What a channel is airing, as the one line the player shows.
 *
 * The poll and the nudge after a skip both go through here so they can never
 * disagree about how an airing becomes a title and an artist — the skip is the
 * moment the two are most obviously side by side.
 */
export const readSamoChannelLine = async (
    auth: SamoChannelAuth,
    channelId: string,
): Promise<null | RadioMetadata> => {
    const now = await getSamoChannelNowPlaying(samoFetch, auth, channelId);
    const line = samoChannelNowPlayingLine(now.current);
    return line ? { artist: line.artist ?? null, title: line.title ?? null } : null;
};

/** Which way a channel's programming is being moved. */
export type SamoChannelCommand = 'kind' | 'previous' | 'skip';

interface RadioStore {
    actions: {
        pause: () => void;
        play: (
            streamUrl?: string,
            stationName?: string,
            stationArt?: null | RadioCurrentStationArt,
        ) => void;
        reopenStream: () => void;
        setChannelCommand: (channelCommand: null | SamoChannelCommand) => void;
        setCurrentStreamUrl: (currentStreamUrl: null | string) => void;
        setIsPlaying: (isPlaying: boolean) => void;
        setMetadata: (metadata: null | RadioMetadata) => void;
        setStationName: (stationName: null | string) => void;
        stop: () => void;
    };
    /**
     * The programme command in flight against the channel, if any.
     *
     * Shared rather than kept per button: the full-screen player and the
     * playerbar are two views of one station, and two skips racing each other
     * would move the programming twice for one intent.
     */
    channelCommand: null | SamoChannelCommand;
    currentStationArt: null | RadioCurrentStationArt;
    currentStreamUrl: null | string;
    isPlaying: boolean;
    metadata: null | RadioMetadata;
    /**
     * How many times the current station has been asked to reconnect.
     *
     * The station's URL never changes, so this counter is what the audio
     * element is given to tell one open from the next — see `withReopenMark`
     * in use-radio-playback-url. Only the channel transport bumps it, and only
     * after the server has agreed to move the programming on.
     */
    reopen: number;
    stationName: null | string;
}

export const useRadioStore = createWithEqualityFn<RadioStore>((set, get) => ({
    actions: {
        pause: () => {
            set({ isPlaying: false });
            usePlayerStoreBase.getState().mediaPause();
        },
        play: (
            streamUrl?: string,
            stationName?: string,
            stationArt?: null | RadioCurrentStationArt,
        ) => {
            // Idempotency: clicking the currently-playing station (or the
            // PAUSED→PLAYING listener re-firing actions.play()) must not
            // re-enter the play pipeline. Without this, every redundant call
            // re-claims a new session and React can spawn a fresh <audio>
            // element while the previous one is still streaming — that's
            // what stacks 5 copies on a single click.
            const currentState = get();
            const desiredStreamUrl = streamUrl ?? currentState.currentStreamUrl;
            if (
                desiredStreamUrl &&
                desiredStreamUrl === currentState.currentStreamUrl &&
                currentState.isPlaying
            ) {
                return;
            }

            const newStreamUrl = desiredStreamUrl;
            if (!newStreamUrl) {
                return;
            }

            const newStationName = stationName ?? currentState.stationName;
            const streamUrlExplicit = streamUrl !== undefined;
            const isSwitchingStation =
                streamUrlExplicit && streamUrl !== currentState.currentStreamUrl;
            const nextStationArt = isSwitchingStation
                ? (stationArt ?? null)
                : currentState.currentStationArt;
            const nextMetadata = isSwitchingStation ? null : currentState.metadata;

            // COMMIT FIRST, then act. This ordering is the guard above.
            //
            // All of this used to run INSIDE the `set()` updater, which zustand
            // does not commit until the updater returns. `mediaPlay()` below
            // flips the transport PAUSED→PLAYING and notifies its subscribers
            // synchronously, and one of them — `useRadioAudioInstance` — answers
            // that by calling this very function again. From in there, `get()`
            // still saw `isPlaying: false`, so the guard could never recognise
            // its own effect and the whole pipeline ran a second time: a second
            // session claimed, a second sweep of every <audio>, recents and the
            // restored session rewritten with the OUTGOING station, and every
            // isPlaying-keyed effect driven twice — including the metadata poll,
            // which opens a real second connection to the stream. On SiriusXM
            // two concurrent connections are indistinguishable from account
            // sharing, which is why one press must mean one stream.
            //
            // Committed first, the re-entrant call reads `isPlaying: true` with
            // the same URL and returns at the guard, as it was always meant to.
            // A zustand updater has to be pure for that to be true.
            set({
                // A command aimed at the outgoing station has nothing to do
                // with this one.
                channelCommand: isSwitchingStation ? null : currentState.channelCommand,
                currentStationArt: nextStationArt,
                currentStreamUrl: newStreamUrl,
                isPlaying: true,
                metadata: nextMetadata,
                // A different station opens its own first connection; carrying
                // the outgoing one's count over would put a stale mark in a URL
                // nothing has reopened yet.
                reopen: isSwitchingStation ? 0 : currentState.reopen,
                stationName: newStationName,
            });

            usePlaybackOwnerStore.getState().claim('radio', {
                engine: 'web',
                mediaKey: newStreamUrl,
                replace: isSwitchingStation,
            });
            usePlayerStoreBase.getState().mediaPlay();

            if (nextStationArt?.id && nextStationArt.serverId) {
                recordRecentItem({
                    artwork: {
                        imageId: nextStationArt.imageId,
                        imageItemType: LibraryItem.RADIO_STATION,
                        imageUrl: nextStationArt.imageUrl,
                        kind: 'music',
                        serverId: nextStationArt.serverId,
                    },
                    itemId: nextStationArt.id,
                    mediaType: 'radio',
                    radioStreamUrl: newStreamUrl,
                    serverId: nextStationArt.serverId,
                    subtitle: parseSamoChannelIdFromStreamUrl(newStreamUrl)
                        ? 'Radio • samo channel'
                        : 'Radio • Internet station',
                    title: newStationName ?? 'Radio station',
                });
                useLastPlaybackSessionStore.getState().actions.setSession({
                    metadata: nextMetadata,
                    serverId: nextStationArt.serverId,
                    source: 'radio',
                    stationArt: nextStationArt,
                    stationId: nextStationArt.id,
                    stationName: newStationName,
                    streamUrl: newStreamUrl,
                });
            }
        },
        /**
         * Open the stream again, throwing away everything already buffered.
         *
         * Only meaningful right after the server has moved a channel on: the
         * audio still in flight is the item that was skipped, and playing it
         * out is what makes the button look ignored. A live channel has no
         * position to lose by reconnecting.
         */
        reopenStream: () => set((state) => ({ reopen: state.reopen + 1 })),
        setChannelCommand: (channelCommand) => set({ channelCommand }),
        setCurrentStreamUrl: (currentStreamUrl) => set({ currentStreamUrl }),
        setIsPlaying: (isPlaying) => set({ isPlaying }),
        setMetadata: (metadata) => {
            set({ metadata });
            const state = get();
            const stationArt = state.currentStationArt;
            if (stationArt?.id && stationArt.serverId && state.currentStreamUrl) {
                useLastPlaybackSessionStore.getState().actions.setSession({
                    metadata,
                    serverId: stationArt.serverId,
                    source: 'radio',
                    stationArt,
                    stationId: stationArt.id,
                    stationName: state.stationName,
                    streamUrl: state.currentStreamUrl,
                });
            }
        },
        setStationName: (stationName) => set({ stationName }),
        stop: () => {
            set({
                channelCommand: null,
                currentStationArt: null,
                currentStreamUrl: null,
                isPlaying: false,
                metadata: null,
                reopen: 0,
                stationName: null,
            });

            usePlaybackOwnerStore.getState().release('radio');
            usePlayerStoreBase.getState().mediaStop();
        },
    },
    channelCommand: null,
    currentStationArt: null,
    currentStreamUrl: null,
    isPlaying: false,
    metadata: null,
    reopen: 0,
    stationName: null,
}));

export const useIsPlayingRadio = () => useRadioStore((state) => state.isPlaying);

// When another source claims ownership, clear radio state so the radio engine unmounts cleanly.
usePlaybackOwnerStore.subscribe(
    (state) => state.source,
    (source) => {
        if (source !== 'radio') {
            useRadioStore.setState({
                channelCommand: null,
                currentStationArt: null,
                currentStreamUrl: null,
                isPlaying: false,
                metadata: null,
                reopen: 0,
                stationName: null,
            });
        }
    },
);

export const useIsRadioActive = () => useRadioStore((state) => Boolean(state.currentStreamUrl));

export const useRadioPlayer = () => {
    const currentStationArt = useRadioStore((state) => state.currentStationArt);
    const currentStreamUrl = useRadioStore((state) => state.currentStreamUrl);
    const isPlaying = useRadioStore((state) => state.isPlaying);
    const metadata = useRadioStore((state) => state.metadata);
    const stationName = useRadioStore((state) => state.stationName);

    return {
        currentStationArt,
        currentStreamUrl,
        isPlaying,
        metadata,
        stationName,
    };
};

export const useRadioControls = () => {
    const { pause, play, stop } = useRadioStore((state) => state.actions);

    return {
        pause,
        play,
        stop,
    };
};

export const useRadioAudioInstance = () => {
    const { actions } = useRadioStore();

    usePlayerEvents(
        {
            onPlayerStatus: (properties, prev) => {
                const radioState = useRadioStore.getState();
                if (!radioState.currentStreamUrl) {
                    return;
                }

                const { status } = properties;
                const { status: prevStatus } = prev;

                if (status === prevStatus) {
                    return;
                }

                if (status === PlayerStatus.PLAYING && prevStatus === PlayerStatus.PAUSED) {
                    actions.play();
                } else if (status === PlayerStatus.PAUSED && prevStatus === PlayerStatus.PLAYING) {
                    actions.pause();
                }
            },
        },
        [actions],
    );
};

export const useRadioMetadata = () => {
    const currentStreamUrl = useRadioStore((state) => state.currentStreamUrl);
    const isPlaying = useRadioStore((state) => state.isPlaying);
    const setMetadata = useRadioStore((state) => state.actions.setMetadata);
    const server = useCurrentServerWithCredential();

    useEffect(() => {
        if (!currentStreamUrl || !isPlaying) {
            setMetadata(null);
            return;
        }

        // A samo channel is a raw encoder pipe with no ICY frames in it — the
        // only place its now-playing exists is the server, which is also what
        // makes every listener's agree. Reading it here rather than sniffing
        // the stream is the difference between a channel that says what is on
        // and one that shows its own name forever.
        const channelId = parseSamoChannelIdFromStreamUrl(currentStreamUrl);
        const auth = samoChannelAuth(server);

        if (channelId && auth) {
            let stopped = false;

            const pollChannel = async () => {
                try {
                    const line = await readSamoChannelLine(auth, channelId);
                    if (stopped) return;
                    setMetadata(line);
                } catch {
                    // A failed poll says nothing about the audio, which is
                    // still arriving — leave the last line up.
                }
            };

            void pollChannel();
            const interval = window.setInterval(pollChannel, CHANNEL_METADATA_POLL_MS);

            return () => {
                stopped = true;
                window.clearInterval(interval);
                setMetadata(null);
            };
        }

        // Radio audio is intentionally Web-engine playback. In Electron, use the
        // main-process ICY reader only for metadata so browser CORS cannot blank
        // the playerbar while the stream itself stays in the Web engine.
        if (streamMetadataReader?.getStreamMetadata) {
            let stopped = false;
            // At most ONE metadata connection at a time.
            //
            // This reader opens a real GET of the AUDIO stream and reads until
            // it sees a non-empty ICY block; its 12s timeout is an IDLE timer
            // that a continuously streaming socket never trips. So a poll that
            // has not answered yet is a socket still pulling audio, and firing
            // the next one on schedule stacks listeners on the station for as
            // long as it stays quiet.
            //
            // That matters far beyond wasted bytes on SiriusXM, where several
            // simultaneous pulls are indistinguishable from account sharing.
            // One in flight, always.
            let inFlight = false;

            const pollMetadata = async () => {
                if (inFlight) {
                    return;
                }
                inFlight = true;

                try {
                    const metadata = await streamMetadataReader.getStreamMetadata(currentStreamUrl);

                    if (!stopped) {
                        setMetadata(metadata);
                    }
                } catch {
                    if (!stopped) {
                        setMetadata(null);
                    }
                } finally {
                    inFlight = false;
                }
            };

            pollMetadata();
            const interval = window.setInterval(pollMetadata, 5000);

            return () => {
                stopped = true;
                window.clearInterval(interval);
                setMetadata(null);
            };
        }

        let statsListener: IcecastMetadataStats | null = null;

        try {
            statsListener = new IcecastMetadataStats(currentStreamUrl, {
                interval: 12,
                onStats: (stats) => {
                    let streamTitle: null | string = null;

                    if (stats.StreamTitle) {
                        streamTitle = stats.StreamTitle;
                    } else if (stats.icy?.StreamTitle) {
                        streamTitle = stats.icy.StreamTitle;
                    }

                    let artist: null | string = null;
                    let title: null | string = null;

                    if (streamTitle) {
                        const match = streamTitle.match(/^(.*?)\s*[-–—]\s*(.+)$/);

                        if (match) {
                            artist = match[1].trim() || null;
                            title = match[2].trim() || null;
                        } else {
                            title = streamTitle;
                        }
                    }

                    setMetadata(title || artist ? { artist, title } : null);
                },
                sources: ['icy'],
            });

            statsListener.start();
        } catch {
            setMetadata(null);
        }

        return () => {
            if (statsListener) {
                statsListener.stop();
            }

            setMetadata(null);
        };
    }, [currentStreamUrl, isPlaying, server, setMetadata]);
};

const RadioAudioInstanceHookInner = () => {
    useRadioAudioInstance();
    return null;
};

export const RadioAudioInstanceHook = () => {
    const isRadioActive = useIsRadioActive();

    if (!isRadioActive) {
        return null;
    }

    return React.createElement(RadioAudioInstanceHookInner);
};

const RadioMetadataHookInner = () => {
    useRadioMetadata();
    return null;
};

export const RadioMetadataHook = () => {
    const isRadioActive = useIsRadioActive();

    if (!isRadioActive) {
        return null;
    }

    return React.createElement(RadioMetadataHookInner);
};
