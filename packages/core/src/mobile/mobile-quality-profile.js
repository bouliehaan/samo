import { isLosslessAudioQuality } from '../audio-quality';
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
export const getPlaybackQualityProfile = (playback) => {
    if (!playback?.quality)
        return undefined;
    if (!isLosslessAudioQuality(playback.quality))
        return undefined;
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
export const getItemQualityProfile = (item) => {
    if (!item)
        return undefined;
    if (item.qualityProfile)
        return item.qualityProfile;
    return getPlaybackQualityProfile(item.playback);
};
/**
 * Album-detail and audiobook-detail: prefer the loader-computed profile,
 * else walk tracks for the best one. Playlist detail intentionally still
 * computes a profile here (so per-track badges work) but the UI never
 * draws it on the playlist hero — see the rendering rule in the album hero.
 */
export const getDetailQualityProfile = (detail) => {
    if (!detail)
        return undefined;
    if (detail.qualityProfile)
        return detail.qualityProfile;
    let best;
    for (const track of detail.tracks) {
        const profile = getPlaybackQualityProfile(track.playback);
        if (!profile)
            continue;
        if (!best ||
            profile.bitDepth > best.bitDepth ||
            (profile.bitDepth === best.bitDepth && profile.sampleRate > best.sampleRate)) {
            best = profile;
        }
    }
    return best;
};
