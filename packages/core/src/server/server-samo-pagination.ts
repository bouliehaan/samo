import { type SamoPaginatedResponse, samoItemsOf, samoTotalOf } from './server-samo';

/**
 * How many page requests may be in flight at once.
 *
 * The first page is fetched alone to learn the `total`; every remaining offset
 * is then known, so they can all go at once. "All at once" is fine at the sizes
 * this was designed around — a 1234-track playlist is two extra requests — and
 * is not fine at the sizes the ceiling allows: 50,000 items is 100 simultaneous
 * requests from a phone, through the tunnel, which is a burst the link handles
 * far worse than it handles six at a time.
 */
const MAX_CONCURRENT_PAGES = 6;

/**
 * Thrown when a list is larger than the ceiling the caller allowed.
 *
 * This exists because the alternative — returning a short list — is
 * indistinguishable from a genuinely short list, and samo's playlist API
 * replaces `trackIds` wholesale. A truncated read written back is a delete. So
 * the truncation has to be impossible to miss, and an exception is the only
 * return value a caller cannot accidentally ignore.
 */
export class SamoPageCeilingError extends Error {
    readonly ceiling: number;
    readonly collected: number;
    readonly total: undefined | number;

    constructor(collected: number, ceiling: number, total: undefined | number) {
        super(
            `samo pagination stopped at ${collected} of ${
                total === undefined ? 'an unknown number of' : total
            } items (ceiling ${ceiling}). Refusing to return a partial list: ` +
                `a caller that writes this back would delete everything past it.`,
        );
        this.name = 'SamoPageCeilingError';
        this.ceiling = ceiling;
        this.collected = collected;
        this.total = total;
    }
}

/** What {@link collectSamoPagesCapped} returns: the items, and whether they are all of them. */
export interface SamoPageCollection<T> {
    items: T[];
    /** True when the ceiling stopped the walk before the list ended. */
    truncated: boolean;
    /** The server's reported total, when it gave one. */
    total: undefined | number;
}

/**
 * Collect every item of a paginated list, or throw rather than return part of one.
 *
 * The first page is always fetched on its own, because its envelope carries the
 * `total`. Once that is known the exact remaining offsets are requested
 * concurrently — bounded by {@link MAX_CONCURRENT_PAGES} — so a 40-track
 * playlist costs one request and a 1234-track playlist costs one then two.
 *
 * Servers that omit `total` fall back to a sequential fetch-until-short-page.
 * That path is correct but slow, and it is the reason the `total` is worth
 * reading in the first place — see `samoTotalOf`.
 *
 * `hardCeiling` is a runaway guard against a server that reports a nonsense
 * total or never returns a short page. **It is not a product limit**, and this
 * function is the one that keeps that sentence true: hitting the ceiling throws
 * {@link SamoPageCeilingError} instead of quietly handing back a short list.
 *
 * If a partial list genuinely is acceptable — a view that can show the first N
 * of something — call {@link collectSamoPagesCapped} and say so by name. Never
 * reach for it to make an exception go away on a path that writes the result
 * back.
 */
export const collectSamoPages = async <T>(
    pageSize: number,
    hardCeiling: number,
    fetchPage: (offset: number) => Promise<SamoPaginatedResponse<T> | T[] | undefined>,
): Promise<T[]> => {
    const collection = await collectSamoPagesCapped(pageSize, hardCeiling, fetchPage);
    if (collection.truncated) {
        throw new SamoPageCeilingError(collection.items.length, hardCeiling, collection.total);
    }
    return collection.items;
};

/**
 * Collect up to `hardCeiling` items, reporting whether that was all of them.
 *
 * The explicit-truncation variant, for callers that are rendering rather than
 * writing back. It is deliberately the longer name: returning a partial list is
 * the dangerous default this API used to have, so it now has to be asked for.
 */
export const collectSamoPagesCapped = async <T>(
    pageSize: number,
    hardCeiling: number,
    fetchPage: (offset: number) => Promise<SamoPaginatedResponse<T> | T[] | undefined>,
): Promise<SamoPageCollection<T>> => {
    const firstResponse = await fetchPage(0);
    const firstPage = samoItemsOf(firstResponse);
    const total = samoTotalOf(firstResponse);

    // A short first page is the whole list no matter what the envelope claims.
    if (firstPage.length < pageSize) {
        return { items: firstPage, total, truncated: false };
    }

    if (total === undefined) {
        // No total to plan against: walk until a short page or the ceiling.
        const collected = [...firstPage];
        for (let offset = pageSize; offset < hardCeiling; offset += pageSize) {
            const batch = samoItemsOf(await fetchPage(offset));
            collected.push(...batch);
            if (batch.length < pageSize) {
                return { items: collected, total, truncated: false };
            }
        }
        // Ran out of ceiling with every page still full — the list continues.
        return { items: collected, total, truncated: true };
    }

    const reachable = Math.min(total, hardCeiling);
    const remainingOffsets: number[] = [];
    for (let offset = pageSize; offset < reachable; offset += pageSize) {
        remainingOffsets.push(offset);
    }

    // Pages land in the slot matching their offset, so bounded concurrency
    // costs nothing in ordering.
    const pages: T[][] = new Array(remainingOffsets.length);
    let next = 0;
    const worker = async (): Promise<void> => {
        for (;;) {
            const index = next;
            next += 1;
            if (index >= remainingOffsets.length) return;
            pages[index] = samoItemsOf(await fetchPage(remainingOffsets[index]));
        }
    };
    await Promise.all(
        Array.from({ length: Math.min(MAX_CONCURRENT_PAGES, remainingOffsets.length) }, worker),
    );

    const items = pages.reduce<T[]>((collected, batch) => {
        collected.push(...batch);
        return collected;
    }, firstPage);

    return { items, total, truncated: total > hardCeiling };
};
