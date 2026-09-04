import {
    clearSamoPodcastCache,
    getFetch,
    getSamoPodcastCacheSummary,
    getSamoPodcastPrewarm,
    setSamoPodcastCacheLimit,
    setSamoPodcastPrewarm,
    type SamoPodcastCacheSummary,
    type ServerAuthenticationResult,
} from '@samo/core/server';

/**
 * Admin-facing podcast cache controls for the Settings screen: how many newest
 * episodes the server keeps warm per show (prewarm), the on-disk size cap, and
 * a "clear everything" escape hatch. Thin wrappers over the core server client
 * bound to the active samo connection.
 */
export interface PodcastCacheState {
    episodeCount: number;
    totalBytes: number;
    maxBytes: number;
    prewarmCount: number;
    prewarmDefault: number;
}

type SamoAuth = Pick<ServerAuthenticationResult, 'credential' | 'url'>;

export const loadPodcastCacheState = async (auth: SamoAuth): Promise<PodcastCacheState> => {
    const fetcher = getFetch();
    const [summary, prewarm] = await Promise.all([
        getSamoPodcastCacheSummary(fetcher, auth),
        getSamoPodcastPrewarm(fetcher, auth),
    ]);
    return {
        episodeCount: summary.episodeCount,
        maxBytes: summary.maxBytes,
        prewarmCount: prewarm.count,
        prewarmDefault: prewarm.default,
        totalBytes: summary.totalBytes,
    };
};

export const updatePodcastPrewarmCount = async (auth: SamoAuth, count: number): Promise<void> => {
    await setSamoPodcastPrewarm(getFetch(), auth, count);
};

export const updatePodcastCacheLimit = async (auth: SamoAuth, maxBytes: number): Promise<void> => {
    await setSamoPodcastCacheLimit(getFetch(), auth, maxBytes);
};

export const clearAllPodcastCache = async (auth: SamoAuth): Promise<void> => {
    await clearSamoPodcastCache(getFetch(), auth);
};

export type { SamoPodcastCacheSummary };
