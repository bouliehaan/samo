// Server-aware Subsonic / Navidrome quality extraction + album scan.
//
// Lives under audio-quality (not mobile) because none of this is platform-
// specific — it's pure Subsonic-API protocol work. Android, desktop, and any
// future client consume the same code path.

import { requestJson } from '../server/server-http';

import { isHiResAudioQuality, isLosslessAudioQuality } from './quality-labels';

const QUALITY_SCAN_CONCURRENCY = 4;

const toAudioNumber = (value) => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

const getContainerFromContentType = (contentType) => {
    if (!contentType?.startsWith('audio/')) {
        return null;
    }
    return contentType.split('/')[1] ?? null;
};

/**
 * Extract the audio-quality descriptor from a Subsonic song response.
 */
export const getSubsonicMusicQuality = (song) => ({
    bitDepth: toAudioNumber(song.bitDepth),
    bitRate: toAudioNumber(song.bitRate),
    channelCount: toAudioNumber(song.channelCount),
    container: song.suffix ?? getContainerFromContentType(song.contentType),
    deliveryKind: 'android-direct',
    losslessRequired: true,
    sampleRate: toAudioNumber(song.samplingRate ?? song.sampleRate),
    serverTranscodeRequested: false,
});

export const isSubsonicSongHiRes = (song) => isHiResAudioQuality(getSubsonicMusicQuality(song));

const subsonicUrl = (authentication, path, query = {}) => {
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

const isHigherProfile = (left, right) => {
    if (!right) return true;
    if (left.bitDepth !== right.bitDepth) return left.bitDepth > right.bitDepth;
    return left.sampleRate > right.sampleRate;
};

export const loadSubsonicAlbumQualityProfile = async (authentication, fetcher, id) => {
    const body = await requestJson(fetcher, subsonicUrl(authentication, 'getAlbum.view', { id }));
    const response = body['subsonic-response'];

    if (response?.status !== 'ok') {
        return undefined;
    }

    let best;
    for (const song of response?.album?.song ?? []) {
        const quality = getSubsonicMusicQuality(song);
        if (!isLosslessAudioQuality(quality)) continue;
        const bitDepth = quality.bitDepth ?? 16;
        const sampleRate = quality.sampleRate ?? 44100;
        const candidate = { bitDepth, sampleRate };
        if (isHigherProfile(candidate, best)) {
            best = candidate;
        }
    }

    return best;
};

export const annotateSubsonicAlbumsQuality = async (authentication, fetcher, items, limit = 80) => {
    const scannedItems = items.slice(0, limit);
    const profileById = new Map();
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
                    // single-album scan failure shouldn't sink the rest
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

export const annotateSubsonicHiResCollections = async (
    authentication,
    fetcher,
    kind,
    items,
    limit = 80,
) => {
    if (kind !== 'album') return items;
    return annotateSubsonicAlbumsQuality(authentication, fetcher, items, limit);
};
