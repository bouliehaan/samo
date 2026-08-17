import {
    applyRadioNowPlayingToPlayback,
    enrichSamoChannelPlaybackItem,
    parseIcyStreamTitle,
    parseSamoChannelPlaybackId,
} from '@samo/core/mobile';
import {
    findServerAuthenticationForSource,
    getFetch,
    getSamoChannel,
    getSamoChannelNowPlaying,
    type ServerAuthenticationResult,
} from '@samo/core/server';
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { subscribeToAndroidStreamMetadata } from '../services/audio-playback';
import { getAndroidPlaybackState, setAndroidPlaybackState } from '../state/playback-store';

const CHANNEL_METADATA_POLL_MS = 5000;

/**
 * Keeping a playing station's now-playing current, from whichever source can
 * actually answer for it.
 *
 * The two kinds of station answer differently, and that is the whole shape of
 * this file. An internet station ANNOUNCES over ICY, in frames interleaved
 * with the audio, so the phone already has the answer the moment it changes —
 * it only has to listen to the stream it is playing. A Samo channel is a raw
 * encoder pipe with no frames in it at all, so the only place its now-playing
 * exists is the server, which is also what makes every listener's agree.
 *
 * What is NOT a source is samo-server's record of an internet station. That
 * `nowPlaying` is a probe: the server opens the stream on a timer, reads one
 * announcement and stores it. Reading it back every few seconds looks like
 * polling and is really re-reading one old snapshot — the SiriusXM relay
 * announces `- - -` while it waits for the channel it just tuned, and a probe
 * that caught that showed `- - -` under a song that had changed a dozen times
 * since.
 */
export function useAndroidRadioMetadataSync(
    serverConnection: ServerAuthenticationResult | null,
) {
    const serverConnectionsRef = useRef(serverConnection);
    serverConnectionsRef.current = serverConnection;

    // Internet stations: what the stream itself is saying, as it says it.
    useEffect(() => {
        const subscription = subscribeToAndroidStreamMetadata((event) => {
            const state = getAndroidPlaybackState();
            if (state.status === 'idle' || state.item.source !== 'radio') {
                return;
            }
            // A station the listener has already left can still land one last
            // announcement — it names the item it belongs to for exactly this.
            if (event.mediaId && event.mediaId !== state.item.id) {
                return;
            }
            // Channels are the server's to report; nothing should be able to
            // write their line from two places at once.
            if (state.item.radioChannelId ?? parseSamoChannelPlaybackId(state.item.id)) {
                return;
            }

            const announced = parseIcyStreamTitle(event.title);
            setAndroidPlaybackState((current) => {
                if (current.status === 'idle' || current.item.id !== state.item.id) {
                    return current;
                }

                const item = applyRadioNowPlayingToPlayback(current.item, announced);
                return item === current.item ? current : { ...current, item };
            });
        });

        return () => subscription.remove();
    }, []);

    // Channels: the server's now-playing, polled.
    useEffect(() => {
        let cancelled = false;
        let intervalId: ReturnType<typeof setInterval> | undefined;
        // A channel's own record — its name, description and encoder settings —
        // does not change while somebody is listening to it, so it is read once
        // per channel and only the now-playing line is polled after that.
        let channelRecord: Awaited<ReturnType<typeof getSamoChannel>> | undefined;

        const poll = async () => {
            const state = getAndroidPlaybackState();
            if (state.status === 'idle' || state.item.source !== 'radio') {
                return;
            }

            const channelId =
                state.item.radioChannelId ?? parseSamoChannelPlaybackId(state.item.id);
            if (!channelId) {
                return;
            }

            const authentication = findServerAuthenticationForSource(
                serverConnectionsRef.current,
                { id: state.item.contentSourceId },
            );
            if (!authentication) {
                return;
            }

            try {
                if (channelRecord?.id !== channelId) {
                    channelRecord = await getSamoChannel(getFetch(), authentication, channelId);
                }
                const channel = channelRecord;
                const nowPlaying = await getSamoChannelNowPlaying(
                    getFetch(),
                    authentication,
                    channelId,
                );

                if (cancelled) {
                    return;
                }

                const enriched = enrichSamoChannelPlaybackItem(state.item, channel, nowPlaying);
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
                        item: enrichSamoChannelPlaybackItem(current.item, channel, nowPlaying),
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
            intervalId = setInterval(() => void poll(), CHANNEL_METADATA_POLL_MS);
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
