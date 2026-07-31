export const HOME_ARTWORK_PREFETCH_LIMIT = 48;
export const LIBRARY_FULL_COLLECTION_PREFETCH_DELAY_MS = 500;
export const MEDIA_DETAIL_MEMORY_CACHE_LIMIT = 24;
export const MEDIA_DETAIL_MEMORY_TRACK_LIMIT = 300;
/**
 * Heap budget for the hydrated-detail LRU. This is the bound that matters —
 * MEDIA_DETAIL_MEMORY_CACHE_LIMIT is only a backstop, since detail sizes span
 * three orders of magnitude and 24 large ones is hundreds of MB.
 */
export const MEDIA_DETAIL_MEMORY_BYTE_LIMIT = 32 * 1024 * 1024;
export const DEFAULT_SERVER_URL = 'http://';
