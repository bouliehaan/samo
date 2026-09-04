export interface LongFormChapter {
    end?: number;
    id?: string;
    start: number;
    title?: string;
}

export interface LongFormLibraryItem {
    id: string;
    libraryId: string;
    media?: {
        authorName?: string;
        authors?: Array<{ id?: string; name: string }>;
        chapters?: LongFormChapter[];
        coverPath?: string;
        description?: string;
        duration?: number;
        episodes?: LongFormPodcastEpisode[];
        explicit?: boolean;
        metadata?: LongFormMetadata;
        narratorName?: string;
        publishedYear?: string;
        publisher?: string;
        subtitle?: string;
        title?: string;
    };
    mediaProgress?: LongFormMediaProgress;
    mediaType?: string;
    name?: string;
    numEpisodes?: number;
    size?: number;
    updatedAt?: number;
}

export interface LongFormMediaProgress {
    currentTime?: number;
    duration?: number;
    finishedAt?: number;
    isFinished?: boolean;
    lastUpdate?: number;
    progress?: number;
    startedAt?: number;
    updatedAt?: number;
}

export interface LongFormMetadata {
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

export interface LongFormPodcastEpisode {
    audioFile?: {
        duration?: number;
        mimeType?: string;
    };
    /** samo per-user completion (wire field from server progress overlay). */
    completed?: boolean;
    description?: string;
    duration?: number;
    id: string;
    index?: number;
    progressSeconds?: number;
    publishedAt?: number;
    season?: string;
    subtitle?: string;
    title?: string;
}
