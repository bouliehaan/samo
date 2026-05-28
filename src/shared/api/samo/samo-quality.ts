import type { SamoMusicAlbum } from '@samo/core/server';

import type { QualityBadgeProfile } from '@samo/core/audio-quality';

export const samoAlbumQualityProfile = (
    album: Pick<SamoMusicAlbum, 'maxBitDepth' | 'maxSampleRate' | 'primaryAudioFile' | 'tracks'>,
): QualityBadgeProfile | undefined => {
    if (album.maxBitDepth && album.maxSampleRate) {
        return { bitDepth: album.maxBitDepth, sampleRate: album.maxSampleRate };
    }
    const file = album.primaryAudioFile;
    if (file?.bitDepth && file.sampleRate) {
        return { bitDepth: file.bitDepth, sampleRate: file.sampleRate };
    }
    let best: QualityBadgeProfile | undefined;
    for (const track of album.tracks ?? []) {
        const candidate = track.primaryAudioFile ?? track.audioFiles?.[0];
        if (!candidate?.bitDepth || !candidate.sampleRate) continue;
        const profile = { bitDepth: candidate.bitDepth, sampleRate: candidate.sampleRate };
        if (
            !best
            || profile.bitDepth > best.bitDepth
            || (profile.bitDepth === best.bitDepth && profile.sampleRate > best.sampleRate)
        ) {
            best = profile;
        }
    }
    return best;
};
