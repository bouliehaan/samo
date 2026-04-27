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
        coverPath?: string;
        description?: string;
        duration?: number;
        episodes?: AudiobookshelfPodcastEpisode[];
        explicit?: boolean;
        narratorName?: string;
        publishedYear?: string;
        publisher?: string;
        subtitle?: string;
        title?: string;
    };
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
