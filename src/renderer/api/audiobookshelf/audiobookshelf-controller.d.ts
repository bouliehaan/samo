import { AudiobookshelfLibrariesResponse, AudiobookshelfLibraryItem, AudiobookshelfLibraryItemsResponse, AudiobookshelfPlaybackSessionResponse, AudiobookshelfPlaybackSessionSyncRequest } from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { AuthenticationResponse, ServerListItemWithCredential } from '/@/shared/types/domain-types';
export declare const audiobookshelfController: {
    authenticate: (url: string, body: {
        password: string;
        username: string;
    }) => Promise<AuthenticationResponse>;
    closePlaybackSession: (server: ServerListItemWithCredential, sessionId: string, body: AudiobookshelfPlaybackSessionSyncRequest) => Promise<void>;
    getItem: (server: ServerListItemWithCredential, itemId: string) => Promise<AudiobookshelfLibraryItem>;
    getItemCoverDataUrl: (server: ServerListItemWithCredential, itemId: string) => Promise<string | undefined>;
    getLibraries: (server: ServerListItemWithCredential) => Promise<AudiobookshelfLibrariesResponse>;
    getLibraryItems: (server: ServerListItemWithCredential, libraryId: string) => Promise<AudiobookshelfLibraryItemsResponse>;
    playItem: (server: ServerListItemWithCredential, itemId: string, episodeId?: string) => Promise<AudiobookshelfPlaybackSessionResponse>;
    syncPlaybackSession: (server: ServerListItemWithCredential, sessionId: string, body: AudiobookshelfPlaybackSessionSyncRequest) => Promise<void>;
};
