// Back-compat shim. The actual scan logic moved to
// `audio-quality/subsonic-quality-scan` so desktop + mobile both consume it
// from a server-neutral location. Android imports from this file unchanged.

export {
    annotateSubsonicAlbumsQuality,
    annotateSubsonicHiResCollections,
    getSubsonicMusicQuality,
    isSubsonicSongHiRes,
    loadSubsonicAlbumQualityProfile,
} from '../audio-quality/subsonic-quality-scan';
