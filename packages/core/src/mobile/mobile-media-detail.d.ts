import { type ServerAuthenticationResult } from '../server/server-auth';
import { type SamoFetch } from '../server/server-http';
import { type MobileContentSource } from './mobile-content-source';
import { type MobileHomeItem, type MobileQualityProfile } from './mobile-home';
import { type MobilePlayableAudio, type MobilePlaybackSegment } from './mobile-playback';
export declare enum MobileMediaDetailType {
    ALBUM = "album",
    ARTIST = "artist",
    AUDIOBOOK = "audiobook",
    PLAYLIST = "playlist",
    PODCAST = "podcast"
}
export interface AddMobileTracksToPlaylistInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    playlistId: string;
    songIds: string[];
}
export interface MobileMediaDetail {
    appearsOnItems?: MobileHomeItem[];
    artworkUrl?: string;
    biography?: string;
    id: string;
    isHiRes?: boolean;
    items?: MobileHomeItem[];
    metadataLines?: string[];
    /**
     * Representative bit-depth/sample-rate for the whole detail (albums
     * only). Computed by walking detail.tracks at load time; surfaces as
     * the hero badge and the inline "24-bit / 96 kHz" text line.
     */
    qualityProfile?: MobileQualityProfile;
    relatedArtists?: MobileHomeItem[];
    source: MobileContentSource;
    subtitle?: string;
    title: string;
    topTracks?: MobileMediaTrack[];
    tracks: MobileMediaTrack[];
    type: MobileMediaDetailType;
}
export interface MobileMediaDetailInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    id: string;
    type: MobileMediaDetailType;
}
export interface MobileMediaTrack {
    album?: string;
    albumId?: string;
    artist?: string;
    artistId?: string;
    artworkUrl?: string;
    durationSeconds?: number;
    discNumber?: number;
    episodeId?: string;
    id: string;
    itemId?: string;
    playback?: MobilePlayableAudio;
    publishedAt?: number;
    startSeconds?: number;
    subtitle?: string;
    timelineSegments?: MobilePlaybackSegment[];
    title: string;
    trackNumber?: number;
}
export declare const getMobileMediaDetailErrorMessage: (error: unknown) => string;
export declare const loadMobileMediaDetail: ({ authentication, fetch: fetcher, id, type, }: MobileMediaDetailInput) => Promise<MobileMediaDetail>;
export interface SongRadioSeed {
    albumId?: string;
    artist?: string;
    artistId?: string;
    songId: string;
}
export interface LoadSongRadioInput {
    authentication: ServerAuthenticationResult;
    count?: number;
    fetch?: SamoFetch;
    seed: SongRadioSeed;
}
/**
 * Build a Song Radio queue. Uses Subsonic's getSimilarSongs2 as the primary
 * source and blends in the seed artist's top tracks when available, so the
 * queue feels grounded in the song instead of just being "loosely similar."
 */
export declare const loadSongRadioQueue: ({ authentication, count, fetch: fetcher, seed, }: LoadSongRadioInput) => Promise<MobilePlayableAudio[]>;
export interface AudiobookshelfDownloadFile {
    /** Build the download URL for this file (no Authorization header included). */
    downloadUrl: string;
    /** Duration of this file in seconds (used to compute book-time → file mapping). */
    durationSeconds?: number;
    /** Filename suggested by the server, e.g. "Title - 01.mp3". */
    filename: string;
    /** Inode id used to construct /api/items/:id/file/:ino. */
    ino: string;
    /** Sequence index within the book. Defaults to array order if absent. */
    index?: number;
    /** Item id this file belongs to. */
    itemId: string;
    /** File size in bytes, when the server reports it. */
    sizeBytes?: number;
    /** Where in the book this file begins (seconds). 0 for single-file books. */
    startOffsetSeconds?: number;
    /** ABS title for the file (sometimes pretty, sometimes not). */
    title?: string;
}
/**
 * Resolve the per-file audio download URLs for an Audiobookshelf library
 * item. ABS exposes the raw, original-quality audio files via
 * `/api/items/:itemId/file/:ino`, which is what we want for offline storage
 * — the `/play` endpoint sometimes returns a server-transcoded HLS stream
 * that's lower quality and can't be saved offline as a single file.
 *
 * For single-file audiobooks this returns one entry. For multi-file books
 * the array contains one entry per part, in playback order.
 */
export declare const loadAudiobookshelfDownloadFiles: ({ authentication, fetch: fetcher, itemId, }: {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    itemId: string;
}) => Promise<AudiobookshelfDownloadFile[]>;
export interface AudiobookshelfPodcastEpisodeFile {
    /** Filename suggested by the server. */
    filename: string;
    /** ABS episode id (matches MobileMediaTrack.episodeId for podcasts). */
    episodeId: string;
    /** Build URL hits /api/items/:itemId/file/:ino — original-quality raw file. */
    fileDownloadUrl: string;
    /** Inode id of the audio file. */
    ino: string;
    /** Parent library item id. */
    itemId: string;
    /** File size in bytes when known. */
    sizeBytes?: number;
    /** Episode title for UI surfaces. */
    title: string;
}
/**
 * Resolve raw per-episode download URLs for an Audiobookshelf podcast item.
 *
 * The play endpoint we use for streaming (`/api/items/:itemId/play/:episodeId`)
 * is allowed to hand back an HLS playlist instead of the underlying audio
 * file, which can't be saved as a single offline file. The file endpoint
 * (`/api/items/:itemId/file/:ino`) always returns the source MP3/M4A
 * regardless of how the server's playback layer would deliver it.
 *
 * Returns one entry per episode that has a discoverable audio file ino.
 */
export declare const loadAudiobookshelfPodcastEpisodeFiles: ({ authentication, fetch: fetcher, itemId, }: {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    itemId: string;
}) => Promise<AudiobookshelfPodcastEpisodeFile[]>;
export declare const addMobileTracksToPlaylist: ({ authentication, fetch: fetcher, playlistId, songIds, }: AddMobileTracksToPlaylistInput) => Promise<void>;
