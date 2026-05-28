import {
    ensureSamoStreamToken,
    getCachedSamoStreamToken,
    getSamoAudiobookStreamUrl,
    getSamoPodcastEpisodeStreamUrl,
    listSamoAudiobooks,
    listSamoPodcastEpisodes,
    listSamoPodcasts,
    resolveSamoAudiobookArtworkUrl,
    resolveSamoPodcastArtworkUrl,
    type SamoAudiobook,
    type SamoPodcast,
    type SamoPodcastEpisode,
    ServerType,
} from '@samo/core/server';

import { samoExtras } from '/@/renderer/api/samo/samo-controller';
import { samoFetch } from '/@/renderer/api/samo/samo-fetch';
import { useLongFormMediaServer } from '/@/renderer/store';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';
import {
    AudiobookshelfChapter,
    AudiobookshelfLibraryItem,
    AudiobookshelfPodcastEpisode,
} from '/@/shared/api/audiobookshelf/audiobookshelf-types';

const browserFetch = samoFetch;

export const SAMO_LONG_FORM_SOURCE = 'samo-long-form' as const;

export type SamoBackedLibraryItem = AudiobookshelfLibraryItem & {
    samoSource?: typeof SAMO_LONG_FORM_SOURCE;
};

const samoAuth = (server: ServerListItemWithCredential) => ({
    credential: server.credential,
    ndCredential: server.ndCredential,
    type: ServerType.SAMO as const,
    url: server.url,
});

const ensureStreamToken = async (server: ServerListItemWithCredential) => {
    const auth = samoAuth(server);
    try {
        return (await ensureSamoStreamToken(auth, browserFetch)) ?? getCachedSamoStreamToken(auth);
    } catch {
        return getCachedSamoStreamToken(auth);
    }
};

const samoItemsOf = <T>(response: { items?: T[] } | T[] | undefined): T[] => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    return response.items ?? [];
};

const publishedYear = (value?: number | string) => {
    if (value === undefined || value === null || value === '') return undefined;
    return String(value);
};

const toAbsChapters = (chapters: SamoAudiobook['chapters']): AudiobookshelfChapter[] =>
    (chapters ?? []).map((chapter, index) => ({
        id: chapter.id ?? String(index),
        start: chapter.startSeconds ?? 0,
        title: chapter.title,
    }));

export const isSamoLongFormServer = (server: ServerListItemWithCredential | null | undefined) =>
    server?.type === ServerType.SAMO;

export { useLongFormMediaServer };

export const isSamoBackedLibraryItem = (
    item: AudiobookshelfLibraryItem | null | undefined,
): item is SamoBackedLibraryItem =>
    Boolean(item && (item as SamoBackedLibraryItem).samoSource === SAMO_LONG_FORM_SOURCE);

export const samoAudiobookToLibraryItem = (
    audiobook: SamoAudiobook,
    artworkUrl?: string,
): SamoBackedLibraryItem => {
    const authors =
        audiobook.book?.authors?.map((author) => author.name).filter(Boolean).join(', ') ?? '';
    const narrators =
        audiobook.book?.narrators?.map((person) => person.name).filter(Boolean).join(', ') ?? '';

    return {
        id: audiobook.id,
        libraryId: audiobook.libraryId ?? 'samo-audiobooks',
        media: {
            authorName: authors,
            authors: audiobook.book?.authors?.map((author) => ({ name: author.name ?? '' })),
            chapters: toAbsChapters(audiobook.chapters),
            duration: audiobook.durationSeconds,
            metadata: {
                author: authors,
                authorName: authors,
                imageUrl: artworkUrl,
                narratorName: narrators,
                narrators: narrators ? narrators.split(', ') : undefined,
                publishedYear: publishedYear(audiobook.book?.publishedYear),
                publisher: audiobook.book?.publisher,
                subtitle: audiobook.book?.subtitle,
                title: audiobook.book?.title ?? 'Untitled audiobook',
            },
            narratorName: narrators,
            publishedYear: publishedYear(audiobook.book?.publishedYear),
            publisher: audiobook.book?.publisher,
            subtitle: audiobook.book?.subtitle,
            title: audiobook.book?.title ?? 'Untitled audiobook',
        },
        mediaType: 'book',
        name: audiobook.book?.title ?? 'Untitled audiobook',
        samoSource: SAMO_LONG_FORM_SOURCE,
    };
};

export const samoPodcastEpisodeToAbsEpisode = (
    episode: SamoPodcastEpisode,
): AudiobookshelfPodcastEpisode => ({
    audioFile: {
        duration: episode.duration,
        mimeType: episode.enclosureType ?? episode.audioFiles?.[0]?.mimeType,
    },
    description: episode.description,
    duration: episode.duration,
    id: episode.id,
    publishedAt: episode.publishedAt ? Date.parse(episode.publishedAt) : undefined,
    subtitle: episode.subtitle,
    title: episode.title ?? episode.name ?? 'Untitled episode',
});

export const samoPodcastToLibraryItem = (
    podcast: SamoPodcast,
    episodes: SamoPodcastEpisode[],
    artworkUrl?: string,
): SamoBackedLibraryItem => {
    const show = podcast.podcast;
    const author = show?.author ?? show?.ownerName ?? '';

    return {
        id: podcast.id,
        libraryId: podcast.libraryId ?? 'samo-podcasts',
        media: {
            episodes: episodes.map(samoPodcastEpisodeToAbsEpisode),
            metadata: {
                author,
                authorName: author,
                description: show?.description,
                imageUrl: artworkUrl,
                title: show?.title ?? 'Untitled podcast',
            },
            title: show?.title ?? 'Untitled podcast',
        },
        mediaType: 'podcast',
        name: show?.title ?? 'Untitled podcast',
        numEpisodes: show?.episodeCount ?? episodes.length,
        samoSource: SAMO_LONG_FORM_SOURCE,
    };
};

export const listSamoAudiobookLibraryItems = async (
    server: ServerListItemWithCredential,
): Promise<SamoBackedLibraryItem[]> => {
    const auth = samoAuth(server);
    const streamToken = await ensureStreamToken(server);
    const response = await listSamoAudiobooks(browserFetch, auth, { limit: 500 });
    return samoItemsOf(response).map((audiobook) =>
        samoAudiobookToLibraryItem(
            audiobook,
            resolveSamoAudiobookArtworkUrl(auth, audiobook, streamToken),
        ),
    );
};

export const listSamoPodcastLibraryItems = async (
    server: ServerListItemWithCredential,
): Promise<SamoBackedLibraryItem[]> => {
    const auth = samoAuth(server);
    const streamToken = await ensureStreamToken(server);
    const response = await listSamoPodcasts(browserFetch, auth, { limit: 500 });
    const shows = samoItemsOf(response);

    return Promise.all(
        shows.map(async (show) => {
            const episodesResponse = await listSamoPodcastEpisodes(browserFetch, auth, show.id, {
                limit: 500,
            });
            return samoPodcastToLibraryItem(
                show,
                samoItemsOf(episodesResponse),
                resolveSamoPodcastArtworkUrl(auth, show, streamToken),
            );
        }),
    );
};

export const loadSamoPodcastLibraryItem = async (
    server: ServerListItemWithCredential,
    showId: string,
): Promise<SamoBackedLibraryItem> => {
    const auth = samoAuth(server);
    const streamToken = await ensureStreamToken(server);
    const [show, episodesResponse] = await Promise.all([
        samoExtras.getPodcastShow(server, showId),
        samoExtras.getPodcastEpisodes(server, showId),
    ]);
    return samoPodcastToLibraryItem(
        show,
        samoItemsOf(episodesResponse),
        resolveSamoPodcastArtworkUrl(auth, show, streamToken),
    );
};

export const resolveSamoAudiobookPlaySession = async (
    server: ServerListItemWithCredential,
    item: AudiobookshelfLibraryItem,
) => {
    const auth = samoAuth(server);
    const streamToken = await ensureStreamToken(server);
    const audiobook = await samoExtras.getAudiobook(server, item.id);
    const progressSeconds = audiobook.progress?.progressSeconds;
    const contentUrl = getSamoAudiobookStreamUrl(auth, audiobook.id, {
        progressSeconds,
        streamToken,
    });
    const duration = audiobook.durationSeconds ?? item.media?.duration ?? 0;
    const chapters = toAbsChapters(audiobook.chapters);

    return {
        contentUrl,
        duration,
        item: samoAudiobookToLibraryItem(
            audiobook,
            resolveSamoAudiobookArtworkUrl(auth, audiobook, streamToken),
        ),
        patch: { chapters },
        position: progressSeconds ?? 0,
        sessionId: null,
    };
};

export const resolveSamoPodcastPlaySession = async (
    server: ServerListItemWithCredential,
    item: AudiobookshelfLibraryItem,
    episode: AudiobookshelfPodcastEpisode,
) => {
    const auth = samoAuth(server);
    const streamToken = await ensureStreamToken(server);
    const loaded = await loadSamoPodcastLibraryItem(server, item.id);
    const episodesResponse = await samoExtras.getPodcastEpisodes(server, item.id);
    const samoEpisode = samoItemsOf(episodesResponse).find((entry) => entry.id === episode.id);
    const progressSeconds = samoEpisode?.playback?.progressSeconds;
    const contentUrl = getSamoPodcastEpisodeStreamUrl(auth, episode.id, {
        offsetSeconds: progressSeconds,
        streamToken,
    });

    const resolvedEpisode =
        loaded.media?.episodes?.find((entry) => entry.id === episode.id) ?? episode;
    const duration =
        resolvedEpisode.duration ?? resolvedEpisode.audioFile?.duration ?? item.media?.duration ?? 0;

    return {
        contentUrl,
        duration,
        episode: resolvedEpisode,
        item: loaded,
        position: progressSeconds ?? 0,
        sessionId: null,
    };
};
