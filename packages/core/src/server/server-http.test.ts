import { describe, expect, it, vi } from 'vitest';

import { getFetch, normalizeBaseUrl } from './server-http';

describe('normalizeBaseUrl', () => {
    it('trims whitespace and trailing slashes', () => {
        expect(normalizeBaseUrl('  https://music.example.com///  ')).toBe(
            'https://music.example.com',
        );
    });

    it('preserves a single path without trailing slash', () => {
        expect(normalizeBaseUrl('http://localhost:4533/library')).toBe(
            'http://localhost:4533/library',
        );
    });

    it('treats missing values as empty', () => {
        expect(normalizeBaseUrl(undefined)).toBe('');
        expect(normalizeBaseUrl(null)).toBe('');
    });
});

describe('getFetch', () => {
    it('wraps the resolved fetcher with a timeout layer', () => {
        const fetcher = vi.fn().mockResolvedValue({
            json: async () => ({}),
            ok: true,
            status: 200,
        });

        const wrapped = getFetch(fetcher);

        expect(wrapped).not.toBe(fetcher);
    });

    it('retries a GET once after a transient transport failure', async () => {
        const okResponse = { json: async () => ({}), ok: true, status: 200 };
        const fetcher = vi
            .fn()
            .mockRejectedValueOnce(new TypeError('Network request failed'))
            .mockResolvedValueOnce(okResponse);

        const wrapped = getFetch(fetcher);
        const result = await wrapped('https://samo.test/api/v1/podcasts');

        expect(result).toBe(okResponse);
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('gives up after the retry also fails', async () => {
        const fetcher = vi.fn().mockRejectedValue(new TypeError('Network request failed'));

        const wrapped = getFetch(fetcher);

        await expect(wrapped('https://samo.test/api/v1/podcasts')).rejects.toThrow(
            'Network request failed',
        );
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('never retries a mutation', async () => {
        const fetcher = vi.fn().mockRejectedValue(new TypeError('Network request failed'));

        const wrapped = getFetch(fetcher);

        await expect(
            wrapped('https://samo.test/api/v1/auth/login', { method: 'POST' }),
        ).rejects.toThrow('Network request failed');
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('never retries when the caller already supplies an AbortSignal', async () => {
        const fetcher = vi.fn().mockRejectedValue(new TypeError('Network request failed'));
        const controller = new AbortController();

        const wrapped = getFetch(fetcher);

        await expect(
            wrapped('https://samo.test/api/v1/podcasts', { signal: controller.signal }),
        ).rejects.toThrow('Network request failed');
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('does not retry a real HTTP error response (only transport failures)', async () => {
        const errorResponse = { json: async () => ({}), ok: false, status: 500 };
        const fetcher = vi.fn().mockResolvedValue(errorResponse);

        const wrapped = getFetch(fetcher);
        const result = await wrapped('https://samo.test/api/v1/podcasts');

        expect(result).toBe(errorResponse);
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    // A call that says how long it needs gets that long, not the default —
    // and the number rides through to the transport, so a transport that
    // proxies the call to another timeout layer (the desktop's main process)
    // can honour the same deadline rather than cutting it off underneath.
    it('lets a request carry its own deadline past the default', async () => {
        vi.useFakeTimers();
        try {
            const fetcher = vi.fn(
                (_url: string, init?: { signal?: AbortSignal; timeoutMs?: number }) =>
                    new Promise<{ json: () => Promise<unknown>; ok: boolean; status: number }>(
                        (resolve, reject) => {
                            init?.signal?.addEventListener('abort', () => {
                                const error = new Error('aborted');
                                error.name = 'AbortError';
                                reject(error);
                            });
                            setTimeout(
                                () => resolve({ json: async () => ({}), ok: true, status: 200 }),
                                40_000,
                            );
                        },
                    ),
            );

            const wrapped = getFetch(fetcher);
            const result = wrapped('https://samo.test/api/v1/explo/keep', {
                method: 'POST',
                timeoutMs: 60_000,
            });
            // Nothing observes a rejection before the answer lands, so a
            // stray one would surface as an unhandled rejection.
            const settled = result.then(
                () => 'answered' as const,
                (error: Error) => error.message,
            );

            await vi.advanceTimersByTimeAsync(35_000);
            expect(fetcher).toHaveBeenCalledTimes(1);
            expect(fetcher.mock.calls[0][1]?.timeoutMs).toBe(60_000);

            await vi.advanceTimersByTimeAsync(10_000);
            expect(await settled).toBe('answered');
        } finally {
            vi.useRealTimers();
        }
    });

    it('still cuts an ordinary request off at the default', async () => {
        vi.useFakeTimers();
        try {
            const fetcher = vi.fn(
                (_url: string, init?: { signal?: AbortSignal }) =>
                    new Promise<never>((_resolve, reject) => {
                        init?.signal?.addEventListener('abort', () => {
                            const error = new Error('aborted');
                            error.name = 'AbortError';
                            reject(error);
                        });
                    }),
            );

            const wrapped = getFetch(fetcher);
            const settled = wrapped('https://samo.test/api/v1/podcasts', { method: 'POST' }).then(
                () => 'answered' as const,
                (error: Error) => error.message,
            );

            await vi.advanceTimersByTimeAsync(30_000);
            expect(await settled).toBe('Request timed out after 30000ms');
        } finally {
            vi.useRealTimers();
        }
    });
});
