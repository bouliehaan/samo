import { type MobileHomeItem, type MobileSearchItem } from '@samo/core/mobile';

import { fsDeleteItem, fsGetItem, fsSetItem } from './fs-storage';

const RECENT_CONTENT_KEY = 'samo.android.recent-content.v1';
const MAX_RECENT_CONTENT_ITEMS = 80;

export type AndroidRecentContentSourceItem = MobileHomeItem | MobileSearchItem;

export interface AndroidRecentContentItem {
    item: AndroidRecentContentSourceItem;
    key: string;
    selectedAt: number;
}

export const getRecentContentItemKey = (item: {
    id: string;
    source?: { id: string };
    type: string;
}) => `${item.source?.id ?? 'server'}:${item.type}:${item.id}`;

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

export const loadPersistedRecentContentItems = async (): Promise<AndroidRecentContentItem[]> => {
    const raw = await fsGetItem(RECENT_CONTENT_KEY);

    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw) as unknown;

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.filter(isPersistedRecentContentItem).slice(0, MAX_RECENT_CONTENT_ITEMS);
    } catch {
        return [];
    }
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
) => {
    const key = getRecentContentItemKey(item);
    const nextItem: AndroidRecentContentItem = {
        item,
        key,
        selectedAt: Date.now(),
    };

    return [nextItem, ...items.filter((candidate) => candidate.key !== key)].slice(
        0,
        MAX_RECENT_CONTENT_ITEMS,
    );
};
