import { type DownloadEntry } from '../services/download-manager';
import {
    getDownloadedCollectionKey,
    getDownloadedTrackKey,
} from './download-keys';

export type DownloadedCollectionSummary = {
    collection: DownloadEntry['collection'];
    latestCompletedAt: number;
};

export type DownloadedCollectionSnapshot = {
    collections: DownloadedCollectionSummary[];
    keys: Set<string>;
    signature: string;
    trackKeys: Set<string>;
};

export const EMPTY_DOWNLOADED_COLLECTION_SNAPSHOT: DownloadedCollectionSnapshot = {
    collections: [],
    keys: new Set(),
    signature: '',
    trackKeys: new Set(),
};

export const buildDownloadedCollectionSnapshot = (
    entries: DownloadEntry[],
): DownloadedCollectionSnapshot => {
    const keys = new Set<string>();
    const trackKeys = new Set<string>();
    const collections = new Map<string, DownloadedCollectionSummary>();

    for (const entry of entries) {
        if (entry.status !== 'completed') continue;

        const key = getDownloadedCollectionKey(entry.collection.sourceId, entry.collection.id);
        keys.add(key);
        trackKeys.add(getDownloadedTrackKey(entry.collection.sourceId, entry.trackId));
        const existing = collections.get(key);
        const latestCompletedAt = entry.completedAt ?? entry.enqueuedAt;
        if (!existing || latestCompletedAt > existing.latestCompletedAt) {
            collections.set(key, {
                collection: entry.collection,
                latestCompletedAt,
            });
        }
    }

    const summaries = [...collections.values()];
    const collectionSignature = summaries
        .map(
            ({ collection, latestCompletedAt }) =>
                [
                    collection.sourceId,
                    collection.id,
                    collection.type,
                    collection.title,
                    collection.artworkUrl ?? '',
                    latestCompletedAt,
                ].join(':'),
        )
        .sort()
        .join('|');
    const trackSignature = [...trackKeys].sort().join('|');
    const signature = `${collectionSignature}::${trackSignature}`;

    return { collections: summaries, keys, signature, trackKeys };
};
