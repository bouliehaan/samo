import { type ServerAuthenticationResult } from '../server/server-auth';
import { type SamoFetch } from '../server/server-http';
import { type MobileContentSource } from './mobile-content-source';
import { type MobilePlayableAudio } from './mobile-playback';
import { type MobileQualityProfile } from './mobile-home';
export declare enum MobileSearchItemType {
    ALBUM = "album",
    ARTIST = "artist",
    AUDIOBOOK = "audiobook",
    PLAYLIST = "playlist",
    PODCAST = "podcast",
    RADIO = "radio",
    SONG = "song"
}
export declare enum MobileSearchSectionId {
    ALBUMS = "albums",
    ARTISTS = "artists",
    AUDIOBOOKS = "audiobooks",
    PLAYLISTS = "playlists",
    PODCASTS = "podcasts",
    RADIO = "radio",
    SONGS = "songs"
}
export interface MobileSearchAcrossServersInput {
    authentications: ServerAuthenticationResult[];
    fetch?: SamoFetch;
    limit?: number;
    qualityScanLimit?: number;
    query: string;
    userRecents?: Map<string, number>;
}
export interface MobileSearchInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    limit?: number;
    qualityScanLimit?: number;
    query: string;
}
export interface MobileSearchItem {
    album?: string;
    albumId?: string;
    artist?: string;
    artistId?: string;
    artworkUrl?: string;
    id: string;
    isHiRes?: boolean;
    lastPlayedAt?: number;
    playback?: MobilePlayableAudio;
    playCount?: number;
    /**
     * Format profile from annotateSubsonicAlbumsQuality (albums only).
     * Songs derive their profile from playback.quality at render time.
     * Playlists, artists, etc. are always undefined.
     */
    qualityProfile?: MobileQualityProfile;
    source?: MobileContentSource;
    subtitle?: string;
    title: string;
    type: MobileSearchItemType;
}
export interface MobileSearchResults {
    errors: MobileSearchSectionError[];
    query: string;
    searchedAt: number;
    sections: MobileSearchSection[];
}
export interface MobileSearchSection {
    id: MobileSearchSectionId;
    items: MobileSearchItem[];
    title: string;
}
export interface MobileSearchSectionError {
    message: string;
    sectionId: MobileSearchSectionId;
}
export declare const getMobileSearchErrorMessage: (error: unknown) => string;
export interface MobileSearchRankingContext {
    userRecents?: Map<string, number>;
}
export declare const getMobileSearchItemKey: (item: {
    id: string;
    source?: {
        id: string;
    };
    type: string;
}) => string;
export declare const searchMobileContent: ({ authentication, fetch: fetcher, limit, qualityScanLimit, query, }: MobileSearchInput) => Promise<MobileSearchResults>;
export declare const searchMobileContentAcrossServers: ({ authentications, fetch: fetcher, limit, qualityScanLimit, query, userRecents, }: MobileSearchAcrossServersInput) => Promise<MobileSearchResults>;
