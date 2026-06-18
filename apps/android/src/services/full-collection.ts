import {
    MobileHomeItemType,
    type MobileFullCollectionVariant,
    type MobileHomeItem,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import { loadCatalogCollection, loadCatalogCollectionSync } from './catalog/catalog-reads';

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
    const items = await loadCatalogCollection(authentication, type);
    return items && items.length > 0 ? items : null;
};

// Bounded so the synchronous first-paint read stays a sub-frame operation even
// for huge libraries; the async `loadAndroidFullCollectionLocal` then fills the
// complete list off the UI thread.
//
// NOTE: tried reducing this to 100 to cut on-nav sync work — it made first
// Library open WORSE (showed a loading state / cold-start delay) because the
// large seed was actually masking a one-time cold cost by painting most of the
// library instantly. Reverted. The real first-open lag is a cold-start cost
// (lazy SQLite reader open + first query + mount), not the seed size — needs
// on-device profiling, not blind tuning.
const SYNC_FIRST_PAINT_LIMIT = 800;

/**
 * Synchronous first-paint slice of a View-All / Library grid from the catalog,
 * so the screen mounts with content on the first frame (no loading state).
 */
export const loadAndroidFullCollectionLocalSync = (
    authentication: ServerAuthenticationResult | null,
    variant: MobileFullCollectionVariant | 'podcast-feed',
): MobileHomeItem[] => {
    if (!authentication) return [];
    const type = HOME_TYPE_BY_VARIANT[variant];
    return loadCatalogCollectionSync(authentication, type, { limit: SYNC_FIRST_PAINT_LIMIT });
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
