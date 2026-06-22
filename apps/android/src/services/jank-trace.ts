// Breadcrumb trail for diagnosing JS-thread stalls.
//
// The `[jank]` heartbeat monitor in App.tsx fires whenever the 2s tick lands
// late — i.e. the JS thread was blocked. On its own it only knows the DURATION,
// not the CAUSE, which makes an intermittent freeze ("sometimes the app gets
// slow and nothing opens") almost impossible to pin down from a log.
//
// This records WHAT ran. The handful of genuinely heavy synchronous operations
// (mirror reads on the render path, the Home/Library derive, the reader reopen)
// wrap themselves in `traceSync`; any call that runs past the floor is kept in a
// small ring buffer. When the monitor detects a block it drains the buffer into
// the log line, so the next stall reads e.g.
//   [jank] JS thread blocked ~2.3s | slow ops: catalog.itemsByType:album 248ms, …
// which tells us instantly whether it's read contention (DELETE-journal writer
// holding the lock), the derive, or — if nothing is traced — React render / GC /
// a native bridge call. Overhead is two Date.now() calls per wrapped op, and
// nothing is allocated unless an op actually runs slow.

interface TracedOp {
    label: string;
    ms: number;
}

const RECORD_FLOOR_MS = 60;
const RING_SIZE = 16;

const recentSlowOps: TracedOp[] = [];
let currentActivity: string | null = null;

/** Time a synchronous operation; record it if it ran past the floor. */
export const traceSync = <T>(label: string, fn: () => T): T => {
    const previous = currentActivity;
    currentActivity = label;
    const start = Date.now();
    try {
        return fn();
    } finally {
        const ms = Date.now() - start;
        if (ms >= RECORD_FLOOR_MS) {
            recentSlowOps.push({ label, ms });
            if (recentSlowOps.length > RING_SIZE) {
                recentSlowOps.shift();
            }
        }
        currentActivity = previous;
    }
};

/** Drain the recorded slow ops and render them for the jank log line. */
export const formatJankBreadcrumb = (): string => {
    const drained = recentSlowOps.slice();
    recentSlowOps.length = 0;
    if (drained.length > 0) {
        return ` | slow ops: ${drained.map((op) => `${op.label} ${op.ms}ms`).join(', ')}`;
    }
    // No traced synchronous op ran slow during the block — the cost was React
    // render reconciliation, garbage collection, or a synchronous native call.
    return currentActivity ? ` | during: ${currentActivity}` : ' | no traced op (render/GC/native)';
};
