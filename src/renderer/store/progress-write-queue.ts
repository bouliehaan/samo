import {
    patchSamoPlayback,
    type SamoPlaybackPatch,
    type SamoPlaybackTargetKind,
} from '@samo/core/server';

import { samoFetch } from '/@/renderer/api/samo/samo-fetch';
import { LogCategory, logFn } from '/@/shared/utils/logger';

/**
 * Durable, coalescing retry queue for long-form (audiobook/podcast) progress
 * writes on desktop. A bare `patchSamoPlayback(...).catch(log)` dropped the
 * write on any blip — including the close-flush, the one you most want to keep.
 *
 * Guarantees:
 *  - Coalesce by target: only the LATEST position per (kind,targetId) is kept,
 *    so a backlog can never replay a stale position over a newer one.
 *  - Retry with exponential backoff until it lands.
 *  - Persist to localStorage so a write survives an app quit/crash and replays
 *    on next launch; flush again when the machine comes back `online`.
 *  - Idempotent payloads only (progressSeconds/completed/touch*) — last-writer-
 *    wins on the server, so a replay can never corrupt state.
 */
export interface PendingProgressWrite {
    credential: string;
    kind: SamoPlaybackTargetKind;
    patch: SamoPlaybackPatch;
    targetId: string;
    updatedAt: number;
    url: string;
}

const STORAGE_KEY = 'samo:progress-write-queue:v1';
const BASE_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 60_000;

const queueKey = (kind: string, targetId: string) => `${kind}:${targetId}`;

export interface ProgressWriteQueue {
    enqueue: (entry: Omit<PendingProgressWrite, 'updatedAt'> & { updatedAt?: number }) => void;
    flush: () => void;
    pendingCount: () => number;
}

export interface ProgressWriteQueueDeps {
    now: () => number;
    /** Performs the actual write. Rejects on failure (network/HTTP). */
    patch: (entry: PendingProgressWrite) => Promise<unknown>;
    /** Schedules a delayed retry; returns a cancel fn. */
    schedule: (run: () => void, delayMs: number) => () => void;
    storage: null | Pick<Storage, 'getItem' | 'setItem'>;
}

export const createProgressWriteQueue = (deps: ProgressWriteQueueDeps): ProgressWriteQueue => {
    const pending = new Map<string, PendingProgressWrite>();
    const inFlight = new Set<string>();
    const attempts = new Map<string, number>();
    const timers = new Map<string, () => void>();

    const persist = () => {
        if (!deps.storage) return;
        try {
            deps.storage.setItem(STORAGE_KEY, JSON.stringify([...pending.values()]));
        } catch {
            // Storage full/unavailable — the in-memory queue still functions.
        }
    };

    const clearTimer = (key: string) => {
        const cancel = timers.get(key);
        if (cancel) {
            cancel();
            timers.delete(key);
        }
    };

    const scheduleRetry = (key: string) => {
        const attemptNo = attempts.get(key) ?? 0;
        const delay = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attemptNo);
        clearTimer(key);
        timers.set(
            key,
            deps.schedule(() => {
                timers.delete(key);
                void attempt(key);
            }, delay),
        );
    };

    async function attempt(key: string): Promise<void> {
        if (inFlight.has(key)) return;
        const entry = pending.get(key);
        if (!entry) return;

        inFlight.add(key);
        let succeeded = false;
        try {
            await deps.patch(entry);
            succeeded = true;
        } catch (error) {
            attempts.set(key, (attempts.get(key) ?? 0) + 1);
            logFn.warn('[abs] progress write failed; queued for retry', {
                category: LogCategory.PLAYER,
                meta: { attempt: attempts.get(key), error, key },
            });
        } finally {
            inFlight.delete(key);
        }

        if (!succeeded) {
            scheduleRetry(key);
            return;
        }

        // Success. Only drop the entry if nothing newer replaced it mid-flight;
        // a newer write (different object ref) must still be sent.
        if (pending.get(key) === entry) {
            pending.delete(key);
            attempts.delete(key);
            clearTimer(key);
            persist();
        } else {
            void attempt(key);
        }
    }

    const enqueue: ProgressWriteQueue['enqueue'] = (input) => {
        const entry: PendingProgressWrite = {
            ...input,
            updatedAt: input.updatedAt ?? deps.now(),
        };
        const key = queueKey(entry.kind, entry.targetId);
        pending.set(key, entry); // coalesce: latest position wins
        attempts.set(key, 0); // fresh user activity resets the backoff
        clearTimer(key);
        persist();
        void attempt(key);
    };

    const flush = () => {
        for (const key of pending.keys()) {
            void attempt(key);
        }
    };

    // Restore anything a previous session left unsent, then try to drain it.
    if (deps.storage) {
        try {
            const raw = deps.storage.getItem(STORAGE_KEY);
            if (raw) {
                const restored = JSON.parse(raw) as PendingProgressWrite[];
                for (const entry of restored) {
                    if (
                        entry?.kind &&
                        entry.targetId &&
                        entry.url &&
                        entry.credential &&
                        entry.patch
                    ) {
                        pending.set(queueKey(entry.kind, entry.targetId), entry);
                    }
                }
            }
        } catch {
            // Corrupt/absent persisted queue — start clean.
        }
    }
    flush();

    return {
        enqueue,
        flush,
        pendingCount: () => pending.size,
    };
};

const defaultSchedule = (run: () => void, delayMs: number) => {
    const id = setTimeout(run, delayMs);
    return () => clearTimeout(id);
};

export const progressWriteQueue: ProgressWriteQueue = createProgressWriteQueue({
    now: () => Date.now(),
    patch: (entry) =>
        patchSamoPlayback(
            samoFetch,
            { credential: entry.credential, url: entry.url },
            entry.kind,
            entry.targetId,
            entry.patch,
        ),
    schedule: defaultSchedule,
    storage: typeof localStorage !== 'undefined' ? localStorage : null,
});

if (typeof window !== 'undefined') {
    // Drain the backlog the moment connectivity returns.
    window.addEventListener('online', () => progressWriteQueue.flush());
}

export const enqueueProgressWrite = progressWriteQueue.enqueue;
