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
export declare const useRememberMusicSession: () => void;
export declare const RememberMusicSessionHook: () => null;
