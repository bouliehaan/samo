import { MobileHomeItemType, type MobileContentSource, type MobileMediaTrack } from '@samo/core/mobile';
import {
    findServerAuthenticationForSource,
    type ServerAuthenticationResult,
} from '@samo/core/server';

import {
    getLocalFavoriteKey,
    saveLocalFavorites,
    toggleLocalFavorite,
} from '../services/local-favorites';
import { setSamoMusicFavorite } from '../services/media-favorites';
import {
    type AndroidRecentContentSourceItem,
    getRecentContentItemKey,
} from '../services/recent-content';
import {
    getAppSession,
    setFavoritedKeys,
    setLocalFavorites,
} from '../state/app-session';
import { getAuthSession } from '../state/auth-session';
import { setContextMenuFeedback } from '../state/media-overlays';

export const getFavoriteKeyForItem = (item: AndroidRecentContentSourceItem): string =>
    getRecentContentItemKey(item);

export const getFavoriteKeyForTrack = (
    track: MobileMediaTrack,
    sourceId: string | undefined,
): string => `${sourceId ?? 'server'}:song:${track.id}`;

export const findAuthForSource = (
    sourceId: string | undefined,
    source?: MobileContentSource,
): ServerAuthenticationResult | undefined =>
    findServerAuthenticationForSource(getAuthSession().serverConnection, {
        id: sourceId ?? source?.id,
        type: source?.type,
        url: source?.url,
    });

const upsertFavoriteKey = (key: string, add: boolean): void => {
    setFavoritedKeys((current) => {
        const next = new Set(current);
        if (add) {
            next.add(key);
        } else {
            next.delete(key);
        }
        return next;
    });
};

const persistLocalFavoriteToggle = async (item: {
    artworkUrl?: string;
    id: string;
    source?: { id: string };
    subtitle?: string;
    title: string;
    type: string;
}): Promise<boolean> => {
    // Module-store dispatch is synchronous, so the toggle result is readable
    // immediately after the setter runs.
    const result = toggleLocalFavorite(getAppSession().localFavorites, item);
    setLocalFavorites(result.favorites);
    upsertFavoriteKey(getLocalFavoriteKey(item), result.isFavorited);
    await saveLocalFavorites(result.favorites);
    return result.isFavorited;
};

export const handleToggleFavoriteForTrack = async (
    track: MobileMediaTrack,
    sourceId: string | undefined,
): Promise<void> => {
    const key = getFavoriteKeyForTrack(track, sourceId);
    const auth = findAuthForSource(sourceId);

    if (!auth) {
        setContextMenuFeedback('Server for this track is no longer connected.');
        return;
    }

    const isFavoritedNow = getAppSession().favoritedKeys.has(key);
    const next = !isFavoritedNow;

    // Optimistic: fill the heart and show the toast the instant the user
    // taps, then reconcile with the server in the background. A heart that
    // waits for a network round-trip to fill reads as sluggish; only a
    // failure rolls the state back (and surfaces why).
    upsertFavoriteKey(key, next);
    setContextMenuFeedback(next ? 'Added to Favorites' : 'Removed from Favorites');

    try {
        await setSamoMusicFavorite(auth, 'music-track', track.id, next);
    } catch (error) {
        upsertFavoriteKey(key, isFavoritedNow);
        setContextMenuFeedback(error instanceof Error ? error.message : 'Favorite failed');
    }
};

export const handleToggleFavoriteForItem = async (
    item: AndroidRecentContentSourceItem,
): Promise<void> => {
    const key = getFavoriteKeyForItem(item);
    const isFavoritedNow = getAppSession().favoritedKeys.has(key);
    const auth = findAuthForSource(item.source?.id);
    const useSamoFavorite =
        auth &&
        (item.type === MobileHomeItemType.ALBUM || item.type === MobileHomeItemType.ARTIST);

    try {
        if (useSamoFavorite && auth) {
            const kind = item.type === MobileHomeItemType.ALBUM ? 'music-album' : 'music-artist';
            const next = !isFavoritedNow;
            // Optimistic flip + toast; reconcile with the server after and
            // roll back only on failure (see handleToggleFavoriteForTrack).
            upsertFavoriteKey(key, next);
            setContextMenuFeedback(next ? 'Added to Favorites' : 'Removed from Favorites');
            try {
                await setSamoMusicFavorite(auth, kind, item.id, next);
            } catch (error) {
                upsertFavoriteKey(key, isFavoritedNow);
                setContextMenuFeedback(
                    error instanceof Error ? error.message : 'Favorite failed',
                );
            }
            return;
        }

        const wasFavorited = await persistLocalFavoriteToggle(item);
        setContextMenuFeedback(wasFavorited ? 'Added to Favorites' : 'Removed from Favorites');
    } catch (error) {
        setContextMenuFeedback(error instanceof Error ? error.message : 'Favorite failed');
    }
};
