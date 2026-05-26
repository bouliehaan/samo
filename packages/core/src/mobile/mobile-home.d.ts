import { type ServerAuthenticationResult } from '../server/server-auth';
import { type SamoFetch } from '../server/server-http';
import { type MobileContentSource } from './mobile-content-source';
import { type MobilePlayableAudio } from './mobile-playback';
export declare enum MobileHomeItemType {
    ALBUM = "album",
    ARTIST = "artist",
    AUDIOBOOK = "audiobook",
    PLAYLIST = "playlist",
    PODCAST = "podcast",
    RADIO = "radio"
}
export declare enum MobileHomeSectionId {
    AUDIOBOOKS = "audiobooks",
    FAVORITE_ALBUMS = "favorite-albums",
    FAVORITE_ARTISTS = "favorite-artists",
    PLAYLISTS = "playlists",
    PODCASTS = "podcasts",
    RADIO = "radio",
    RECENTLY_ADDED = "recently-added"
}
export interface MobileHomeContent {
    errors: MobileHomeSectionError[];
    loadedAt: number;
    sections: MobileHomeSection[];
    serverTitle: string;
}
export interface MobileHomeContentForServersInput {
    authentications: ServerAuthenticationResult[];
    fetch?: SamoFetch;
    limit?: number;
    qualityScanLimit?: number;
}
export interface MobileHomeContentInput {
    authentication: ServerAuthenticationResult;
    fetch?: SamoFetch;
    limit?: number;
    qualityScanLimit?: number;
}
export interface MobileHomeItem {
    /**
     * Server-reported "added at" timestamp in epoch milliseconds. Used to
     * sort the cross-source "Recently Added" hero row chronologically rather
     * than round-robining categories — so a newly-added audiobook can land
     * above a music album added two weeks ago. Undefined when the source
     * didn't report a timestamp (eg favorites/starred lists, which we never
     * surface in the Recently Added row anyway).
     */
    addedAt?: number;
    artworkUrl?: string;
    id: string;
    isHiRes?: boolean;
    playback?: MobilePlayableAudio;
    /**
     * The album / track's representative format — bit depth and sample rate
     * of the highest-quality song in the collection (or the song itself).
     * Populated by annotateSubsonicAlbumsQuality for album items; remains
     * undefined for playlists (always mixed format), artists, audiobooks,
     * podcasts. The UI uses this to pick the matching format-specific
     * badge asset; absent profile = no badge.
     */
    qualityProfile?: MobileQualityProfile;
    source?: MobileContentSource;
    subtitle?: string;
    title: string;
    type: MobileHomeItemType;
}
/**
 * @deprecated Use `QualityBadgeProfile` from `@samo/core/audio-quality`.
 */
export type MobileQualityProfile = import('../audio-quality/quality-badge-key').QualityBadgeProfile;
export interface MobileHomeSection {
    id: MobileHomeSectionId;
    items: MobileHomeItem[];
    title: string;
}
export interface MobileHomeSectionError {
    message: string;
    sectionId: MobileHomeSectionId;
}
export declare const getMobileHomeContentErrorMessage: (error: unknown) => string;
export declare const loadMobileHomeContent: ({ authentication, fetch: fetcher, limit, qualityScanLimit, }: MobileHomeContentInput) => Promise<MobileHomeContent>;
export type MobileFullCollectionVariant = 'album' | 'artist' | 'audiobook' | 'playlist' | 'podcast';
export interface MobileFullCollectionInput {
    authentications: ServerAuthenticationResult[];
    fetch?: SamoFetch;
    qualityScanLimit?: number;
    variant: MobileFullCollectionVariant;
}
export interface MobileFullCollectionResult {
    errors: string[];
    items: MobileHomeItem[];
}
/**
 * Load the COMPLETE list of items for a given collection variant across every
 * connected server. Used by the "View All" screens — Home only fetches the top
 * slice of each section, but the View All grids are supposed to be exhaustive.
 *
 * Failures from individual servers are bubbled up as errors but never block
 * the items returned by other servers — partial connectivity should still
 * show whatever it can.
 */
export declare const loadMobileFullCollection: ({ authentications, fetch: fetcher, qualityScanLimit, variant, }: MobileFullCollectionInput) => Promise<MobileFullCollectionResult>;
export declare const loadMobileHomeContentForServers: ({ authentications, fetch: fetcher, limit, qualityScanLimit, }: MobileHomeContentForServersInput) => Promise<MobileHomeContent>;
