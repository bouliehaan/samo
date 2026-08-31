import { type DownloadEntry } from '../services/download-manager';

/**
 * What the ring shows the moment a download is asked for, before a single byte
 * has moved. An arc at literally zero is indistinguishable from "nothing
 * happened", which is the whole complaint this indicator exists to answer.
 */
export const DOWNLOAD_PROGRESS_START = 0.06;

export type DownloadProgressSummary = {
    /** True while anything is queued, transferring, or just finished. */
    active: boolean;
    completed: boolean;
    /** 0–1, already clamped. */
    progress: number;
};

export const IDLE_DOWNLOAD_PROGRESS: DownloadProgressSummary = {
    active: false,
    completed: false,
    progress: 0,
};

/** One entry's contribution to its collection's arc, 0–1. */
export const getEntryProgress = (entry: DownloadEntry | undefined): number => {
    if (!entry) return 0;
    if (entry.status === 'completed') return 1;
    if (entry.status === 'downloading') {
        return Math.max(entry.progress ?? 0, DOWNLOAD_PROGRESS_START);
    }
    if (entry.status === 'queued') return DOWNLOAD_PROGRESS_START;
    return 0;
};

/**
 * A retried track leaves more than one entry behind, so the newest enqueue is
 * the one that describes where that track actually stands.
 */
export const pickLatestEntryPerTrack = (
    entries: DownloadEntry[],
): Map<string, DownloadEntry> => {
    const latest = new Map<string, DownloadEntry>();
    for (const entry of entries) {
        const current = latest.get(entry.trackId);
        if (!current || entry.enqueuedAt > current.enqueuedAt) {
            latest.set(entry.trackId, entry);
        }
    }
    return latest;
};

/**
 * Roll a collection's entries up into one arc.
 *
 * `expectedCount` is the number of tracks the collection is KNOWN to contain —
 * from the loaded detail, or from whatever kicked the download off. It matters
 * because entries are written to the registry one at a time: re-downloading an
 * album that is already half on disk hands us a single completed entry first,
 * and dividing by "entries so far" would open the arc at 100% and then walk it
 * backwards as the rest arrive. Dividing by the real track count only ever
 * moves it forwards. Where the count genuinely isn't knowable (audiobooks, whose
 * files are decided server-side) the entries are the best answer we have.
 *
 * `requested` covers the window between the tap and the first entry existing —
 * a detail fetch and a token mint can both sit in there.
 */
export const summarizeDownloadEntries = (
    entries: (DownloadEntry | undefined)[],
    options?: { expectedCount?: number; requested?: boolean },
): DownloadProgressSummary => {
    const requested = options?.requested ?? false;
    const denominator = Math.max(options?.expectedCount ?? 0, entries.length);
    if (denominator === 0) {
        return requested
            ? { active: true, completed: false, progress: DOWNLOAD_PROGRESS_START }
            : IDLE_DOWNLOAD_PROGRESS;
    }
    const completed =
        entries.length >= denominator &&
        entries.every((entry) => entry?.status === 'completed');
    const pending = entries.some(
        (entry) => entry?.status === 'queued' || entry?.status === 'downloading',
    );
    if (!completed && !pending && !requested) {
        // Nothing in flight and not everything landed: a part-failed or
        // part-cancelled collection is the downloaded tick's business, not the
        // arc's. Leaving a frozen half-arc up would be worse than saying nothing.
        return IDLE_DOWNLOAD_PROGRESS;
    }
    const raw =
        entries.reduce((sum, entry) => sum + getEntryProgress(entry), 0) / denominator;
    return {
        active: true,
        completed,
        // Floored at the opening sliver for as long as anything is in flight.
        // Mid-enqueue the registry holds three of an album's twelve tracks, all
        // queued, which averages out to less than the arc already showed — and
        // an arc that shrinks while a download runs reads as a fault.
        progress: Math.min(1, Math.max(DOWNLOAD_PROGRESS_START, raw)),
    };
};
