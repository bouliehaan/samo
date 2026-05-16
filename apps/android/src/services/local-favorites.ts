import { fsDeleteItem, fsGetItem, fsSetItem } from './fs-storage';

const FAVORITES_KEY = 'samo.android.local-favorites.v1';

export interface AndroidLocalFavoriteItem {
    artworkUrl?: string;
    favoritedAt: number;
    key: string;
    sourceId?: string;
    subtitle?: string;
    title: string;
    type: string;
}

export const getLocalFavoriteKey = (item: {
    id: string;
    source?: { id: string };
    type: string;
}) => `${item.source?.id ?? 'server'}:${item.type}:${item.id}`;

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const isPersistedFavorite = (value: unknown): value is AndroidLocalFavoriteItem => {
    if (!isRecord(value)) {
        return false;
    }

    return (
        typeof value.favoritedAt === 'number' &&
        typeof value.key === 'string' &&
        typeof value.title === 'string' &&
        typeof value.type === 'string'
    );
};

export const loadLocalFavorites = async (): Promise<AndroidLocalFavoriteItem[]> => {
    const raw = await fsGetItem(FAVORITES_KEY);

    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw) as unknown;

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(isPersistedFavorite);
    } catch {
        return [];
    }
};

export const saveLocalFavorites = async (favorites: AndroidLocalFavoriteItem[]) => {
    if (favorites.length === 0) {
        await fsDeleteItem(FAVORITES_KEY);
        return;
    }

    await fsSetItem(FAVORITES_KEY, JSON.stringify(favorites));
};

export const toggleLocalFavorite = (
    favorites: AndroidLocalFavoriteItem[],
    item: {
        artworkUrl?: string;
        id: string;
        source?: { id: string };
        subtitle?: string;
        title: string;
        type: string;
    },
): { favorites: AndroidLocalFavoriteItem[]; isFavorited: boolean } => {
    const key = getLocalFavoriteKey(item);
    const existing = favorites.find((favorite) => favorite.key === key);

    if (existing) {
        return {
            favorites: favorites.filter((favorite) => favorite.key !== key),
            isFavorited: false,
        };
    }

    const nextFavorite: AndroidLocalFavoriteItem = {
        artworkUrl: item.artworkUrl,
        favoritedAt: Date.now(),
        key,
        sourceId: item.source?.id,
        subtitle: item.subtitle,
        title: item.title,
        type: item.type,
    };

    return {
        favorites: [nextFavorite, ...favorites],
        isFavorited: true,
    };
};
