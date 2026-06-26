import { type MobilePlayableAudio } from '@samo/core/mobile';

/**
 * Whether a JS playback queue should be mirrored into the native ExoPlayer
 * timeline so the Kotlin engine owns gapless auto-advance — the ONLY advancer
 * that runs while the app is asleep (JS is frozen by Doze). Kept pure (no native
 * imports) so it can be unit-tested: the radio gate below is exactly what
 * regressed a backgrounded "podcast → radio" queue.
 */
export const shouldMirrorPlaybackQueueToNative = (queue: {
    index: number;
    items: MobilePlayableAudio[];
}): boolean => {
    if (queue.items.length <= 1) {
        return false;
    }

    // Radio is a live, endless stream you can't gaplessly advance OUT of, so
    // when it's the CURRENTLY PLAYING item there's no queue to mirror. But radio
    // sitting LATER in the queue MUST still be mirrored: native auto-advance is
    // the only advancer that runs while the app is asleep (JS is frozen by
    // Doze), so the old `.some(radio)` — which refused the WHOLE queue if radio
    // appeared anywhere — left a backgrounded "podcast → radio" queue with
    // nothing for native to advance into, and it never advanced. onMediaItem-
    // Transition adopts the radio item correctly when ExoPlayer reaches it
    // (currentSource.source = "radio" for the live-reconnect path; offload off).
    if (queue.items[queue.index]?.source === 'radio') {
        return false;
    }

    // Single-file audiobook split into chapter rows: every chapter is the SAME
    // stream URL. Mirroring that makes ExoPlayer treat each chapter as its own
    // item, and a seek-time STATE_ENDED blip can auto-advance into the next
    // chapter and kill playback. Only that degenerate case opts out.
    if (queue.items.every((item) => item.source === 'audiobook')) {
        const streamUrls = new Set(queue.items.map((item) => item.url));
        if (streamUrls.size === 1) {
            return false;
        }
    }

    // Everything else (music playlists, podcast episodes, multi-file audiobooks,
    // mixed song→podcast→radio queues) is owned by the native queue: Kotlin
    // advances via SamoAudioEngine.onMediaItemTransition /
    // requestQueueAdvanceFromEnded, which rebuilds each next MediaItem from its
    // full payload. A locked phone keeps advancing the whole queue with no JS in
    // the loop.
    return true;
};
