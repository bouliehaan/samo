import { type MobileHomeItem } from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

import { loadCatalogLibraryRelevantItems } from './catalog/catalog-reads';

export type AndroidLibraryRelevantState =
    | { items: MobileHomeItem[]; loadedAt: number; status: 'loaded' }
    | { message: string; status: 'error' }
    | { status: 'idle' }
    | { status: 'loading' };

/**
 * Library "relevant" pool from the on-device mirror. The old implementation
 * issued ELEVEN network requests (recently added / played / favorites across
 * albums+artists, plus playlists/audiobooks/podcasts/radio) on Library open;
 * every one of those orderings is derivable from mirrored columns now that
 * the server's delta includes playback-overlay changes.
 */
export const loadAndroidLibraryRelevantContent = async (
    authentication: ServerAuthenticationResult | null,
): Promise<AndroidLibraryRelevantState> => {
    if (!authentication) {
        return { status: 'idle' };
    }
    // ALWAYS return 'loaded' on a successful sync read, even if the mirror is
    // empty — empty is a real outcome, not a pending one. The old
    // `items.length === 0 → 'loading'` branch wedged the Library tab on its
    // skeleton-loading grid forever whenever the mirror had no rows: an empty
    // first sync, an offline relaunch on a cold cache, or — the bug we hit
    // here — a fresh install whose post-sync mirror read returned 0 (until
    // the next recycle/sync). The token-based race guard in App.tsx then
    // swallowed every subsequent retry, so the skeleton never lifted.
    const items = loadCatalogLibraryRelevantItems(authentication);
    return { items, loadedAt: Date.now(), status: 'loaded' };
};
