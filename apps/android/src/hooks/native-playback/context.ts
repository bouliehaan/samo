import type { MobilePlayableAudio } from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';
import { type MutableRefObject } from 'react';

import type { PlaybackProgressContext } from '../../services/playback-progress';
import type { AndroidQueuePlaylistOrigin } from '../../state/playback-queue-store';

export type PlaybackSnapshot = { item: MobilePlayableAudio; sessionId: string };

export type AndroidPlayItemOptions = {
    /** Samo audiobook: open stream at this book-global second (skips server resume overlay). */
    bookStartSeconds?: number;
    /** Started from a playlist this user may edit — see AndroidQueuePlaylistOrigin. */
    editablePlaylist?: AndroidQueuePlaylistOrigin;
    /** Started from the Explore drop playlist — see AndroidPlaybackQueue. */
    isExploPlaylist?: boolean;
    omitTrackRecentlyPlayed?: boolean;
    /** Queue auto-advance / next file — do not overlay ABS saved book progress. */
    skipResumeRefresh?: boolean;
    samoPlaylistId?: string;
    shuffled?: boolean;
};

/**
 * The mutable session context every native-playback function works against.
 * One instance lives for the life of the hook; the module functions in this
 * directory take it as their first argument instead of closing over a web of
 * refs, which is what keeps them referentially stable (a recreated
 * playQueuedItem used to cascade into audio-event resubscribes with a window
 * where native events were dropped).
 *
 * Ref-shaped fields on purpose: `progressContextRef` and `playbackSnapshotRef` are
 * part of the hook's public controller API, and the private ones read
 * identically at every call site.
 */
export type NativePlaybackContext = {
    progressContextRef: MutableRefObject<PlaybackProgressContext | null>;
    castConnectedRef: MutableRefObject<boolean>;
    /** Session an ended-event advance already ran for (dedupes double 'ended'). */
    lastAdvancedFromSessionRef: MutableRefObject<null | string>;
    lastPlayedItemRef: MutableRefObject<MobilePlayableAudio | null>;
    navigateRef: MutableRefObject<((direction: -1 | 1) => Promise<void>) | null>;
    /**
     * The session whose freshly-committed active item native has NOT yet
     * confirmed. While set, native's in-flight transition events (which still
     * name the OUTGOING track during a Next/Prev or queue tap) must not move
     * the active item — otherwise the player flickers between the two songs
     * before the new one's events arrive. Cleared the instant native reports
     * our item.
     */
    pendingItemSessionRef: MutableRefObject<null | string>;
    playbackRecoveryAttemptRef: MutableRefObject<number>;
    playbackSequenceRef: MutableRefObject<number>;
    playbackSnapshotRef: MutableRefObject<null | PlaybackSnapshot>;
    playbackStartedAtRef: MutableRefObject<number>;
    queueAdvanceInFlightRef: MutableRefObject<boolean>;
    /**
     * Sessions JS deliberately skipped away from. After we start the next
     * track (a new session), native can still emit a trailing status echo for
     * the just-left track on its OLD session; rejecting those stale echoes
     * keeps the queue index from flickering backward on Next/Prev.
     */
    retiredSessionsRef: MutableRefObject<Set<string>>;
    serverConnectionsRef: MutableRefObject<null | ServerAuthenticationResult>;
};

export const createNativePlaybackContext = (): NativePlaybackContext => ({
    progressContextRef: { current: null },
    castConnectedRef: { current: false },
    lastAdvancedFromSessionRef: { current: null },
    lastPlayedItemRef: { current: null },
    navigateRef: { current: null },
    pendingItemSessionRef: { current: null },
    playbackRecoveryAttemptRef: { current: 0 },
    playbackSequenceRef: { current: 0 },
    playbackSnapshotRef: { current: null },
    playbackStartedAtRef: { current: 0 },
    queueAdvanceInFlightRef: { current: false },
    retiredSessionsRef: { current: new Set<string>() },
    serverConnectionsRef: { current: null },
});
