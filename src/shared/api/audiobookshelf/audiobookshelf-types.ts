export interface AudiobookshelfChapter {
    end?: number;
    id?: string;
    start: number;
    title?: string;
}

export interface AudiobookshelfLibrariesResponse {
    libraries: AudiobookshelfLibrary[];
}

export interface AudiobookshelfLibrary {
    id: string;
    mediaType: 'book' | 'podcast' | string;
    name: string;
}

export interface AudiobookshelfLibraryItem {
    id: string;
    libraryId: string;
    media?: {
        authorName?: string;
        authors?: Array<{ id?: string; name: string }>;
        chapters?: AudiobookshelfChapter[];
        coverPath?: string;
        description?: string;
        duration?: number;
        episodes?: AudiobookshelfPodcastEpisode[];
        explicit?: boolean;
        metadata?: AudiobookshelfMetadata;
        narratorName?: string;
        publishedYear?: string;
        publisher?: string;
        subtitle?: string;
        title?: string;
    };
    mediaProgress?: AudiobookshelfMediaProgress;
    mediaType?: string;
    name?: string;
    numEpisodes?: number;
    size?: number;
    updatedAt?: number;
}

export interface AudiobookshelfLibraryItemsResponse {
    results: AudiobookshelfLibraryItem[];
    total?: number;
}

export interface AudiobookshelfLoginResponse {
    user: {
        id: string;
        token: string;
        type?: string;
        username: string;
    };
}

export interface AudiobookshelfMediaProgress {
    currentTime?: number;
    duration?: number;
    finishedAt?: number;
    isFinished?: boolean;
    lastUpdate?: number;
    progress?: number;
    startedAt?: number;
    updatedAt?: number;
}

export interface AudiobookshelfMetadata {
    author?: string;
    authorName?: string;
    authors?: Array<{ id?: string; name: string }>;
    description?: string;
    explicit?: boolean;
    genres?: string[];
    imageUrl?: string;
    narratorName?: string;
    narrators?: string[];
    publishedYear?: string;
    publisher?: string;
    subtitle?: string;
    title?: string;
}

export interface AudiobookshelfPlaybackAudioTrack {
    contentUrl?: string;
    index?: number;
    mimeType?: string;
}

export interface AudiobookshelfPlaybackSessionResponse {
    audioTracks?: AudiobookshelfPlaybackAudioTrack[];
    // Server-side resume position in seconds.
    currentTime?: number;
    id?: string;
    libraryItem?: AudiobookshelfLibraryItem;
    libraryItemId?: string;
}

export interface AudiobookshelfPlaybackSessionSyncRequest {
    currentTime: number;
    duration: number;
    timeListened: number;
}

export interface AudiobookshelfPodcastEpisode {
    audioFile?: {
        duration?: number;
        mimeType?: string;
    };
    description?: string;
    duration?: number;
    id: string;
    index?: number;
    publishedAt?: number;
    season?: string;
    subtitle?: string;
    title?: string;
}
