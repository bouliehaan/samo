import isElectron from 'is-electron';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import { usePlayerEvents } from '/@/renderer/features/player/audio-player/hooks/use-player-events';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { useRadioPlayer } from '/@/renderer/features/radio/hooks/use-radio-player';
import { getNowPlayingSnapshot } from '/@/renderer/hooks/use-now-playing';
import {
    subscribePlayerStatus,
    usePlaybackSettings,
    useSkipButtons,
    useSettingsStore,
    useTimestampStoreBase,
} from '/@/renderer/store';
import { usePlaybackOwnerStore } from '/@/renderer/store/playback-owner.store';
import { subscribeCurrentTrack } from '/@/renderer/store/player.store';
import { PlayerStatus, PlayerType } from '/@/shared/types/types';

const mediaSession = navigator.mediaSession;

export const useMediaSession = () => {
    const { mediaSession: mediaSessionEnabled } = usePlaybackSettings();
    const player = usePlayer();
    const skip = useSkipButtons();
    const playbackType = useSettingsStore((state) => state.playback.type);

    // Still needed as React state to trigger the radio ICY metadata refresh effect.
    const { isPlaying: isRadioPlaying, metadata: radioMetadata } = useRadioPlayer();

    const playerRef = useRef(player);
    const skipRef = useRef(skip);
    const isMediaSessionEnabledRef = useRef(false);

    useEffect(() => {
        playerRef.current = player;
    }, [player]);

    useEffect(() => {
        skipRef.current = skip;
    }, [skip]);

    const isMediaSessionEnabled = useMemo(() => {
        if (!isElectron()) {
            return true;
        }

        return Boolean(mediaSessionEnabled && playbackType === PlayerType.WEB);
    }, [mediaSessionEnabled, playbackType]);

    useEffect(() => {
        isMediaSessionEnabledRef.current = isMediaSessionEnabled;
    }, [isMediaSessionEnabled]);

    useEffect(() => {
        if (!isMediaSessionEnabled) {
            mediaSession.setActionHandler('nexttrack', null);
            mediaSession.setActionHandler('pause', null);
            mediaSession.setActionHandler('play', null);
            mediaSession.setActionHandler('previoustrack', null);
            mediaSession.setActionHandler('seekto', null);
            mediaSession.setActionHandler('stop', null);
            mediaSession.setActionHandler('seekbackward', null);
            mediaSession.setActionHandler('seekforward', null);

            return;
        }

        mediaSession.setActionHandler('nexttrack', () => {
            if (usePlaybackOwnerStore.getState().source === 'radio') return;
            playerRef.current.mediaNext();
        });

        mediaSession.setActionHandler('pause', () => {
            playerRef.current.mediaPause();
        });

        mediaSession.setActionHandler('play', () => {
            playerRef.current.mediaPlay();
        });

        mediaSession.setActionHandler('previoustrack', () => {
            if (usePlaybackOwnerStore.getState().source === 'radio') return;
            playerRef.current.mediaPrevious();
        });

        mediaSession.setActionHandler('seekto', (e) => {
            if (!getNowPlayingSnapshot().canSeek) return;

            if (e.seekTime) {
                playerRef.current.mediaSeekToTimestamp(e.seekTime);
            } else if (e.seekOffset) {
                const currentTimestamp = useTimestampStoreBase.getState().timestamp;
                playerRef.current.mediaSeekToTimestamp(currentTimestamp + e.seekOffset);
            }
        });

        mediaSession.setActionHandler('stop', () => {
            playerRef.current.mediaStop();
        });

        mediaSession.setActionHandler('seekbackward', (e) => {
            if (!getNowPlayingSnapshot().canSeek) return;

            const currentTimestamp = useTimestampStoreBase.getState().timestamp;
            playerRef.current.mediaSeekToTimestamp(
                currentTimestamp - (e.seekOffset || skipRef.current?.skipBackwardSeconds || 5),
            );
        });

        mediaSession.setActionHandler('seekforward', (e) => {
            if (!getNowPlayingSnapshot().canSeek) return;

            const currentTimestamp = useTimestampStoreBase.getState().timestamp;
            playerRef.current.mediaSeekToTimestamp(
                currentTimestamp + (e.seekOffset || skipRef.current?.skipForwardSeconds || 5),
            );
        });

        return () => {
            mediaSession.setActionHandler('nexttrack', null);
            mediaSession.setActionHandler('pause', null);
            mediaSession.setActionHandler('play', null);
            mediaSession.setActionHandler('previoustrack', null);
            mediaSession.setActionHandler('seekto', null);
            mediaSession.setActionHandler('stop', null);
            mediaSession.setActionHandler('seekbackward', null);
            mediaSession.setActionHandler('seekforward', null);
        };
    }, [isMediaSessionEnabled]);

    const updateMediaSessionMetadata = useCallback(() => {
        if (!isMediaSessionEnabledRef.current) return;

        const nowPlaying = getNowPlayingSnapshot();

        mediaSession.metadata = new MediaMetadata({
            album: nowPlaying.subtitle,
            artist: nowPlaying.artist,
            artwork: nowPlaying.artwork ? [{ src: nowPlaying.artwork, type: 'image/png' }] : [],
            title: nowPlaying.title,
        });
    }, []);

    const debouncedUpdateMetadata = useRef(
        debounce(() => {
            updateMediaSessionMetadata();
        }, 100),
    ).current;

    useEffect(() => {
        return () => {
            debouncedUpdateMetadata.cancel();
        };
    }, [debouncedUpdateMetadata]);

    // Trigger metadata refresh when radio ICY data or play state changes.
    useEffect(() => {
        if (!isMediaSessionEnabled) return;
        if (usePlaybackOwnerStore.getState().source !== 'radio') return;
        debouncedUpdateMetadata();
    }, [radioMetadata, isRadioPlaying, isMediaSessionEnabled, debouncedUpdateMetadata]);

    // Stable subscriptions registered once on mount:
    // - source changes (music→radio, radio→music, music→audiobook, …) → refresh metadata
    // - current music track changes → refresh metadata
    // - player status changes → update playback state indicator
    useEffect(() => {
        const unsubscribeSource = usePlaybackOwnerStore.subscribe(
            (state) => state.source,
            () => {
                if (!isMediaSessionEnabledRef.current) return;
                debouncedUpdateMetadata();
            },
        );

        const unsubscribeCurrentSong = subscribeCurrentTrack(() => {
            if (!isMediaSessionEnabledRef.current) return;
            // subscribeCurrentTrack fires on queue song changes; skip when radio owns playback.
            if (usePlaybackOwnerStore.getState().source === 'radio') return;
            debouncedUpdateMetadata();
        });

        const unsubscribeStatus = subscribePlayerStatus(({ status }) => {
            if (!isMediaSessionEnabledRef.current) return;
            mediaSession.playbackState = status === PlayerStatus.PLAYING ? 'playing' : 'paused';
        });

        return () => {
            unsubscribeSource();
            unsubscribeCurrentSong();
            unsubscribeStatus();
        };
    }, [debouncedUpdateMetadata]);

    usePlayerEvents(
        {
            onPlayerRepeated: () => {
                if (!isMediaSessionEnabledRef.current) return;
                if (usePlaybackOwnerStore.getState().source === 'radio') return;
                debouncedUpdateMetadata();
            },
        },
        [],
    );
};

const MediaSessionHookInner = () => {
    useMediaSession();
    return null;
};

export const MediaSessionHook = () => {
    return React.createElement(MediaSessionHookInner);
};
