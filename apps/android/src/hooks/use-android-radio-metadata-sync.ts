import {
    enrichSamoRadioPlaybackItem,
    parseSamoInternetRadioStationId,
} from '@samo/core/mobile';
import {
    findServerAuthenticationForSource,
    getFetch,
    getSamoInternetRadioStation,
    ServerType,
    type ServerAuthenticationResult,
} from '@samo/core/server';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { getAndroidPlaybackState, setAndroidPlaybackState } from '../state/playback-store';

const RADIO_METADATA_POLL_MS = 5000;

export function useAndroidRadioMetadataSync(
    serverConnection: ServerAuthenticationResult | null,
) {
    const serverConnectionsRef = useRef(serverConnection);
    serverConnectionsRef.current = serverConnection;

    useEffect(() => {
        let cancelled = false;
        let intervalId: ReturnType<typeof setInterval> | undefined;

        const poll = async () => {
            const state = getAndroidPlaybackState();
            if (state.status === 'idle' || state.item.source !== 'radio') {
                return;
            }

            const stationId =
                state.item.radioStationId ?? parseSamoInternetRadioStationId(state.item.id);
            if (!stationId) {
                return;
            }

            const authentication = findServerAuthenticationForSource(
                serverConnectionsRef.current,
                { id: state.item.contentSourceId },
            );
            if (!authentication || authentication.type !== ServerType.SAMO) {
                return;
            }

            try {
                const station = await getSamoInternetRadioStation(
                    getFetch(),
                    authentication,
                    stationId,
                );
                if (cancelled) {
                    return;
                }

                const enriched = enrichSamoRadioPlaybackItem(state.item, station);
                if (
                    enriched.title === state.item.title &&
                    enriched.subtitle === state.item.subtitle &&
                    enriched.artist === state.item.artist
                ) {
                    return;
                }

                setAndroidPlaybackState((current) => {
                    if (current.status === 'idle' || current.item.id !== state.item.id) {
                        return current;
                    }

                    return {
                        ...current,
                        item: enrichSamoRadioPlaybackItem(current.item, station),
                    };
                });
            } catch {
                // Ignore transient poll failures — stream keeps playing.
            }
        };

        const stopPolling = () => {
            if (intervalId !== undefined) {
                clearInterval(intervalId);
                intervalId = undefined;
            }
        };

        const startPolling = () => {
            stopPolling();
            void poll();
            intervalId = setInterval(() => void poll(), RADIO_METADATA_POLL_MS);
        };

        const onAppStateChange = (nextState: AppStateStatus) => {
            if (nextState === 'active') {
                startPolling();
            } else {
                stopPolling();
            }
        };

        if (AppState.currentState === 'active') {
            startPolling();
        }

        const appStateSubscription = AppState.addEventListener('change', onAppStateChange);

        return () => {
            cancelled = true;
            stopPolling();
            appStateSubscription.remove();
        };
    }, []);
}
