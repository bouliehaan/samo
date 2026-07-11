import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    createProgressWriteQueue,
    type PendingProgressWrite,
    type ProgressWriteQueueDeps,
} from '/@/renderer/store/progress-write-queue';

// logger.ts reads localStorage at construction; tests run in the `node` env, so
// stub it out (the queue's failure path only calls logFn.warn).
vi.mock('/@/shared/utils/logger', () => ({
    LogCategory: { PLAYER: 'player' },
    logFn: { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} },
}));

const STORAGE_KEY = 'samo:progress-write-queue:v1';

/** Flush pending microtasks (the async attempt() continuations). */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

const makeStorage = () => {
    const map = new Map<string, string>();
    return {
        getItem: (key: string) => map.get(key) ?? null,
        map,
        setItem: (key: string, value: string) => {
            map.set(key, value);
        },
    };
};

/** Manual scheduler: records jobs so tests fire retries deterministically. */
const makeScheduler = () => {
    const jobs: Array<() => void> = [];
    const schedule: ProgressWriteQueueDeps['schedule'] = (run) => {
        jobs.push(run);
        return () => {
            const index = jobs.indexOf(run);
            if (index >= 0) jobs.splice(index, 1);
        };
    };
    return {
        runAll: () => jobs.splice(0).forEach((job) => job()),
        schedule,
        get size() {
            return jobs.length;
        },
    };
};

const entry = (
    overrides: Partial<PendingProgressWrite> = {},
): Omit<PendingProgressWrite, 'updatedAt'> => ({
    credential: 'cred',
    kind: 'audiobook',
    patch: { progressSeconds: 100 },
    targetId: 'book-1',
    url: 'https://samo',
    ...overrides,
});

describe('progress-write-queue', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('writes and drains on success, persisting the empty queue', async () => {
        const storage = makeStorage();
        const patch = vi.fn().mockResolvedValue(undefined);
        const queue = createProgressWriteQueue({
            now: () => 1,
            patch,
            schedule: makeScheduler().schedule,
            storage,
        });

        queue.enqueue(entry());
        expect(queue.pendingCount()).toBe(1);

        await tick();

        expect(patch).toHaveBeenCalledTimes(1);
        expect(queue.pendingCount()).toBe(0);
        expect(storage.getItem(STORAGE_KEY)).toBe('[]');
    });

    it('retries with backoff after a failure, then drains', async () => {
        const scheduler = makeScheduler();
        const patch = vi
            .fn()
            .mockRejectedValueOnce(new Error('network'))
            .mockResolvedValueOnce(undefined);
        const queue = createProgressWriteQueue({
            now: () => 1,
            patch,
            schedule: scheduler.schedule,
            storage: makeStorage(),
        });

        queue.enqueue(entry());
        await tick();

        // First attempt failed → still pending, retry scheduled.
        expect(patch).toHaveBeenCalledTimes(1);
        expect(queue.pendingCount()).toBe(1);
        expect(scheduler.size).toBe(1);

        scheduler.runAll();
        await tick();

        expect(patch).toHaveBeenCalledTimes(2);
        expect(queue.pendingCount()).toBe(0);
    });

    it('coalesces by target and never drops a newer position queued mid-flight', async () => {
        let release: () => void = () => {};
        const gate = new Promise<void>((resolve) => {
            release = resolve;
        });
        const patch = vi
            .fn()
            .mockImplementationOnce(async () => {
                await gate; // first attempt hangs in-flight
            })
            .mockResolvedValue(undefined);

        const queue = createProgressWriteQueue({
            now: () => 1,
            patch,
            schedule: makeScheduler().schedule,
            storage: makeStorage(),
        });

        queue.enqueue(entry({ patch: { progressSeconds: 10 } }));
        await tick(); // first attempt is now awaiting the gate

        // A newer position arrives for the same target while the first is in flight.
        queue.enqueue(entry({ patch: { progressSeconds: 20 } }));

        release();
        await tick();
        await tick();

        // The success of the stale (10) must NOT delete the newer (20): it gets sent.
        expect(patch).toHaveBeenCalledTimes(2);
        expect(patch.mock.calls[0]?.[0].patch.progressSeconds).toBe(10);
        expect(patch.mock.calls[1]?.[0].patch.progressSeconds).toBe(20);
        expect(queue.pendingCount()).toBe(0);
    });

    it('restores persisted writes and flushes them on startup', async () => {
        const storage = makeStorage();
        storage.setItem(
            STORAGE_KEY,
            JSON.stringify([
                {
                    credential: 'cred',
                    kind: 'audiobook',
                    patch: { progressSeconds: 77 },
                    targetId: 'book-9',
                    updatedAt: 1,
                    url: 'https://samo',
                },
            ]),
        );
        const patch = vi.fn().mockResolvedValue(undefined);

        const queue = createProgressWriteQueue({
            now: () => 2,
            patch,
            schedule: makeScheduler().schedule,
            storage,
        });

        await tick();

        expect(patch).toHaveBeenCalledTimes(1);
        expect(patch.mock.calls[0]?.[0].patch.progressSeconds).toBe(77);
        expect(queue.pendingCount()).toBe(0);
    });
});
