// Server-aware Subsonic / Navidrome quality extraction + album scan.
//
// Lives under audio-quality (not mobile) because none of this is platform-
// specific — it's pure Subsonic-API protocol work. Android, desktop, and any
// future client consume the same code path.

import { type QualityBadgeProfile } from './quality-badge-key';
import { isHiResAudioQuality, isLosslessAudioQuality } from './quality-labels';

import { type ServerAuthenticationResult } from '../server/server-auth';
import { requestJson, type SamoFetch } from '../server/server-http';

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

export interface SubsonicPlayableSong {
    album?: string;
    albumArtist?: string;
    albumId?: number | string;
    artist?: string;
    artistId?: number | string;
    bitDepth?: number | string;
    bitRate?: number | string;
    channelCount?: number | string;
    contentType?: string;
    coverArt?: string;
    duration?: number;
    id?: number | string;
    parent?: number | string;
    sampleRate?: number | string;
    samplingRate?: number | string;
    suffix?: string;
    title?: string;
}

const toAudioNumber = (value: null | number | string | undefined): null | number => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
};

const getContainerFromContentType = (contentType: string | undefined): null | string => {
    if (!contentType?.startsWith('audio/')) {
        return null;
    }
    return contentType.split('/')[1] ?? null;
};

/**
 * Extract the audio-quality descriptor from a Subsonic song response.
 * `deliveryKind: 'android-direct'` is the historical default and stays for
 * back-compat — every caller currently passes it through `isLosslessAudioQuality`
 * which doesn't read deliveryKind. Desktop callers that need a different
 * deliveryKind can override the field after calling this.
 */
export const getSubsonicMusicQuality = (song: SubsonicPlayableSong) => ({
    bitDepth: toAudioNumber(song.bitDepth),
    bitRate: toAudioNumber(song.bitRate),
    channelCount: toAudioNumber(song.channelCount),
    container: song.suffix ?? getContainerFromContentType(song.contentType),
    deliveryKind: 'android-direct' as const,
    losslessRequired: true,
    sampleRate: toAudioNumber(song.samplingRate ?? song.sampleRate),
    serverTranscodeRequested: false,
});

export const isSubsonicSongHiRes = (song: SubsonicPlayableSong) =>
    isHiResAudioQuality(getSubsonicMusicQuality(song));

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
    left: QualityBadgeProfile,
    right: QualityBadgeProfile | undefined,
): boolean => {
    if (!right) return true;
    if (left.bitDepth !== right.bitDepth) return left.bitDepth > right.bitDepth;
    return left.sampleRate > right.sampleRate;
};

/**
 * For the given Subsonic album, fetch its songs and return the highest
 * quality profile across them — but ONLY when at least one song clears the
 * hi-res threshold. If the album is plain CD or transcoded, we return
 * undefined so the UI shows no badge.
 */
export const loadSubsonicAlbumQualityProfile = async (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    id: string,
): Promise<QualityBadgeProfile | undefined> => {
    const body = await requestJson<SubsonicAlbumQualityBody>(
        fetcher,
        subsonicUrl(authentication, 'getAlbum.view', { id }),
    );
    const response = body['subsonic-response'];

    if (response?.status !== 'ok') {
        return undefined;
    }

    // Anything lossless at 16-bit or above earns a badge — including CD-rate
    // FLAC. Walk every song; keep the album's highest profile.
    //
    // When the server confirms lossless (premium container, direct delivery)
    // but doesn't report bitDepth / sampleRate explicitly, fall back to
    // CD-quality (16/44.1). Real-world Subsonic/Navidrome installs are
    // inconsistent about populating those numeric fields for FLAC.
    let best: QualityBadgeProfile | undefined;
    for (const song of response?.album?.song ?? []) {
        const quality = getSubsonicMusicQuality(song);
        if (!isLosslessAudioQuality(quality)) continue;
        const bitDepth = quality.bitDepth ?? 16;
        const sampleRate = quality.sampleRate ?? 44100;
        const candidate: QualityBadgeProfile = { bitDepth, sampleRate };
        if (isHigherProfile(candidate, best)) {
            best = candidate;
        }
    }

    return best;
};

/**
 * Walk a batch of album items (typically the home page's albums/recents
 * sections) and stamp each one with its representative quality profile.
 * Bumped scan limit from the previous 24 — at 24 it was missing the badge
 * for too many real-world libraries where hi-res titles weren't all in the
 * top-of-list slice.
 */
export const annotateSubsonicAlbumsQuality = async <
    T extends { id: string; isHiRes?: boolean; qualityProfile?: QualityBadgeProfile },
>(
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    items: T[],
    limit = 80,
): Promise<T[]> => {
    const scannedItems = items.slice(0, limit);
    const profileById = new Map<string, QualityBadgeProfile>();
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
                    // Single-album scan failure shouldn't sink the rest of
                    // the sweep — just leave that item without a profile.
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
    T extends { id: string; isHiRes?: boolean; qualityProfile?: QualityBadgeProfile },
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
