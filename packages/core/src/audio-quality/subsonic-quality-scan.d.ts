import { type QualityBadgeProfile } from './quality-badge-key';

import { type ServerAuthenticationResult } from '../server/server-auth';
import { type SamoFetch } from '../server/server-http';

export interface SubsonicPlayableSong {
    album?: string;
    albumArtist?: string;
    albumId?: number | string;
    artist?: string;
    artistId?: number | string;
    bitDepth?: number | string;
    bitRate?: number | string;
    channelCount?: number | string;
    contentType?: string;
    coverArt?: string;
    duration?: number;
    id?: number | string;
    parent?: number | string;
    sampleRate?: number | string;
    samplingRate?: number | string;
    suffix?: string;
    title?: string;
}

export declare const getSubsonicMusicQuality: (song: SubsonicPlayableSong) => {
    bitDepth: null | number;
    bitRate: null | number;
    channelCount: null | number;
    container: null | string;
    deliveryKind: 'android-direct';
    losslessRequired: true;
    sampleRate: null | number;
    serverTranscodeRequested: false;
};

export declare const isSubsonicSongHiRes: (song: SubsonicPlayableSong) => boolean;

export declare const loadSubsonicAlbumQualityProfile: (
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    id: string,
) => Promise<QualityBadgeProfile | undefined>;

export declare const annotateSubsonicAlbumsQuality: <
    T extends { id: string; isHiRes?: boolean; qualityProfile?: QualityBadgeProfile },
>(
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    items: T[],
    limit?: number,
) => Promise<T[]>;

export declare const annotateSubsonicHiResCollections: <
    T extends { id: string; isHiRes?: boolean; qualityProfile?: QualityBadgeProfile },
>(
    authentication: ServerAuthenticationResult,
    fetcher: SamoFetch,
    kind: 'album' | 'playlist',
    items: T[],
    limit?: number,
) => Promise<T[]>;

export type SubsonicCollectionQualityKind = 'album' | 'playlist';
