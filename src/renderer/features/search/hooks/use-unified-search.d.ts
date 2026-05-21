import { AudiobookshelfLibraryItem, AudiobookshelfPodcastEpisode } from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { Album, AlbumArtist, InternetRadioStation, Playlist, Song } from '/@/shared/types/domain-types';
export type RankedAlbum = {
    album: Album;
    kind: 'album';
    score: number;
};
export type RankedArtist = {
    artist: AlbumArtist;
    kind: 'artist';
    score: number;
};
export type RankedAudiobook = {
    item: AudiobookshelfLibraryItem;
    kind: 'audiobook';
    score: number;
};
export type RankedEpisode = {
    episode: UnifiedPodcastEpisodeResult;
    kind: 'episode';
    score: number;
};
export type RankedPlaylist = {
    kind: 'playlist';
    playlist: Playlist;
    score: number;
};
export type RankedPodcastShow = {
    item: AudiobookshelfLibraryItem;
    kind: 'podcastShow';
    score: number;
};
export type RankedRadio = {
    kind: 'radio';
    score: number;
    station: InternetRadioStation;
};
export type RankedResult = RankedAlbum | RankedArtist | RankedAudiobook | RankedEpisode | RankedPlaylist | RankedPodcastShow | RankedRadio | RankedSong;
export type RankedSong = {
    kind: 'song';
    score: number;
    song: Song;
};
export type ResultGroupKey = 'albums' | 'artists' | 'audiobooks' | 'episodes' | 'playlists' | 'podcastShows' | 'radioStations' | 'songs';
export type UnifiedPodcastEpisodeResult = {
    episode: AudiobookshelfPodcastEpisode;
    show: AudiobookshelfLibraryItem;
};
export interface UnifiedSearchResults {
    albums: RankedAlbum[];
    artists: RankedArtist[];
    audiobooks: RankedAudiobook[];
    episodes: RankedEpisode[];
    playlists: RankedPlaylist[];
    podcastShows: RankedPodcastShow[];
    radioStations: RankedRadio[];
    songs: RankedSong[];
}
export type UnifiedSearchSourceErrors = Partial<Record<UnifiedSearchSourceKey, string>>;
export type UnifiedSearchSourceKey = 'abs' | 'music' | 'playlists' | 'radio';
export interface UnifiedSearchState {
    bestMatches: RankedResult[];
    groupOrder: ResultGroupKey[];
    hasAnyResults: boolean;
    isLoading: boolean;
    results: UnifiedSearchResults;
    sourceErrors: UnifiedSearchSourceErrors;
    totalCount: number;
}
/**
 * Unified search across the music server (Navidrome/Subsonic/Jellyfin),
 * radio stations, and Audiobookshelf libraries (audiobooks, podcasts, episodes).
 *
 * Results are scored and ranked with a small relevance layer so the dropdown
 * surfaces the strongest matches first regardless of media type. Group order
 * follows the highest-scoring entry in each group; empty groups drop out.
 */
export declare const useUnifiedSearch: (rawQuery: string) => UnifiedSearchState;
