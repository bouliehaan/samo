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
 * Flip SEEK_GESTURE_DEBUG to false (or delete this file and its call sites)
 * once the gesture behavior is confirmed good — the runOnJS hops out of the
 * gesture worklets make this unfit to leave on in a shipping build.
 */
export const SEEK_GESTURE_DEBUG = true;

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
