export interface AbsServer {
    credential: string;
    url: string;
}

export interface AbsLoginResponse {
    user: {
        id: string;
        token: string;
        type?: string;
        username: string;
    };
}

export interface AbsLibrariesResponse {
    libraries: Array<{
        id: string;
        mediaType: string;
        name: string;
    }>;
}

export interface AbsLibraryItem {
    id: string;
    libraryId: string;
    media?: Record<string, unknown>;
    mediaProgress?: Record<string, unknown>;
    mediaType?: string;
    name?: string;
}

export interface AbsLibraryItemsResponse {
    results: AbsLibraryItem[];
    total?: number;
}

export interface AbsPlaybackAudioTrack {
    contentUrl?: string;
    index?: number;
    mimeType?: string;
}

export interface AbsPlaybackSessionResponse {
    audioTracks?: AbsPlaybackAudioTrack[];
    currentTime?: number;
    id?: string;
    libraryItem?: AbsLibraryItem;
    libraryItemId?: string;
}

export interface AbsPlaybackSessionSyncRequest {
    currentTime: number;
    duration: number;
    timeListened: number;
}
