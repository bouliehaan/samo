import { SearchQuery } from '/@/shared/types/domain-types';

export type SamoSearchEntity = 'albumArtists' | 'albums' | 'songs';

export interface SamoSearchPage {
    /** The entities this server page answers for. */
    entities: SamoSearchEntity[];
    /** `undefined` leaves the server's default page size in charge. */
    limit: number | undefined;
    offset: number;
}

/**
 * The server pages a SearchQuery needs.
 *
 * `/music/search` takes one `limit` + `offset` and applies it to artists,
 * albums and tracks alike. The SearchQuery contract is per-entity: the command
 * palette pages one entity at a time with the other two at limit 0, and the
 * unified search asks for the same page of all three. So the request is
 * derived from what the caller asked for — not from `songLimit` alone, which
 * is how the palette's album and artist pages ended up sending `limit=0`
 * (the server's default page of 50) and every "next page" resending offset 0.
 *
 * - Limit 0 means none of this type: it is left out of the request, and the
 *   caller gets `[]` for it whatever the server sends back.
 * - Every other (limit, startIndex) becomes one server page, shared by the
 *   entities that asked for the same one. Both callers collapse to a single
 *   request; a caller that asks for different pages per entity gets one
 *   request per page rather than one silently wrong page.
 */
export const samoSearchPages = (query: SearchQuery): SamoSearchPage[] => {
    const asked: { entity: SamoSearchEntity; limit: number | undefined; offset: number }[] = [
        {
            entity: 'albumArtists',
            limit: query.albumArtistLimit,
            offset: query.albumArtistStartIndex ?? 0,
        },
        { entity: 'albums', limit: query.albumLimit, offset: query.albumStartIndex ?? 0 },
        { entity: 'songs', limit: query.songLimit, offset: query.songStartIndex ?? 0 },
    ];

    const pages = new Map<string, SamoSearchPage>();
    for (const { entity, limit, offset } of asked) {
        if (limit !== undefined && limit <= 0) continue;
        const key = `${limit ?? 'default'}@${offset}`;
        const page = pages.get(key);
        if (page) {
            page.entities.push(entity);
        } else {
            pages.set(key, { entities: [entity], limit, offset });
        }
    }
    return [...pages.values()];
};
