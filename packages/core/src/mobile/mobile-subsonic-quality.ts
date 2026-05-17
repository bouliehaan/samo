import { isHiResAudioQuality } from '../audio-quality';
import { type ServerAuthenticationResult } from '../server/server-auth';
import { requestJson, type SamoFetch } from '../server/server-http';
import { type MobileQualityProfile } from './mobile-home';
import { getSubsonicMusicQuality, type SubsonicPlayableSong } from './mobile-playback';

const QUALITY_SCAN_CONCURRENCY = 4;

interface SubsonicQualityResponse {
    error?: { message?: string };
    status?: string;
}

interface SubsonicAlbumQualityBody {
    'subsonic-response'?: SubsonicQualityResponse & {
        album?: {
            song?: SubsonicPlayableSong[];
        };
    };
}

const subsonicUrl = (
    authentication: ServerAuthenticationResult,
    path: string,
    query: Record<string, number | string> = {},
) => {
    const params = new URLSearchParams({
        c: 'Samo',
        f: 'json',
        v: '1.13.0',
    });

    for (const [key, value] of Object.entries(query)) {
        params.set(key, String(value));
    }

    return `${authentication.url}/rest/${path}?${params.toString()}&${authentication.credential}`;
};

/**
 * Compare two quality profiles. Higher bit depth wins outright; within a bit
 * depth, higher sample rate wins. Used to roll up an album's representative
 * format from its tracks — a 24/96 album with one 24/192 song still shows the
 * 24/192 badge because that's the best the album contains.
 */
const isHigherProfile = (
    left: MobileQualityProfile,
    right: MobileQualityProfile | undefined,
): boolean => {
    if (!right) return true;
    if (left.bitDepth !== right.bitDepth) return left.bitDepth > right.bitDepth;
    return left.sampleRate > right.sampleRate;
};

/**
 * For the given Subsonic album, fetch its songs and return the highest
 * quality profile across them — but ONLY when at least one song clears the
 * hi-res threshold. If the album is plain CD or transcoded, we return
 * undefined so the UI shows no badge (instead of a badge for, eg, 16/44.1
 * everywhere, which would put a "premium" mark on stock music).
 */
export const loadSubsonicAlbumQualityProfile = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    id: string,
): Promise<MobileQualityProfile | undefined> => {
    const body = await requestJson<SubsonicAlbumQualityBody>(
        fetcher,
        subsonicUrl(authentication, 'getAlbum.view', { id }),
    );
    const response = body['subsonic-response'];

    if (response?.status !== 'ok') {
        return undefined;
    }

    let best: MobileQualityProfile | undefined;
    let anyHiRes = false;
    for (const song of response?.album?.song ?? []) {
        const quality = getSubsonicMusicQuality(song);
        if (!isHiResAudioQuality(quality)) continue;
        anyHiRes = true;
        const bitDepth = quality.bitDepth ?? null;
        const sampleRate = quality.sampleRate ?? null;
        if (bitDepth == null || sampleRate == null) continue;
        const candidate: MobileQualityProfile = { bitDepth, sampleRate };
        if (isHigherProfile(candidate, best)) {
            best = candidate;
        }
    }

    // Album qualifies as hi-res by bitrate floor but no song reports a
    // structured profile — return undefined so we don't pick a wrong badge.
    // The legacy isHiRes boolean (set elsewhere) still keeps that information
    // around for non-badge consumers.
    return anyHiRes ? best : undefined;
};

/**
 * Walk a batch of album items (typically the home page's albums/recents
 * sections) and stamp each one with its representative quality profile.
 * Bumped scan limit from the previous 24 — at 24 it was missing the badge
 * for too many real-world libraries where hi-res titles weren't all in the
 * top-of-list slice.
 */
export const annotateSubsonicAlbumsQuality = async <
    T extends { id: string; isHiRes?: boolean; qualityProfile?: MobileQualityProfile },
>(
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    items: T[],
    limit = 80,
): Promise<T[]> => {
    const scannedItems = items.slice(0, limit);
    const profileById = new Map<string, MobileQualityProfile>();
    for (let index = 0; index < scannedItems.length; index += QUALITY_SCAN_CONCURRENCY) {
        const chunk = scannedItems.slice(index, index + QUALITY_SCAN_CONCURRENCY);
        await Promise.all(
            chunk.map(async (item) => {
                try {
                    const profile = await loadSubsonicAlbumQualityProfile(
                        authentication,
                        fetcher,
                        item.id,
                    );
                    if (profile) {
                        profileById.set(item.id, profile);
                    }
                } catch {
                    // Single-album scan failure shouldn't sink the rest of the
                    // sweep — just leave that item without a profile.
                }
            }),
        );
    }

    if (profileById.size === 0) {
        return items;
    }

    return items.map((item) => {
        const profile = profileById.get(item.id);
        if (!profile) return item;
        return { ...item, isHiRes: true, qualityProfile: profile };
    });
};

/**
 * Back-compat alias. Existing callsites still use the old name and only care
 * about the boolean side effect — they get correct behavior plus a profile
 * for free. Once everything's migrated to annotateSubsonicAlbumsQuality the
 * alias can go away.
 */
export const annotateSubsonicHiResCollections = async <
    T extends { id: string; isHiRes?: boolean; qualityProfile?: MobileQualityProfile },
>(
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    kind: 'album' | 'playlist',
    items: T[],
    limit = 80,
): Promise<T[]> => {
    // Playlists are mixed format by design — a "playlist hi-res" badge would
    // be misleading the moment the user adds one lossy track. We only scan
    // albums; playlists pass through untouched and the UI suppresses the
    // playlist-level badge regardless.
    if (kind !== 'album') return items;
    return annotateSubsonicAlbumsQuality(authentication, fetcher, items, limit);
};

export type SubsonicCollectionQualityKind = 'album' | 'playlist';
