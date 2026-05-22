import {
    isLosslessAudioQuality,
    type QualityBadgeProfile,
} from '@samo/core/audio-quality';
import isElectron from 'is-electron';

import { usePlaybackSettings, usePlaybackType } from '/@/renderer/store';
import { Album, QueueSong, Song } from '/@/shared/types/domain-types';
import { PlayerType } from '/@/shared/types/types';

export const getSongQualityProfile = (
    song: Pick<Song, 'bitDepth' | 'bitRate' | 'container' | 'sampleRate'> | undefined,
    deliveryKind: 'native-direct' | 'transcoded' | 'web-direct',
): QualityBadgeProfile | undefined => {
    if (!song) return undefined;
    if (
        !isLosslessAudioQuality({
            bitDepth: song.bitDepth,
            bitRate: song.bitRate,
            container: song.container,
            deliveryKind,
            sampleRate: song.sampleRate,
        })
    ) {
        return undefined;
    }
    const bitDepth = song.bitDepth ?? 16;
    const sampleRate = song.sampleRate ?? 44100;
    return { bitDepth, sampleRate };
};

export const getQueueSongQualityProfile = (
    song: QueueSong | undefined,
    options: { transcodeEnabled: boolean; playbackType: PlayerType },
): QualityBadgeProfile | undefined => {
    const deliveryKind =
        isElectron() && options.playbackType === PlayerType.LOCAL
            ? 'native-direct'
            : options.transcodeEnabled
              ? 'transcoded'
              : 'web-direct';
    return getSongQualityProfile(song, deliveryKind);
};

export const getAlbumQualityProfileFromSongs = (
    songs: Pick<Song, 'bitDepth' | 'bitRate' | 'container' | 'sampleRate'>[] | undefined,
    deliveryKind: 'native-direct' | 'transcoded' | 'web-direct',
): QualityBadgeProfile | undefined => {
    if (!songs?.length) return undefined;
    let best: QualityBadgeProfile | undefined;
    for (const song of songs) {
        const profile = getSongQualityProfile(song, deliveryKind);
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

export type AlbumWithQualityProfile = Album & {
    qualityProfile?: QualityBadgeProfile;
};

export const getAlbumQualityProfile = (
    album: AlbumWithQualityProfile | undefined,
    songs?: Song[],
    deliveryKind: 'native-direct' | 'transcoded' | 'web-direct' = 'web-direct',
): QualityBadgeProfile | undefined => {
    if (!album) return undefined;
    if (album.qualityProfile) return album.qualityProfile;
    return getAlbumQualityProfileFromSongs(songs ?? album.songs, deliveryKind);
};

/** Convenience hook inputs for components that already have playback settings in scope. */
export const usePlaybackDeliveryKind = () => {
    const { transcode } = usePlaybackSettings();
    const playbackType = usePlaybackType();
    return isElectron() && playbackType === PlayerType.LOCAL
        ? ('native-direct' as const)
        : transcode.enabled
          ? ('transcoded' as const)
          : ('web-direct' as const);
};
