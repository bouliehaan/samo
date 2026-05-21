import { type SamoFetch } from './server-http';
import { type AbsLibrariesResponse, type AbsLibraryItem, type AbsLibraryItemsResponse, type AbsLoginResponse, type AbsPlaybackSessionResponse, type AbsPlaybackSessionSyncRequest, type AbsServer } from './server-audiobookshelf-types';
export * from './server-audiobookshelf-types';
export declare const absLogin: (fetcher: SamoFetch, url: string, body: {
    password: string;
    username: string;
}) => Promise<AbsLoginResponse>;
export declare const absGetLibraries: (fetcher: SamoFetch, server: AbsServer) => Promise<AbsLibrariesResponse>;
export declare const absGetLibraryItems: (fetcher: SamoFetch, server: AbsServer, libraryId: string) => Promise<AbsLibraryItemsResponse>;
export declare const absGetItem: (fetcher: SamoFetch, server: AbsServer, itemId: string) => Promise<AbsLibraryItem>;
export declare const absPlayItem: (fetcher: SamoFetch, server: AbsServer, itemId: string, episodeId?: string) => Promise<AbsPlaybackSessionResponse>;
export declare const absSyncPlaybackSession: (fetcher: SamoFetch, server: AbsServer, sessionId: string, body: AbsPlaybackSessionSyncRequest) => Promise<void>;
export declare const absClosePlaybackSession: (fetcher: SamoFetch, server: AbsServer, sessionId: string, body: AbsPlaybackSessionSyncRequest) => Promise<void>;
export declare const absGetItemCoverDataUrl: (fetcher: SamoFetch, server: AbsServer, itemId: string) => Promise<string | undefined>;
export declare const getAbsFetch: (fetcher?: SamoFetch) => SamoFetch;
