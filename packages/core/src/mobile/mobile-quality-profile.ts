import { isLosslessAudioQuality } from '../audio-quality';
import { type MobileQualityProfile } from './mobile-home';
import { type MobileMediaDetail } from './mobile-media-detail';
import { type MobilePlayableAudio } from './mobile-playback';

const isHigherQualityProfile = (
    left: MobileQualityProfile,
    right: MobileQualityProfile | undefined,
): boolean => {
    if (!right) return true;
    if (left.bitDepth !== right.bitDepth) return left.bitDepth > right.bitDepth;
    return left.sampleRate > right.sampleRate;
};

/**
 * Pull a quality profile from a playback record's quality block.
 *
 * Returns undefined when the playback isn't lossless (transcoded, lossy
 * container). When the playback IS lossless but the server didn't fill in
 * bitDepth or sampleRate (Subsonic implementations are inconsistent about
 * populating those numeric fields for FLAC), we default to CD-quality
 * 16/44.1 — the asset map has that variant and a confirmed-lossless track
 * deserves a badge even when its exact specs aren't reported. Hi-res
 * content that DOES report its specs gets the matching format.
 */
export const getPlaybackQualityProfile = (
    playback?: MobilePlayableAudio | null,
): MobileQualityProfile | undefined => {
    if (!playback?.quality) return undefined;
    if (!isLosslessAudioQuality(playback.quality)) return undefined;
    const bitDepth = playback.quality.bitDepth ?? 16;
    const sampleRate = playback.quality.sampleRate ?? 44100;
    return { bitDepth, sampleRate };
};

/**
 * Resolve a quality profile from any home/search item. The explicit
 * qualityProfile set by annotateSubsonicAlbumsQuality wins; we fall back to
 * the item's playback (covers individual song hits in search) before
 * giving up. Undefined → caller renders no badge.
 */
export const getItemQualityProfile = (
    item?:
        | null
        | { playback?: MobilePlayableAudio; qualityProfile?: MobileQualityProfile },
): MobileQualityProfile | undefined => {
    if (!item) return undefined;
    if (item.qualityProfile) return item.qualityProfile;
    return getPlaybackQualityProfile(item.playback);
};

/**
 * When album search hits lack a collection profile (Subsonic scan limit, etc.),
 * promote the best song playback profile from the same result set.
 */
export const propagateSearchAlbumQualityFromSongs = <
    A extends { id: string; isHiRes?: boolean; qualityProfile?: MobileQualityProfile },
    S extends { albumId?: string; playback?: MobilePlayableAudio; qualityProfile?: MobileQualityProfile },
>(
    albumItems: A[],
    songItems: S[],
): A[] => {
    if (albumItems.length === 0 || songItems.length === 0) {
        return albumItems;
    }

    const profileByAlbumId = new Map<string, MobileQualityProfile>();
    for (const song of songItems) {
        const albumId = song.albumId;
        if (!albumId) continue;
        const profile = getItemQualityProfile(song);
        if (!profile) continue;
        const existing = profileByAlbumId.get(albumId);
        if (isHigherQualityProfile(profile, existing)) {
            profileByAlbumId.set(albumId, profile);
        }
    }

    if (profileByAlbumId.size === 0) {
        return albumItems;
    }

    return albumItems.map((album) => {
        if (album.qualityProfile) {
            return album;
        }
        const profile = profileByAlbumId.get(album.id);
        if (!profile) {
            return album;
        }
        return { ...album, isHiRes: true, qualityProfile: profile };
    });
};

/**
 * Album-detail and audiobook-detail: prefer the loader-computed profile,
 * else walk tracks for the best one. Playlist detail intentionally still
 * computes a profile here (so per-track badges work) but the UI never
 * draws it on the playlist hero — see the rendering rule in the album hero.
 */
export const getDetailQualityProfile = (
    detail?: MobileMediaDetail | null,
): MobileQualityProfile | undefined => {
    if (!detail) return undefined;
    if (detail.qualityProfile) return detail.qualityProfile;
    let best: MobileQualityProfile | undefined;
    for (const track of detail.tracks) {
        const profile = getPlaybackQualityProfile(track.playback);
        if (!profile) continue;
        if (
            !best ||
            profile.bitDepth > best.bitDepth ||
            (profile.bitDepth === best.bitDepth && profile.sampleRate > best.sampleRate)
        ) {
            best = profile;
        }
    }
    return best;
};
