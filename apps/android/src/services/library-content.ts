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
    authentications: ServerAuthenticationResult[],
): Promise<AndroidLibraryRelevantState> => {
    if (authentications.length === 0) {
        return { status: 'idle' };
    }
    const items = loadCatalogLibraryRelevantItems(authentications);
    return items.length > 0
        ? { items, loadedAt: Date.now(), status: 'loaded' }
        : { status: 'loading' };
};
