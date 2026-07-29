import { getMobileContentSource, MobileHomeItemType } from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import { resolveSamoItemArtworkSourceForDisplay } from '../utils/samo-artwork-url';
import {
    prefetchArtworkUrls,
    type ArtworkPrefetchEntry,
} from './artwork-cache';
import { getItemsByType } from './catalog/catalog-repository';
import { isOfflineNow } from '../state/network-state';

/**
 * Proactively caches the WHOLE library's cover art after a sync, so browsing
 * reads local files (the display path never fetches per tile). One image per
 * album / artist / playlist / podcast-show / audiobook — the catalog only stores
 * container items (not tracks/episodes), so this is naturally deduplicated; we
 * also de-dupe by resolved URL. Bounded concurrency + the GB cap live in
 * {@link prefetchArtworkUrls}. Fire-and-forget; safe to call after every sync.
 */

const ART_BEARING_TYPES: MobileHomeItemType[] = [
    MobileHomeItemType.ALBUM,
    MobileHomeItemType.ARTIST,
    MobileHomeItemType.PLAYLIST,
    MobileHomeItemType.PODCAST,
    MobileHomeItemType.AUDIOBOOK,
];

let inFlight: Promise<void> | null = null;
let inFlightKey = '';
let cancelled = false;
let nextRunId = 0;
let activeRunId = 0;

// Yield to the event loop every N resolutions so the URL-building loop over a
// large library can't monopolize the JS thread between awaits.
const RESOLVE_YIELD_EVERY = 250;
const yieldToEventLoop = (): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, 0));

const collectArtwork = async (
    connection: ServerAuthenticationResult | null,
): Promise<ArtworkPrefetchEntry[]> => {
    if (!connection) {
        return [];
    }

    // No stream-token mint here any more. The resolved entries carry an
    // Authorization header and `downloadAsync` sends it, which is all the
    // server's `requireUser` needs — so a warm that used to be gated behind a
    // network round-trip (and silently produced token-less URLs whenever that
    // round-trip failed) now just starts.

    const entries: ArtworkPrefetchEntry[] = [];
    const seen = new Set<string>();
    let resolved = 0;
    const sourceId = getMobileContentSource(connection).id;
    for (const type of ART_BEARING_TYPES) {
        const items = await getItemsByType(sourceId, type);
        for (const item of items) {
            resolved += 1;
            if (resolved % RESOLVE_YIELD_EVERY === 0) {
                await yieldToEventLoop();
            }
            const source = resolveSamoItemArtworkSourceForDisplay(
                {
                    artworkImageId: item.artworkImageId,
                    artworkUrl: item.artworkUrl,
                    source: item.source,
                },
                connection,
            );
            const uri = typeof source === 'string' ? source : source?.uri;
            if (!uri || seen.has(uri)) {
                continue;
            }
            seen.add(uri);
            entries.push({
                headers: typeof source === 'string' ? undefined : source?.headers,
                uri,
            });
        }
    }
    return entries;
};

/**
 * Cancel any warm in progress.
 *
 * A full-library warm walks thousands of covers at concurrency 4 and can run
 * for minutes. Without a way to stop it, a disconnect kept downloading art for
 * a server the user just left, an offline-mode toggle kept using the network,
 * and a connection change raced the new server's warm against the old one's.
 * `prefetchArtworkUrls` has always accepted a cancellation predicate — nothing
 * ever passed one.
 */
export const cancelCatalogArtworkPrefetch = (): void => {
    cancelled = true;
};

export const prefetchCatalogArtwork = (
    connection: ServerAuthenticationResult | null,
): Promise<void> => {
    // The single choke point for "is this warm allowed to touch the network".
    // Guarding it here rather than at each call site is deliberate: a warm is
    // the most expensive network thing the app does, and it is kicked from
    // several places (post-sync, connect, foreground) that would each have to
    // remember.
    if (isOfflineNow()) {
        return Promise.resolve();
    }
    // The latch has to be keyed by CONNECTION, not just "something is running".
    // A bare boolean handed a caller for server B the promise of a warm that was
    // walking server A's library, so the second server's art silently never
    // warmed and the caller was told it had.
    const connectionKey = connection ? `${connection.type}:${connection.url}` : '';
    if (inFlight && inFlightKey === connectionKey) {
        return inFlight;
    }
    if (inFlight) {
        // A different connection: stop the old walk rather than interleaving two.
        cancelCatalogArtworkPrefetch();
    }

    // Identifies THIS run, so its own teardown cannot clear a newer run's latch
    // (the old walk finishes observing its cancellation after the new one has
    // already been installed).
    const runId = nextRunId += 1;
    const previous = inFlight;

    const run = (async (): Promise<void> => {
        // Let a previous run observe its cancellation before starting, so the
        // two never share the download queue.
        if (previous) {
            await previous.catch(() => undefined);
        }
        if (activeRunId !== runId) {
            return;
        }
        cancelled = false;
        try {
            const entries = await collectArtwork(connection);
            if (entries.length > 0 && !cancelled) {
                await prefetchArtworkUrls(entries, { isCancelled: () => cancelled });
            }
        } catch {
            // Best-effort warming; never block on it.
        } finally {
            if (activeRunId === runId) {
                inFlight = null;
                inFlightKey = '';
            }
        }
    })();

    activeRunId = runId;
    inFlight = run;
    inFlightKey = connectionKey;
    return run;
};
