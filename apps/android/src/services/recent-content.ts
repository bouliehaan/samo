import {
    type MobileHomeItem,
    MobileHomeItemType,
    type MobileMediaDetail,
    MobileMediaDetailType,
    type MobileSearchItem,
    MobileSearchItemType,
} from '@samo/core/mobile';

import { fsDeleteItem, fsGetItem, fsSetItem } from './fs-storage';
import { safeParseJson } from '../utils/json';

// v2 invalidates stale persisted playback payloads from older builds.
const RECENT_CONTENT_KEY = 'samo.android.recent-content.v2';
export const MAX_RECENT_CONTENT_ITEMS = 80;

export type AndroidRecentContentSourceItem = MobileHomeItem | MobileSearchItem;

export interface AndroidRecentContentItem {
    /** When true, a search/direct song play is allowed in the Recently Played strip. */
    directSong?: boolean;
    item: AndroidRecentContentSourceItem;
    key: string;
    selectedAt: number;
}

export type RecentContentRecordOptions = {
    /** Include a song row (e.g. played from search), not queue filler tracks. */
    directSong?: boolean;
};

export const getRecentContentItemKey = (item: {
    id: string;
    source?: { id: string };
    type: string;
}) => `${item.source?.id ?? 'server'}:${item.type}:${item.id}`;

/** Artist pages share playback timestamps with albums/tracks — omit from recents. */
export const isArtistRecentContentItem = (item: { type: string }) =>
    item.type === MobileHomeItemType.ARTIST || item.type === MobileSearchItemType.ARTIST;

export const isSongRecentContentItem = (item: { type: string }) =>
    item.type === 'song' || item.type === MobileSearchItemType.SONG;

/** What belongs in the Home "Recently Played" strip (not every scrobbled track). */
export const isEligibleRecentlyPlayedSurfaceItem = (
    item: { type: string },
    options?: RecentContentRecordOptions,
): boolean => {
    if (isArtistRecentContentItem(item)) {
        return false;
    }

    if (isSongRecentContentItem(item)) {
        return Boolean(options?.directSong);
    }

    switch (item.type) {
        case MobileHomeItemType.ALBUM:
        case MobileHomeItemType.PLAYLIST:
        case MobileHomeItemType.PODCAST:
        case MobileHomeItemType.PODCAST_EPISODE:
        case MobileHomeItemType.AUDIOBOOK:
        case MobileHomeItemType.RADIO:
        case MobileSearchItemType.ALBUM:
        case MobileSearchItemType.PLAYLIST:
        case MobileSearchItemType.PODCAST:
        case MobileSearchItemType.AUDIOBOOK:
        case MobileSearchItemType.RADIO:
            return true;
        default:
            return false;
    }
};

export const recentContentItemFromMediaDetail = (
    detail: MobileMediaDetail,
): AndroidRecentContentSourceItem | null => {
    const base = {
        artworkImageId: detail.artworkImageId,
        artworkUrl: detail.artworkUrl,
        id: detail.id,
        source: detail.source,
        subtitle: detail.subtitle,
        title: detail.title,
    };

    switch (detail.type) {
        case MobileMediaDetailType.ALBUM:
            return { ...base, type: MobileHomeItemType.ALBUM };
        case MobileMediaDetailType.PLAYLIST:
            return { ...base, type: MobileHomeItemType.PLAYLIST };
        case MobileMediaDetailType.PODCAST:
            return { ...base, type: MobileHomeItemType.PODCAST };
        case MobileMediaDetailType.AUDIOBOOK:
            return { ...base, type: MobileHomeItemType.AUDIOBOOK };
        default:
            return null;
    }
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === 'object' && value !== null;
};

const isPersistedRecentContentItem = (value: unknown): value is AndroidRecentContentItem => {
    if (!isRecord(value) || !isRecord(value.item)) {
        return false;
    }

    return (
        typeof value.key === 'string' &&
        typeof value.selectedAt === 'number' &&
        typeof value.item.id === 'string' &&
        typeof value.item.title === 'string' &&
        typeof value.item.type === 'string'
    );
};

const isPersistedRecentEntryVisible = (entry: AndroidRecentContentItem) =>
    isEligibleRecentlyPlayedSurfaceItem(entry.item, { directSong: entry.directSong });

export const loadPersistedRecentContentItems = async (): Promise<AndroidRecentContentItem[]> => {
    const raw = await fsGetItem(RECENT_CONTENT_KEY);

    if (!raw) {
        return [];
    }

    const parsed = safeParseJson<unknown>(raw);

    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed
        .filter(isPersistedRecentContentItem)
        .filter(isPersistedRecentEntryVisible)
        .slice(0, MAX_RECENT_CONTENT_ITEMS);
};

export const savePersistedRecentContentItems = async (items: AndroidRecentContentItem[]) => {
    if (items.length === 0) {
        await fsDeleteItem(RECENT_CONTENT_KEY);
        return;
    }

    await fsSetItem(
        RECENT_CONTENT_KEY,
        JSON.stringify(items.slice(0, MAX_RECENT_CONTENT_ITEMS)),
    );
};

export const upsertRecentContentItem = (
    items: AndroidRecentContentItem[],
    item: AndroidRecentContentSourceItem,
    selectedAt: number = Date.now(),
    options?: RecentContentRecordOptions,
) => {
    if (!isEligibleRecentlyPlayedSurfaceItem(item, options)) {
        return items;
    }

    const key = getRecentContentItemKey(item);
    const nextItem: AndroidRecentContentItem = {
        directSong: options?.directSong,
        item,
        key,
        selectedAt,
    };

    const withoutSameKey = items.filter((candidate) => candidate.key !== key);
    return [nextItem, ...withoutSameKey].slice(0, MAX_RECENT_CONTENT_ITEMS);
};

export const upsertRecentContentItemWithTimestamp = (
    items: AndroidRecentContentItem[],
    item: AndroidRecentContentSourceItem,
    selectedAt: number,
    options?: RecentContentRecordOptions,
) => upsertRecentContentItem(items, item, selectedAt, options);
