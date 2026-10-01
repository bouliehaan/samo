// Home heroes: the cards a client's Home leads with.
//
// The answer to "what should I play right now", ranked by the server, which
// has the play log, the feed timestamps and the user's playback state. Both
// clients render the same list, so neither guesses.

import { type ServerAuthenticationResult } from './server-auth';
import { type SamoFetch } from './server-http';
import { absoluteSamoMediaUrl, getSamoMetadataImageUrl, samoGet } from './server-samo';

export type SamoHomeHeroKind =
    | 'wrapped'
    | 'episode'
    | 'explore'
    | 'season'
    | 'resume'
    | 'rediscover'
    | 'library'
    | 'playlist';

/** What the card's primary control does with its target. */
export type SamoHomeHeroAction = 'play' | 'shuffle';

/**
 * One cover on the card. `id` names a catalog image the media route serves;
 * `url` is the picture's address, samo-relative unless it lives elsewhere.
 */
export interface SamoHomeHeroSleeve {
    id?: string;
    url?: string;
}

export interface SamoHomeHeroTarget {
    id: string;
    type: 'episode' | 'playlist' | 'album' | 'audiobook';
}

export interface SamoHomeHero {
    action: SamoHomeHeroAction;
    eyebrow: string;
    /** The instant that earned the card its place, if one did. */
    freshAt?: string;
    /** Stable for as long as the card means the same thing. */
    id: string;
    kind: SamoHomeHeroKind;
    meta?: string;
    score: number;
    sleeves?: SamoHomeHeroSleeve[];
    subtitle?: string;
    target: SamoHomeHeroTarget;
    title: string;
}

export interface SamoHomeHeroesResponse {
    items: SamoHomeHero[];
}

export const listSamoHomeHeroes = async (
    fetcher: SamoFetch,
    authentication: Pick<ServerAuthenticationResult, 'credential' | 'url'>,
    options?: { signal?: AbortSignal; session?: string; seen?: string[] },
): Promise<SamoHomeHeroesResponse> => {
    return samoGet<SamoHomeHeroesResponse>(fetcher, authentication, '/home/heroes', {
        signal: options?.signal,
        query: {
            session: options?.session,
            seen: options?.seen ? JSON.stringify(options.seen) : undefined,
        },
    });
};

/** A sleeve as a URL this client can load. */
export const resolveSamoHeroSleeveUrl = (
    authentication: Pick<ServerAuthenticationResult, 'url'>,
    sleeve: SamoHomeHeroSleeve,
    streamToken?: string,
): string | undefined => {
    if (sleeve.url) {
        return absoluteSamoMediaUrl(authentication, sleeve.url, streamToken);
    }
    if (sleeve.id) {
        return getSamoMetadataImageUrl(authentication, sleeve.id, streamToken);
    }
    return undefined;
};
