import { describe, expect, it } from 'vitest';

import { collectSamoPages } from './server-samo-pagination';

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

        const collected = await collectSamoPages(500, 2000, fetchPage);

        expect(offsets).toEqual([0, 500, 1000, 1500]);
        expect(collected).toHaveLength(2000);
    });

    it('stops at the hard ceiling when a server never returns a short page', async () => {
        const offsets: number[] = [];
        const fetchPage = async (offset: number) => {
            offsets.push(offset);
            // No `total` at all, and every page is full — the runaway case the
            // ceiling exists for.
            return { items: Array.from({ length: 500 }, (_, index) => `item-${offset + index}`) };
        };

        const collected = await collectSamoPages(500, 1500, fetchPage);

        expect(offsets).toEqual([0, 500, 1000]);
        expect(collected).toHaveLength(1500);
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
