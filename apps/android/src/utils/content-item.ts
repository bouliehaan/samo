import { type MobileQualityProfile } from '@samo/core/mobile';

import { type AndroidRecentContentSourceItem } from '../services/recent-content';

export const getContentItemKey = (item: {
    id: string;
    source?: { id: string };
    type: string;
}) => {
    return `${item.source?.id ?? 'server'}:${item.type}:${item.id}`;
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
