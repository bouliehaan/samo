import { type MobileMediaDetail } from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import { mediaDetailCache } from '../handlers/handler-state';
import {
    forgetAllMediaDetails,
    forgetOneMediaDetail,
} from '../utils/media-detail-cache';
import { isOfflineNow } from '../state/network-state';
import { loadCatalogMediaDetail } from './catalog/catalog-reads';
import { type AndroidRecentContentSourceItem } from './recent-content';

/**
 * Which cached details are known to be behind the server.
 *
 * A detail is read through three layers — the in-memory LRU, the on-device
 * SQLite mirror, then the network — and a mirror or memory hit ENDS the read.
 * That is the right design for a mirrored library, but it left every write
 * without a way to say "the copy you are holding is no longer the truth", so
 * an edit stayed invisible until the process died and took the LRU with it.
 *
 * This set is that missing signal, and the two layers answer it differently
 * because they are stale in different ways:
 *
 *  - The MIRROR is skipped outright. It only converges when the Kotlin sync
 *    next runs, so between an edit and that run it holds precisely the
 *    pre-edit list we are trying to get away from — reading it is strictly
 *    worse than not reading it.
 *  - The LRU is KEPT and treated as provisional. A write that can predict its
 *    own outcome splices the change into it, which makes it the most current
 *    copy on the device; it just isn't confirmed. So it still paints the first
 *    frame, and a network revalidation replaces it a moment later.
 *
 * Keys are item identity keys (`source:type:id`) — the same string the LRU is
 * keyed by, built by `getRecentContentItemKey`.
 *
 * A key is cleared by a CONFIRMED read of that item, and by nothing else.
 * Notably NOT by a sync completing, which looks like it should qualify and
 * does not: a run that started before the edge of an edit finishes after it
 * without having seen it (its window was fetched at run start), so treating
 * "a sync finished" as "your edit is in the mirror" would hand back exactly
 * the pre-edit list this flag exists to refuse. Edits made on ANOTHER device
 * are handled the other way round — see `dropCachedMediaDetailsAfterSync`.
 */
const staleMediaDetailKeys = new Set<string>();

/**
 * Cap on outstanding unconfirmed edits.
 *
 * A key is normally cleared the first time its item is opened, so the set is
 * a handful of entries at most. The exception is an item edited and then never
 * looked at again, whose key would otherwise sit here for the life of the
 * process. Dropping the oldest at the cap costs that item nothing worse than a
 * mirror read — and by the time 64 further edits have happened, the sync has
 * long since carried the first one.
 */
const MAX_STALE_KEYS = 64;

export const markMediaDetailStale = (cacheKey: string): void => {
    // Re-insert so the key moves to the most-recent end of the iteration order.
    staleMediaDetailKeys.delete(cacheKey);
    staleMediaDetailKeys.add(cacheKey);
    while (staleMediaDetailKeys.size > MAX_STALE_KEYS) {
        const oldest = staleMediaDetailKeys.values().next().value;
        if (oldest === undefined) break;
        staleMediaDetailKeys.delete(oldest);
    }
};

export const isMediaDetailStale = (cacheKey: string): boolean =>
    staleMediaDetailKeys.has(cacheKey);

/** One detail has been re-read from the server; the local copies agree again. */
export const clearMediaDetailStaleness = (cacheKey: string): void => {
    staleMediaDetailKeys.delete(cacheKey);
};

/** This detail is gone from the server — forget it rather than re-read it. */
export const forgetMediaDetail = (cacheKey: string): void => {
    staleMediaDetailKeys.delete(cacheKey);
    forgetOneMediaDetail(mediaDetailCache, cacheKey);
};

/**
 * A catalog sync has finished: drop every cached detail so the next open is
 * served from the freshly-written mirror.
 *
 * This is what makes an edit performed on ANOTHER device visible here. No
 * local write can mark those keys stale — this phone never saw the edit — so
 * the only honest position after a sync is that any copy predating it is
 * suspect. Cheap to act on: the LRU is small and bounded, and refilling an
 * entry is one mirror read on the native reader thread, not a network hop.
 *
 * The staleness set is deliberately left alone; see above for why a completed
 * run is not proof that a local edit reached the mirror.
 */
export const dropCachedMediaDetailsAfterSync = (): void => {
    forgetAllMediaDetails(mediaDetailCache);
};

/**
 * The mirror read, refused for an item with an unconfirmed edit outstanding.
 *
 * Every local detail read in the app goes through here rather than calling
 * `loadCatalogMediaDetail` directly, so the skip cannot be true on the detail
 * page and false on the path that builds a queue or starts a download from the
 * same playlist — which is how the stale list ended up being what got PLAYED
 * and what got DOWNLOADED, not just what got rendered.
 *
 * Offline, the refusal is lifted. Skipping the mirror is only ever worth doing
 * because there is a better answer one network hop away; with no network there
 * is no better answer, and refusing anyway would turn "your playlist is a few
 * minutes out of date" into "not available offline" — trading a small
 * inaccuracy for a broken app, on the one code path where the mirror is the
 * entire reason this app works at all without a connection.
 */
export const loadMirrorMediaDetailIfFresh = async (
    item: AndroidRecentContentSourceItem,
    serverConnection: ServerAuthenticationResult | null,
    cacheKey: string,
): Promise<MobileMediaDetail | null> => {
    if (staleMediaDetailKeys.has(cacheKey) && !isOfflineNow()) {
        return null;
    }
    return loadCatalogMediaDetail(item, serverConnection);
};
