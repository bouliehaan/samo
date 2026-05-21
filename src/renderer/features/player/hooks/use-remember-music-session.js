import { useEffect, useRef } from 'react';
import { rememberMusicPlaybackSession } from '/@/renderer/store/last-playback-session.store';
import { usePlaybackOwnerStore } from '/@/renderer/store/playback-owner.store';
import { getQueue, subscribeCurrentTrack, usePlayerStoreBase } from '/@/renderer/store/player.store';
import { useTimestampStoreBase } from '/@/renderer/store/timestamp.store';
import { PlayerShuffle } from '/@/shared/types/types';
// How often to persist the current timestamp into the last-music-session while music is
// playing. Matches the audiobookshelf cadence — long enough to avoid IDB churn, short
// enough that a hard quit doesn't lose more than a few seconds of resume position.
const POSITION_FLUSH_INTERVAL_MS = 10_000;
/**
 * Keeps `last-playback-session-store.session` in sync with what's actually playing in the
 * music source so a relaunch can resume the same track at the same position. Three signals
 * drive a write:
 *
 *   1. The current track changes → stamp the new `songRef` and reset `position` to 0.
 *      This carries the queue's current selection across launches even when the queue
 *      itself isn't persisted (kind: 'song' lifeboat).
 *   2. The active source flips to/away from `music` → flush on entry so radio→music
 *      handoffs don't strand a stale audiobook session as "the last thing you played".
 *      Also clear the queue when switching away from music.
 *   3. A 10s tick while music is the active source → flush the current timestamp.
 *
 * The hook is renderless and lives in the player tree alongside other always-on hooks.
 */
export const useRememberMusicSession = () => {
    // We don't want the periodic flush to fire when audiobook/podcast/radio owns playback —
    // those sources do their own session bookkeeping and the music timestamp is stale.
    const isMusicSourceRef = useRef(usePlaybackOwnerStore.getState().source === 'music');
    useEffect(() => {
        const unsubSource = usePlaybackOwnerStore.subscribe((state, prev) => {
            const isMusic = state.source === 'music';
            const wasMusic = prev.source === 'music';
            isMusicSourceRef.current = isMusic;
            // Stamp on entry so the session reflects "you were last in music" the moment
            // the source claims it, even before the next song change.
            if (isMusic && !wasMusic) {
                writeSessionFromStore();
            }
            // Clear the music queue when switching away from music
            if (wasMusic && !isMusic) {
                usePlayerStoreBase.getState().clearQueue();
            }
        });
        const unsubTrack = subscribeCurrentTrack(({ song }) => {
            if (!isMusicSourceRef.current)
                return;
            if (!song?.id || !song?._serverId)
                return;
            const context = usePlayerStoreBase.getState().player.context;
            rememberMusicPlaybackSession({
                context,
                position: 0,
                songRef: { serverId: song._serverId, songId: song.id },
            });
        });
        const interval = setInterval(() => {
            if (!isMusicSourceRef.current)
                return;
            writeSessionFromStore();
        }, POSITION_FLUSH_INTERVAL_MS);
        return () => {
            unsubSource();
            unsubTrack();
            clearInterval(interval);
        };
    }, []);
};
const writeSessionFromStore = () => {
    const player = usePlayerStoreBase.getState();
    const queue = getQueue(undefined, player);
    let index = player.player.index;
    if (player.player.shuffle === PlayerShuffle.TRACK &&
        player.queue.shuffled.length > 0 &&
        index >= 0 &&
        index < player.queue.shuffled.length) {
        index = player.queue.shuffled[index];
    }
    const song = queue.items[index];
    if (!song?.id || !song?._serverId)
        return;
    const position = useTimestampStoreBase.getState().timestamp;
    rememberMusicPlaybackSession({
        context: player.player.context,
        position,
        songRef: { serverId: song._serverId, songId: song.id },
    });
};
export const RememberMusicSessionHook = () => {
    useRememberMusicSession();
    return null;
};
