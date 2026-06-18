import { getMobileContentSource, MobileHomeItemType } from '@samo/core/mobile';
import {
    ensureSamoStreamToken,
    ServerType,
    type ServerAuthenticationResult,
} from '@samo/core/server';

import { resolveSamoItemArtworkSourceForDisplay } from '../utils/samo-artwork-url';
import {
    prefetchArtworkUrls,
    type ArtworkPrefetchEntry,
} from './artwork-cache';
import { getItemsByType } from './catalog/catalog-repository';

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

// Yield to the event loop every N resolutions so the (synchronous) URL-building
// loop over a large library can't block the UI thread.
const RESOLVE_YIELD_EVERY = 250;
const yieldToEventLoop = (): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, 0));

const collectArtwork = async (
    connection: ServerAuthenticationResult | null,
): Promise<ArtworkPrefetchEntry[]> => {
    if (!connection || connection.type !== ServerType.SAMO) {
        return [];
    }

    // Make sure each source has a stream token so the resolved URLs carry the
    // auth header the download needs.
    await ensureSamoStreamToken(connection).catch(() => undefined);

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

export const prefetchCatalogArtwork = (
    connection: ServerAuthenticationResult | null,
): Promise<void> => {
    if (inFlight) {
        return inFlight;
    }
    inFlight = (async () => {
        try {
            const entries = await collectArtwork(connection);
            if (entries.length > 0) {
                await prefetchArtworkUrls(entries);
            }
        } catch {
            // Best-effort warming; never block on it.
        } finally {
            inFlight = null;
        }
    })();
    return inFlight;
};
