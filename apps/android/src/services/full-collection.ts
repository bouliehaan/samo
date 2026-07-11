import {
    MobileHomeItemType,
    type MobileFullCollectionVariant,
    type MobileHomeItem,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import { loadCatalogCollection } from './catalog/catalog-reads';

export type AndroidFullCollectionState =
    | { items: MobileHomeItem[]; status: 'loaded' }
    | { message: string; status: 'error' }
    | { status: 'idle' }
    | { status: 'loading' };

const HOME_TYPE_BY_VARIANT: Record<MobileFullCollectionVariant | 'podcast-feed', MobileHomeItemType> = {
    album: MobileHomeItemType.ALBUM,
    artist: MobileHomeItemType.ARTIST,
    audiobook: MobileHomeItemType.AUDIOBOOK,
    playlist: MobileHomeItemType.PLAYLIST,
    podcast: MobileHomeItemType.PODCAST,
    'podcast-feed': MobileHomeItemType.PODCAST_EPISODE,
};

/**
 * Complete View-All / Library items straight from the on-device mirror — the
 * source of truth for browse surfaces. There is deliberately NO network path
 * here anymore: the old loader re-enumerated the entire library from the
 * server on every Library open (duplicating the sync engine's job on the
 * interactive path); freshness is now the Kotlin sync's responsibility, and
 * screens re-derive when it reports completion.
 */
export const loadAndroidFullCollectionLocal = async (
    authentication: ServerAuthenticationResult | null,
    variant: MobileFullCollectionVariant | 'podcast-feed',
): Promise<MobileHomeItem[] | null> => {
    if (!authentication) return null;
    const type = HOME_TYPE_BY_VARIANT[variant];
    // Paged, with a yield between pages. The single unbounded read parsed
    // EVERY row payload of the type in one JS-thread burst (hundreds of ms on
    // a big library) right as the View All navigation was animating — the
    // sync 800-item seed painted instantly and then the whole app hitched.
    // Chunking bounds each burst; the assembled list still swaps in whole.
    const PAGE_SIZE = 500;
    const items: MobileHomeItem[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
        const page = await loadCatalogCollection(authentication, type, {
            limit: PAGE_SIZE,
            offset,
        });
        if (!page || page.length === 0) {
            break;
        }
        items.push(...page);
        if (page.length < PAGE_SIZE) {
            break;
        }
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
    return items.length > 0 ? items : null;
};

// Bounded first-paint slice: one capped read that resolves in a single native
// round-trip, so the grid mounts with content almost immediately while
// `loadAndroidFullCollectionLocal` pages in the complete list behind it. The
// cap keeps the payload marshalled over the bridge small; the earlier
// JS-thread-blocking synchronous read this replaced is gone entirely.
const FIRST_PAINT_LIMIT = 800;

/**
 * Fast first-paint slice of a View-All / Library grid from the catalog. Reads
 * off the JS thread (native reader thread), so it never blocks a navigation
 * frame the way the old synchronous read did.
 */
export const loadAndroidFullCollectionLocalFirstPage = async (
    authentication: ServerAuthenticationResult | null,
    variant: MobileFullCollectionVariant | 'podcast-feed',
): Promise<MobileHomeItem[]> => {
    if (!authentication) return [];
    const type = HOME_TYPE_BY_VARIANT[variant];
    return (await loadCatalogCollection(authentication, type, { limit: FIRST_PAINT_LIMIT })) ?? [];
};

/** Full collection state from the mirror. `loading` means the mirror has no
 *  rows for the type yet (fresh install mid-first-sync) — the sync-completed
 *  event re-derives and fills it in. */
export const loadAndroidFullCollection = async (
    authentication: ServerAuthenticationResult | null,
    variant: MobileFullCollectionVariant,
): Promise<AndroidFullCollectionState> => {
    if (!authentication) {
        return { status: 'idle' };
    }
    const items = await loadAndroidFullCollectionLocal(authentication, variant);
    return items ? { items, status: 'loaded' } : { status: 'loading' };
};
