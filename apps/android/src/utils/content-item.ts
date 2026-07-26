import { type MobileQualityProfile } from '@samo/core/mobile';

import { type AndroidRecentContentSourceItem } from '../services/recent-content';

/**
 * `source:type:id` per item object, built once.
 *
 * This key is the app's item identity — every dedupe, every reconcile pass,
 * every list `keyExtractor` asks for it, so Home alone builds it thousands of
 * times per derive. Memoizing on the item object turns all of that into a
 * lookup. Safe because these are immutable payload objects: nothing mutates an
 * item's `id`/`type`/`source` in place (updates spread into a new object,
 * which gets its own entry), and the entry dies with the item.
 */
const contentItemKeys = new WeakMap<object, string>();

export const getContentItemKey = (item: {
    id: string;
    source?: { id: string };
    type: string;
}) => {
    const cached = contentItemKeys.get(item);
    if (cached !== undefined) {
        return cached;
    }
    const key = `${item.source?.id ?? 'server'}:${item.type}:${item.id}`;
    contentItemKeys.set(item, key);
    return key;
};

const pickRicherQualityProfile = (
    current: MobileQualityProfile | undefined,
    incoming: MobileQualityProfile | undefined,
) => {
    if (!current) return incoming;
    if (!incoming) return current;
    if (
        incoming.bitDepth > current.bitDepth ||
        (incoming.bitDepth === current.bitDepth && incoming.sampleRate > current.sampleRate)
    ) {
        return incoming;
    }
    return current;
};

export const mergeContentItemSignals = (
    current: AndroidRecentContentSourceItem,
    incoming: AndroidRecentContentSourceItem,
): AndroidRecentContentSourceItem => {
    const qualityProfile = pickRicherQualityProfile(current.qualityProfile, incoming.qualityProfile);

    return {
        ...current,
        artworkImageId: current.artworkImageId ?? incoming.artworkImageId,
        artworkUrl: current.artworkUrl ?? incoming.artworkUrl,
        isHiRes: current.isHiRes || incoming.isHiRes ? true : current.isHiRes,
        lastPlayedAt:
            Math.max(current.lastPlayedAt ?? 0, incoming.lastPlayedAt ?? 0) || undefined,
        playback: current.playback ?? incoming.playback,
        playCount: Math.max(current.playCount ?? 0, incoming.playCount ?? 0) || undefined,
        qualityProfile,
        source: current.source ?? incoming.source,
        subtitle: current.subtitle ?? incoming.subtitle,
    };
};
