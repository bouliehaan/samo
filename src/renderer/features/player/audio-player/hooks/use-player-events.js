import { useEffect } from 'react';
import { eventEmitter } from '/@/renderer/events/event-emitter';
import { subscribeCurrentTrack, subscribeNextSongInsertion, subscribePlayerMute, subscribePlayerProgress, subscribePlayerQueue, subscribePlayerRepeat, subscribePlayerSeekToTimestamp, subscribePlayerShuffle, subscribePlayerSpeed, subscribePlayerStatus, subscribePlayerVolume, subscribeQueueCleared, } from '/@/renderer/store';
export function usePlayerEvents(callbacks, deps) {
    useEffect(() => {
        const engine = createPlayerEvents(callbacks);
        return () => {
            engine.cleanup();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps]);
}
function createPlayerEvents(callbacks) {
    const unsubscribers = [];
    // Subscribe to current track changes
    if (callbacks.onCurrentSongChange) {
        const unsubscribe = subscribeCurrentTrack(callbacks.onCurrentSongChange);
        unsubscribers.push(unsubscribe);
    }
    // Subscribe to next song insertions (when a song is added at next position)
    if (callbacks.onNextSongInsertion) {
        const unsubscribe = subscribeNextSongInsertion(callbacks.onNextSongInsertion);
        unsubscribers.push(unsubscribe);
    }
    // Subscribe to player progress
    if (callbacks.onPlayerProgress) {
        const unsubscribe = subscribePlayerProgress(callbacks.onPlayerProgress);
        unsubscribers.push(unsubscribe);
    }
    // Subscribe to queue changes
    if (callbacks.onPlayerQueueChange) {
        const unsubscribe = subscribePlayerQueue(callbacks.onPlayerQueueChange);
        unsubscribers.push(unsubscribe);
    }
    // Subscribe to queue cleared events
    if (callbacks.onQueueCleared) {
        const unsubscribe = subscribeQueueCleared(callbacks.onQueueCleared);
        unsubscribers.push(unsubscribe);
    }
    // Subscribe to seek events
    if (callbacks.onPlayerSeekToTimestamp) {
        const unsubscribe = subscribePlayerSeekToTimestamp(callbacks.onPlayerSeekToTimestamp);
        unsubscribers.push(unsubscribe);
    }
    // Subscribe to player status changes
    if (callbacks.onPlayerStatus) {
        const unsubscribe = subscribePlayerStatus(callbacks.onPlayerStatus);
        unsubscribers.push(unsubscribe);
    }
    // Subscribe to volume changes
    if (callbacks.onPlayerVolume) {
        const unsubscribe = subscribePlayerVolume(callbacks.onPlayerVolume);
        unsubscribers.push(unsubscribe);
    }
    // Subscribe to mute changes
    if (callbacks.onPlayerMute) {
        const unsubscribe = subscribePlayerMute(callbacks.onPlayerMute);
        unsubscribers.push(unsubscribe);
    }
    // Subscribe to speed changes
    if (callbacks.onPlayerSpeed) {
        const unsubscribe = subscribePlayerSpeed(callbacks.onPlayerSpeed);
        unsubscribers.push(unsubscribe);
    }
    // Subscribe to repeat changes
    if (callbacks.onPlayerRepeat) {
        const unsubscribe = subscribePlayerRepeat(callbacks.onPlayerRepeat);
        unsubscribers.push(unsubscribe);
    }
    // Subscribe to shuffle changes
    if (callbacks.onPlayerShuffle) {
        const unsubscribe = subscribePlayerShuffle(callbacks.onPlayerShuffle);
        unsubscribers.push(unsubscribe);
    }
    if (callbacks.onMediaNext) {
        eventEmitter.on('MEDIA_NEXT', callbacks.onMediaNext);
    }
    if (callbacks.onMediaPrev) {
        eventEmitter.on('MEDIA_PREV', callbacks.onMediaPrev);
    }
    if (callbacks.onPlayerPlay) {
        eventEmitter.on('PLAYER_PLAY', callbacks.onPlayerPlay);
    }
    if (callbacks.onPlayerRepeated) {
        eventEmitter.on('PLAYER_REPEATED', callbacks.onPlayerRepeated);
    }
    if (callbacks.onQueueRestored) {
        eventEmitter.on('QUEUE_RESTORED', callbacks.onQueueRestored);
    }
    if (callbacks.onUserFavorite) {
        eventEmitter.on('USER_FAVORITE', callbacks.onUserFavorite);
    }
    if (callbacks.onUserRating) {
        eventEmitter.on('USER_RATING', callbacks.onUserRating);
    }
    return {
        cleanup: () => {
            unsubscribers.forEach((unsubscribe) => unsubscribe());
            if (callbacks.onMediaNext) {
                eventEmitter.off('MEDIA_NEXT', callbacks.onMediaNext);
            }
            if (callbacks.onMediaPrev) {
                eventEmitter.off('MEDIA_PREV', callbacks.onMediaPrev);
            }
            if (callbacks.onPlayerPlay) {
                eventEmitter.off('PLAYER_PLAY', callbacks.onPlayerPlay);
            }
            if (callbacks.onPlayerRepeated) {
                eventEmitter.off('PLAYER_REPEATED', callbacks.onPlayerRepeated);
            }
            if (callbacks.onQueueRestored) {
                eventEmitter.off('QUEUE_RESTORED', callbacks.onQueueRestored);
            }
            if (callbacks.onUserFavorite) {
                eventEmitter.off('USER_FAVORITE', callbacks.onUserFavorite);
            }
            if (callbacks.onUserRating) {
                eventEmitter.off('USER_RATING', callbacks.onUserRating);
            }
        },
    };
}
