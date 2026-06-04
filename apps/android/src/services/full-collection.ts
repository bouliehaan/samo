import {
    getMobileHomeContentErrorMessage,
    loadMobileFullCollection,
    MobileHomeItemType,
    type MobileFullCollectionVariant,
    type MobileHomeItem,
} from '@samo/core/mobile';
import { ensureSamoStreamToken, ServerType, type ServerAuthenticationResult } from '@samo/core/server';

import { loadCatalogCollection, loadCatalogCollectionSync } from './catalog/catalog-reads';

export type AndroidFullCollectionState =
    | { items: MobileHomeItem[]; status: 'loaded' }
    | { message: string; status: 'error' }
    | { status: 'idle' }
    | { status: 'loading' };

const ANDROID_FULL_COLLECTION_QUALITY_SCAN_LIMIT = 0;

const HOME_TYPE_BY_VARIANT: Record<MobileFullCollectionVariant, MobileHomeItemType> = {
    album: MobileHomeItemType.ALBUM,
    artist: MobileHomeItemType.ARTIST,
    audiobook: MobileHomeItemType.AUDIOBOOK,
    playlist: MobileHomeItemType.PLAYLIST,
    podcast: MobileHomeItemType.PODCAST,
};

/**
 * Instant View-All items from the on-device catalog for Samo sources. Returns
 * null when no connected Samo source has local rows yet (cold cache / non-Samo
 * only), so the caller falls back to the network path. Non-Samo servers are
 * skipped here and picked up by the network refresh.
 */
export const loadAndroidFullCollectionLocal = async (
    authentications: ServerAuthenticationResult[],
    variant: MobileFullCollectionVariant,
): Promise<MobileHomeItem[] | null> => {
    const type = HOME_TYPE_BY_VARIANT[variant];
    const lists = await Promise.all(
        authentications.map((authentication) => loadCatalogCollection(authentication, type)),
    );
    const items = lists.flatMap((list) => list ?? []);
    return items.length > 0 ? items : null;
};

// Bounded so the synchronous first-paint read stays a sub-frame operation even
// for huge libraries; the async `loadAndroidFullCollectionLocal` then fills the
// complete list (off the UI thread) and the network refresh follows.
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
 * so the screen mounts with content on the first frame (no loading state). Capped
 * to keep the on-thread read fast; the full list arrives right after via the
 * async path. Empty array for non-Samo / cold reader.
 */
export const loadAndroidFullCollectionLocalSync = (
    authentications: ServerAuthenticationResult[],
    variant: MobileFullCollectionVariant,
): MobileHomeItem[] => {
    const type = HOME_TYPE_BY_VARIANT[variant];
    return authentications.flatMap((authentication) =>
        loadCatalogCollectionSync(authentication, type, { limit: SYNC_FIRST_PAINT_LIMIT }),
    );
};

/**
 * Pull the COMPLETE list of items for a View All grid across every connected
 * server. Wraps the core loader with the same error-to-message normalization
 * the home-content loader uses, so all UI surfaces handle failures the same
 * way. Individual-server failures from the core layer are collapsed into a
 * single status: the caller still gets every server's items that DID load.
 */
export const loadAndroidFullCollection = async (
    authentications: ServerAuthenticationResult[],
    variant: MobileFullCollectionVariant,
): Promise<AndroidFullCollectionState> => {
    if (authentications.length === 0) {
        return { status: 'idle' };
    }

    try {
        await Promise.all(
            authentications
                .filter((authentication) => authentication.type === ServerType.SAMO)
                .map((authentication) =>
                    ensureSamoStreamToken(authentication).catch(() => undefined),
                ),
        );

        const { errors, items } = await loadMobileFullCollection({
            authentications,
            qualityScanLimit: ANDROID_FULL_COLLECTION_QUALITY_SCAN_LIMIT,
            variant,
        });
        if (items.length === 0 && errors.length > 0) {
            return { message: errors[0], status: 'error' };
        }
        return { items, status: 'loaded' };
    } catch (error) {
        return {
            message: getMobileHomeContentErrorMessage(error),
            status: 'error',
        };
    }
};
