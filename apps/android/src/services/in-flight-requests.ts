/**
 * Coalesce duplicate async work (e.g. boot home refresh + post-health home refresh)
 * so only one network fetch runs per stable key.
 */
export const dedupeInFlight = <T>(key: string, factory: () => Promise<T>): Promise<T> => {
    const existing = inFlightRequests.get(key);
    if (existing) {
        return existing as Promise<T>;
    }

    const promise = factory().finally(() => {
        if (inFlightRequests.get(key) === promise) {
            inFlightRequests.delete(key);
        }
    });
    inFlightRequests.set(key, promise);
    return promise;
};

const inFlightRequests = new Map<string, Promise<unknown>>();

export const buildHomeLoadKey = (
    authentication: Array<{ url: string; type: string }>,
): string => {
    const signature = authentication
        .map((auth) => `${auth.type}:${auth.url}`)
        .sort()
        .join('|');
    return `home:${signature}`;
};

export const buildMediaDetailLoadKey = (cacheKey: string): string => `detail:${cacheKey}`;
