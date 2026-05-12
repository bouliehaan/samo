import IcecastMetadataStats from 'icecast-metadata-stats';
import isElectron from 'is-electron';
import React, { useEffect } from 'react';
import { createWithEqualityFn } from 'zustand/traditional';

import { usePlayerEvents } from '/@/renderer/features/player/audio-player/hooks/use-player-events';
import { usePlayerStoreBase } from '/@/renderer/store';
import { useLastPlaybackSessionStore } from '/@/renderer/store/last-playback-session.store';
import { recordRecentItem } from '/@/renderer/store/play-history.store';
import { usePlaybackOwnerStore } from '/@/renderer/store/playback-owner.store';
import { LibraryItem } from '/@/shared/types/domain-types';
import { PlayerStatus } from '/@/shared/types/types';

const streamMetadataReader = isElectron() ? window.api.mpvPlayer : null;

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

interface RadioStore {
    actions: {
        pause: () => void;
        play: (
            streamUrl?: string,
            stationName?: string,
            stationArt?: null | RadioCurrentStationArt,
        ) => void;
        setCurrentStreamUrl: (currentStreamUrl: null | string) => void;
        setIsPlaying: (isPlaying: boolean) => void;
        setMetadata: (metadata: null | RadioMetadata) => void;
        setStationName: (stationName: null | string) => void;
        stop: () => void;
    };
    currentStationArt: null | RadioCurrentStationArt;
    currentStreamUrl: null | string;
    isPlaying: boolean;
    metadata: null | RadioMetadata;
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

            set((state) => {
                const newStreamUrl = streamUrl ?? state.currentStreamUrl;
                const newStationName = stationName ?? state.stationName;

                if (!newStreamUrl) {
                    return state;
                }

                const streamUrlExplicit = streamUrl !== undefined;
                const isSwitchingStation =
                    streamUrlExplicit && streamUrl !== state.currentStreamUrl;

                let nextStationArt = state.currentStationArt;
                if (isSwitchingStation) {
                    nextStationArt = stationArt ?? null;
                }

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
                        subtitle: 'Radio • Internet station',
                        title: newStationName ?? 'Radio station',
                    });
                    useLastPlaybackSessionStore.getState().actions.setSession({
                        metadata: isSwitchingStation ? null : state.metadata,
                        serverId: nextStationArt.serverId,
                        source: 'radio',
                        stationArt: nextStationArt,
                        stationId: nextStationArt.id,
                        stationName: newStationName,
                        streamUrl: newStreamUrl,
                    });
                }

                return {
                    currentStationArt: nextStationArt,
                    currentStreamUrl: newStreamUrl,
                    isPlaying: true,
                    metadata: isSwitchingStation ? null : state.metadata,
                    stationName: newStationName,
                };
            });
        },
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
                currentStationArt: null,
                currentStreamUrl: null,
                isPlaying: false,
                metadata: null,
                stationName: null,
            });

            usePlaybackOwnerStore.getState().release('radio');
            usePlayerStoreBase.getState().mediaStop();
        },
    },
    currentStationArt: null,
    currentStreamUrl: null,
    isPlaying: false,
    metadata: null,
    stationName: null,
}));

export const useIsPlayingRadio = () => useRadioStore((state) => state.isPlaying);

// When another source claims ownership, clear radio state so the radio engine unmounts cleanly.
usePlaybackOwnerStore.subscribe(
    (state) => state.source,
    (source) => {
        if (source !== 'radio') {
            useRadioStore.setState({
                currentStationArt: null,
                currentStreamUrl: null,
                isPlaying: false,
                metadata: null,
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

    useEffect(() => {
        if (!currentStreamUrl || !isPlaying) {
            setMetadata(null);
            return;
        }

        // Radio audio is intentionally Web-engine playback. In Electron, use the
        // main-process ICY reader only for metadata so browser CORS cannot blank
        // the playerbar while the stream itself stays in the Web engine.
        if (streamMetadataReader?.getStreamMetadata) {
            let stopped = false;

            const pollMetadata = async () => {
                try {
                    const metadata = await streamMetadataReader.getStreamMetadata(currentStreamUrl);

                    if (!stopped) {
                        setMetadata(metadata);
                    }
                } catch {
                    if (!stopped) {
                        setMetadata(null);
                    }
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
    }, [currentStreamUrl, isPlaying, setMetadata]);
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
