/**
 * TEMPORARY DIAGNOSTIC — remove once the retained-heap investigation is closed.
 *
 * `dumpsys meminfo` says the process holds ~530MB of LIVE native memory that a
 * RUNNING_CRITICAL trim will not give back, while the Dalvik heap collapses on
 * command and attached views go DOWN. That rules out the Java heap, view leaks
 * and reclaimable image cache, and leaves two candidates that dumpsys cannot
 * tell apart: the Hermes JS heap, or native buffers held by Glide/Fresco/media3.
 *
 * Hermes answers the first half itself. `getInstrumentedStats()` reports the VM's
 * own heap size and malloc estimate, so one log line settles whether the JS heap
 * IS the 530MB. The structure counts below then say WHICH retainer, without
 * needing a heap snapshot — every one of them is a module-level singleton that
 * grows with browsing.
 */

import { getAppNavigation } from '../state/app-navigation';
import { getAppSession } from '../state/app-session';

interface HermesStats {
    js_heapSize?: number;
    js_allocatedBytes?: number;
    js_mallocSizeEstimate?: number;
    js_numGCs?: number;
    js_gcCPUTime?: number;
}

const hermesStats = (): HermesStats => {
    const hermes = (
        globalThis as unknown as {
            HermesInternal?: { getInstrumentedStats?: () => HermesStats };
        }
    ).HermesInternal;
    try {
        return hermes?.getInstrumentedStats?.() ?? {};
    } catch {
        return {};
    }
};

const mb = (bytes: number | undefined): string =>
    bytes === undefined ? '?' : `${Math.round(bytes / (1024 * 1024))}MB`;

/** Total tracks across a detail stack — the thing each frame really holds. */
const countStackTracks = (
    stack: ReadonlyArray<{ state: { status: string; detail?: { tracks?: unknown[] } } }>,
): number =>
    stack.reduce(
        (total, frame) => total + (frame.state.detail?.tracks?.length ?? 0),
        0,
    );

export const logMemoryReport = (label: string): void => {
    const nav = getAppNavigation();
    const session = getAppSession();
    const stats = hermesStats();

    const home = nav.homeContentState;
    const homeSections = home.status === 'loaded' ? home.content.sections : [];
    const homeItems = homeSections.reduce((total, section) => total + section.items.length, 0);

    const collections = nav.mediaTypeCollections as Record<
        string,
        { items?: unknown[]; status: string }
    >;
    const collectionCounts = Object.entries(collections)
        .map(([key, value]) => `${key}=${value.status === 'loaded' ? (value.items?.length ?? 0) : value.status}`)
        .join(' ');

    const viewAll = nav.viewAllFullState;
    const search = nav.searchState as { results?: { length?: number }; status: string };

    // Raw console, not androidLog: that helper is __DEV__-gated and this has to
    // report from a RELEASE build (same reason App's [jank] heartbeat uses it).
    // eslint-disable-next-line no-console
    console.warn(
        `[mem:${label}] ` +
            `hermesHeap=${mb(stats.js_heapSize)} ` +
            `hermesAlloc=${mb(stats.js_allocatedBytes)} ` +
            `hermesMalloc=${mb(stats.js_mallocSizeEstimate)} ` +
            `gcs=${stats.js_numGCs ?? '?'} ` +
            `| home=${homeSections.length}sections/${homeItems}items ` +
            `| collections[${collectionCounts}] ` +
            `| viewAll=${viewAll.status === 'loaded' ? viewAll.items.length : viewAll.status} ` +
            `| detailStack=${nav.mediaDetailStack.length}frames/${countStackTracks(
                nav.mediaDetailStack as never,
            )}tracks ` +
            `| search=${search.status === 'loaded' ? (search.results?.length ?? 0) : search.status} ` +
            `| recents=${session.recentContentItems.length}`,
    );
};

/** Fires on an interval so the LOG SHOWS GROWTH, not just a single reading. */
export const installMemoryReport = (): (() => void) => {
    let tick = 0;
    logMemoryReport('boot');
    const interval = setInterval(() => {
        tick += 1;
        logMemoryReport(`t${tick * 30}s`);
    }, 30_000);
    return () => clearInterval(interval);
};
