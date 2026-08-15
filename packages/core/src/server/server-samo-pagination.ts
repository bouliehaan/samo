import { type SamoPaginatedResponse, samoItemsOf, samoTotalOf } from './server-samo';

/**
 * Collect every item of a paginated list.
 *
 * The first page is always fetched on its own, because its envelope carries the
 * `total`. Once that is known the exact remaining offsets are requested
 * CONCURRENTLY — one round trip of latency plus one burst, with not a single
 * wasted request. A 40-track playlist costs one request; a 1234-track playlist
 * costs one request then two in parallel.
 *
 * Servers that omit `total` fall back to the old sequential
 * fetch-until-short-page. That path is correct but slow, and it is the reason
 * the `total` is worth reading in the first place — see `samoTotalOf`.
 *
 * `hardCeiling` is a runaway guard against a server that reports a nonsense
 * total or never returns a short page. It is not a product limit.
 */
export const collectSamoPages = async <T>(
    pageSize: number,
    hardCeiling: number,
    fetchPage: (offset: number) => Promise<SamoPaginatedResponse<T> | T[] | undefined>,
): Promise<T[]> => {
    const firstResponse = await fetchPage(0);
    const firstPage = samoItemsOf(firstResponse);

    // A short first page is the whole list no matter what the envelope claims.
    if (firstPage.length < pageSize) {
        return firstPage;
    }

    const total = samoTotalOf(firstResponse);

    if (total === undefined) {
        const collected = [...firstPage];
        for (let offset = pageSize; offset < hardCeiling; offset += pageSize) {
            const batch = samoItemsOf(await fetchPage(offset));
            collected.push(...batch);
            if (batch.length < pageSize) {
                break;
            }
        }
        return collected;
    }

    const remainingOffsets: number[] = [];
    for (let offset = pageSize; offset < Math.min(total, hardCeiling); offset += pageSize) {
        remainingOffsets.push(offset);
    }

    const remainingPages = await Promise.all(
        remainingOffsets.map(async (offset) => samoItemsOf(await fetchPage(offset))),
    );

    return remainingPages.reduce<T[]>((collected, batch) => {
        collected.push(...batch);
        return collected;
    }, firstPage);
};
