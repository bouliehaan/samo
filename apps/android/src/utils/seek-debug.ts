/**
 * TEMPORARY on-device gesture diagnostics for the player seek bar.
 *
 * Logs land in Android logcat under the `ReactNativeJS` tag. Filter on device:
 *     adb logcat | grep SEEKBAR
 *
 * This exists to prove — on the real device — exactly which gesture begins,
 * activates, commits, or gets stolen when the bar "barely responds". The story
 * a healthy tap/drag tells:
 *     [SEEKBAR] tap:begin            (finger down on the bar)
 *     [SEEKBAR] tap:end {"success":true,...}
 *   …or for a drag:
 *     [SEEKBAR] pan:begin
 *     [SEEKBAR] pan:activate         (claimed past the 6px threshold)
 *     [SEEKBAR] pan:end {"progress":0.42}
 * A FAILING tap shows `tap:end {"success":false}` (or only `tap:finalize`
 * with no `tap:end`) — the touch was rejected (e.g. held past maxDuration).
 * A STOLEN drag shows `pan:begin` then `player:drag:activate` /
 * `player:skip:activate` with no `pan:activate` — the parent player gesture
 * won the touch instead of the seek bar.
 *
 * Flip SEEK_GESTURE_DEBUG to true to re-arm when chasing a gesture regression.
 * Call sites check the flag INSIDE the worklet before runOnJS — with the flag
 * off the worklet→JS hop is skipped entirely, so shipping builds pay nothing.
 * (Verified good on-device 2026-07-02: tap and pan both commit first-touch.)
 */
export const SEEK_GESTURE_DEBUG = false;

export function logSeekGesture(event: string, data?: Record<string, unknown>): void {
    if (!SEEK_GESTURE_DEBUG) {
        return;
    }
    if (data) {
        // eslint-disable-next-line no-console -- deliberate on-device gesture diagnostic (logcat)
        console.log('[SEEKBAR]', event, JSON.stringify(data));
    } else {
        // eslint-disable-next-line no-console -- deliberate on-device gesture diagnostic (logcat)
        console.log('[SEEKBAR]', event);
    }
}
