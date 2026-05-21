import { type ServerAuthenticationResult } from '../server/server-auth';
import { type SamoFetch } from '../server/server-http';
import { type MobileQualityProfile } from './mobile-home';
/**
 * For the given Subsonic album, fetch its songs and return the highest
 * quality profile across them — but ONLY when at least one song clears the
 * hi-res threshold. If the album is plain CD or transcoded, we return
 * undefined so the UI shows no badge (instead of a badge for, eg, 16/44.1
 * everywhere, which would put a "premium" mark on stock music).
 */
export declare const loadSubsonicAlbumQualityProfile: (authentication: ServerAuthenticationResult, fetcher: SamoFetch, id: string) => Promise<MobileQualityProfile | undefined>;
/**
 * Walk a batch of album items (typically the home page's albums/recents
 * sections) and stamp each one with its representative quality profile.
 * Bumped scan limit from the previous 24 — at 24 it was missing the badge
 * for too many real-world libraries where hi-res titles weren't all in the
 * top-of-list slice.
 */
export declare const annotateSubsonicAlbumsQuality: <T extends {
    id: string;
    isHiRes?: boolean;
    qualityProfile?: MobileQualityProfile;
}>(authentication: ServerAuthenticationResult, fetcher: SamoFetch, items: T[], limit?: number) => Promise<T[]>;
/**
 * Back-compat alias. Existing callsites still use the old name and only care
 * about the boolean side effect — they get correct behavior plus a profile
 * for free. Once everything's migrated to annotateSubsonicAlbumsQuality the
 * alias can go away.
 */
export declare const annotateSubsonicHiResCollections: <T extends {
    id: string;
    isHiRes?: boolean;
    qualityProfile?: MobileQualityProfile;
}>(authentication: ServerAuthenticationResult, fetcher: SamoFetch, kind: "album" | "playlist", items: T[], limit?: number) => Promise<T[]>;
export type SubsonicCollectionQualityKind = 'album' | 'playlist';
