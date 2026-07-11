import { type MobileMediaDetail } from '@samo/core/mobile';

// Shared, app-singleton handler state. These used to be useRefs inside a
// monolithic handlers hook; they are genuinely process-wide (one detail
// surface, one search box, one view-all screen), so module scope is their
// honest home — and it frees every handler from needing a hook.

/** In-memory media detail cache (mirror/network results, keyed by item key). */
export const mediaDetailCache = new Map<string, MobileMediaDetail>();

// Request tokens: a response is applied only if its token is still current,
// so a stale async result can never clobber a newer surface.
export const mediaDetailRequestId = { current: 0 };
export const audiobookStartRequestId = { current: 0 };
export const viewAllFetchToken = { current: 0 };
export const searchRequestId = { current: 0 };
export const bookInfoRequestId = { current: 0 };

/** Invalidate any in-flight detail/audiobook loads (detail closed or replaced). */
export const invalidateMediaDetailRequests = (): void => {
    mediaDetailRequestId.current += 1;
    audiobookStartRequestId.current += 1;
};

/** Invalidate any in-flight View All fetch (screen closed or rerouted). */
export const bumpViewAllFetchToken = (): void => {
    viewAllFetchToken.current += 1;
};

/** Invalidate any in-flight book info load (modal closed). */
export const bumpBookInfoRequestId = (): void => {
    bookInfoRequestId.current += 1;
};
