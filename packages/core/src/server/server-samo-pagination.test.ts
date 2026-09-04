import { describe, expect, it } from 'vitest';

import {
    collectSamoPages,
    collectSamoPagesCapped,
    SamoPageCeilingError,
} from './server-samo-pagination';

/**
 * Builds a fake paginated endpoint over a fixed list, recording every offset it
 * was asked for so tests can assert on the request pattern, not just the result.
 */
const pagedSource = (total: number, pageSize: number, options: { omitTotal?: boolean } = {}) => {
    const offsets: number[] = [];
    const items = Array.from({ length: total }, (_, index) => `item-${index}`);

    const fetchPage = async (offset: number) => {
        offsets.push(offset);
        const page = items.slice(offset, offset + pageSize);
        return options.omitTotal
            ? { items: page, limit: pageSize, offset }
            : { items: page, limit: pageSize, offset, total };
    };

    return { fetchPage, items, offsets };
};

describe('collectSamoPages', () => {
    it('returns a short first page without asking for a second', async () => {
        const { fetchPage, offsets } = pagedSource(40, 500);

        const collected = await collectSamoPages(500, 50_000, fetchPage);

        expect(collected).toHaveLength(40);
        expect(offsets).toEqual([0]);
    });

    it('collects past the first page instead of truncating at pageSize', async () => {
        const { fetchPage, items } = pagedSource(1234, 500);

        const collected = await collectSamoPages(500, 50_000, fetchPage);

        expect(collected).toEqual(items);
    });

    it('requests the exact remaining offsets once the total is known', async () => {
        const { fetchPage, offsets } = pagedSource(1234, 500);

        await collectSamoPages(500, 50_000, fetchPage);

        expect(offsets).toEqual([0, 500, 1000]);
    });

    it('falls back to sequential fetch-until-short-page when total is absent', async () => {
        const { fetchPage, items, offsets } = pagedSource(1100, 500, { omitTotal: true });

        const collected = await collectSamoPages(500, 50_000, fetchPage);

        expect(collected).toEqual(items);
        expect(offsets).toEqual([0, 500, 1000]);
    });

    it('stops at the hard ceiling when a server reports a nonsense total', async () => {
        const offsets: number[] = [];
        const fetchPage = async (offset: number) => {
            offsets.push(offset);
            return {
                items: Array.from({ length: 500 }, (_, index) => `item-${offset + index}`),
                total: Number.MAX_SAFE_INTEGER,
            };
        };

        const { items: collected, truncated } = await collectSamoPagesCapped(500, 2000, fetchPage);

        expect(offsets.sort((a, b) => a - b)).toEqual([0, 500, 1000, 1500]);
        expect(collected).toHaveLength(2000);
        expect(truncated).toBe(true);
    });

    it('stops at the hard ceiling when a server never returns a short page', async () => {
        const offsets: number[] = [];
        const fetchPage = async (offset: number) => {
            offsets.push(offset);
            // No `total` at all, and every page is full — the runaway case the
            // ceiling exists for.
            return { items: Array.from({ length: 500 }, (_, index) => `item-${offset + index}`) };
        };

        const { items: collected, truncated } = await collectSamoPagesCapped(500, 1500, fetchPage);

        expect(offsets).toEqual([0, 500, 1000]);
        expect(collected).toHaveLength(1500);
        expect(truncated).toBe(true);
    });

    it('accepts a bare array response and treats its length as the total', async () => {
        const collected = await collectSamoPages(2, 100, async (offset) =>
            offset === 0 ? ['a', 'b'] : [],
        );

        // A bare array of exactly pageSize is not short, so the paginator asks
        // for the next offset and gets an empty page.
        expect(collected).toEqual(['a', 'b']);
    });

    it('preserves order across concurrently fetched pages', async () => {
        const items = Array.from({ length: 1500 }, (_, index) => index);
        const fetchPage = async (offset: number) => {
            // Later pages resolve first, so a naive implementation that appends
            // in completion order would scramble the list.
            await new Promise((resolve) => setTimeout(resolve, offset === 500 ? 20 : 0));
            return { items: items.slice(offset, offset + 500), total: items.length };
        };

        const collected = await collectSamoPages(500, 50_000, fetchPage);

        expect(collected).toEqual(items);
    });
});

describe('collectSamoPages refuses to truncate', () => {
    // The bug this guards: samo's playlist API replaces `trackIds` wholesale, so
    // a short read written back is a delete. A 25,000-track playlist edited on a
    // client with a 20,000 ceiling silently lost 5,000 tracks and reported
    // success. Throwing is the only return value a caller cannot ignore.
    it('throws rather than return a partial list when the total exceeds the ceiling', async () => {
        const fetchPage = async (offset: number) => ({
            items: Array.from({ length: 500 }, (_, index) => `item-${offset + index}`),
            total: 25_000,
        });

        await expect(collectSamoPages(500, 20_000, fetchPage)).rejects.toBeInstanceOf(
            SamoPageCeilingError,
        );
    });

    it('throws when a server never returns a short page and never reports a total', async () => {
        const fetchPage = async (offset: number) => ({
            items: Array.from({ length: 500 }, (_, index) => `item-${offset + index}`),
        });

        await expect(collectSamoPages(500, 1500, fetchPage)).rejects.toBeInstanceOf(
            SamoPageCeilingError,
        );
    });

    it('returns the whole list when it fits under the ceiling', async () => {
        const fetchPage = async (offset: number) => ({
            items: Array.from({ length: Math.max(0, Math.min(500, 1200 - offset)) }, (_, index) =>
                String(offset + index),
            ),
            total: 1200,
        });

        await expect(collectSamoPages(500, 20_000, fetchPage)).resolves.toHaveLength(1200);
    });

    it('never runs more than the concurrency limit of requests at once', async () => {
        let inFlight = 0;
        let peak = 0;
        const fetchPage = async (offset: number) => {
            inFlight += 1;
            peak = Math.max(peak, inFlight);
            await new Promise((resolve) => setTimeout(resolve, 1));
            inFlight -= 1;
            return {
                items: Array.from({ length: 500 }, (_, index) => String(offset + index)),
                total: 20_000,
            };
        };

        await collectSamoPages(500, 50_000, fetchPage);

        // 40 pages remain after the first. Unbounded, that was 40 simultaneous
        // requests from a phone through the tunnel.
        expect(peak).toBeLessThanOrEqual(6);
    });
});
