import { buildMobilePodcastFeedEpisodes } from '@samo/core/mobile';
import {
    ensureSamoStreamToken,
    getCachedSamoStreamToken,
    getSamoAudiobookStreamUrl,
    getSamoPodcastEpisodeStreamUrl,
    listSamoAllPodcastEpisodes,
    listSamoAudiobooks,
    listSamoPodcastEpisodes,
    listSamoPodcasts,
    resolveSamoAudiobookArtworkUrl,
    resolveSamoPodcastArtworkUrl,
    resolveSamoPodcastEpisodeArtworkUrl,
    type SamoAudiobook,
    samoItemsOf,
    type SamoPodcast,
    type SamoPodcastEpisode,
    ServerType,
} from '@samo/core/server';

import {
    buildSamoAudiobookFileUrl,
    pickSamoAudiobookFileIndex,
    samoAudiobookFileSegments,
} from '/@/renderer/api/samo/samo-audiobook-stream';
import { samoExtras } from '/@/renderer/api/samo/samo-controller';
import { samoFetch } from '/@/renderer/api/samo/samo-fetch';
import { useLongFormMediaServer } from '/@/renderer/store';
import {
    LongFormChapter,
    LongFormLibraryItem,
    LongFormPodcastEpisode,
} from '/@/shared/api/long-form-types';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

const browserFetch = samoFetch;

export const SAMO_LONG_FORM_SOURCE = 'samo-long-form' as const;

export type SamoBackedLibraryItem = LongFormLibraryItem & {
    samoPath?: string;
    samoRssFeed?: { feedUrl?: string; id: string };
    samoSource?: typeof SAMO_LONG_FORM_SOURCE;
};

const samoAuth = (server: ServerListItemWithCredential) => ({
    credential: server.credential,
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

const publishedYear = (value?: number | string) => {
    if (value === undefined || value === null || value === '') return undefined;
    return String(value);
};

const toAbsChapters = (chapters: SamoAudiobook['chapters']): LongFormChapter[] =>
    (chapters ?? []).map((chapter, index) => ({
        id: chapter.id ?? String(index),
        start: chapter.startSeconds ?? 0,
        title: chapter.title,
    }));

export const isSamoLongFormServer = (server: null | ServerListItemWithCredential | undefined) =>
    server?.type === ServerType.SAMO;

export { useLongFormMediaServer };

export const isSamoBackedLibraryItem = (
    item: LongFormLibraryItem | null | undefined,
): item is SamoBackedLibraryItem =>
    Boolean(item && (item as SamoBackedLibraryItem).samoSource === SAMO_LONG_FORM_SOURCE);

export const samoAudiobookToLibraryItem = (
    audiobook: SamoAudiobook,
    artworkUrl?: string,
): SamoBackedLibraryItem => {
    const authors =
        audiobook.book?.authors
            ?.map((author) => author.name)
            .filter(Boolean)
            .join(', ') ?? '';
    const narrators =
        audiobook.book?.narrators
            ?.map((person) => person.name)
            .filter(Boolean)
            .join(', ') ?? '';

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
): LongFormPodcastEpisode => {
    const progress = episode.progress ?? episode.playback;
    const progressSeconds = progress?.progressSeconds;

    return {
        audioFile: {
            duration: episode.duration,
            mimeType: episode.enclosureType ?? episode.audioFiles?.[0]?.mimeType,
        },
        completed: progress?.completed,
        description: episode.description,
        duration: episode.duration,
        id: episode.id,
        progressSeconds,
        publishedAt: episode.publishedAt ? Date.parse(episode.publishedAt) : undefined,
        subtitle: episode.subtitle,
        title: episode.title ?? episode.name ?? 'Untitled episode',
    };
};

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
        samoPath: podcast.path,
        samoRssFeed: podcast.rssFeed?.id
            ? { feedUrl: podcast.rssFeed.feedUrl, id: podcast.rssFeed.id }
            : undefined,
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

export type SamoPodcastFeedEntry = {
    artworkUrl?: string;
    episode: SamoPodcastEpisode;
};

export const fetchSamoHomePodcastFeed = async (
    server: ServerListItemWithCredential,
    signal?: AbortSignal,
): Promise<SamoPodcastFeedEntry[]> => {
    const auth = samoAuth(server);
    const streamToken = await ensureStreamToken(server);
    const response = await listSamoAllPodcastEpisodes(browserFetch, auth, {
        limit: 300,
        signal,
    });
    const episodes = buildMobilePodcastFeedEpisodes(samoItemsOf(response));

    return episodes.map((episode) => ({
        artworkUrl: resolveSamoPodcastEpisodeArtworkUrl(auth, episode, streamToken),
        episode,
    }));
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
    item: LongFormLibraryItem,
) => {
    const auth = samoAuth(server);
    const streamToken = await ensureStreamToken(server);
    const audiobook = await samoExtras.getAudiobook(server, item.id);
    const progressSeconds = audiobook.progress?.progressSeconds ?? 0;
    const duration = audiobook.durationSeconds ?? item.media?.duration ?? 0;
    const chapters = toAbsChapters(audiobook.chapters);

    // File-aware playback: the server now serves each file WHOLE, so start at the
    // file that contains the resume point and stream that file via mediaFileId.
    // The web player switches files (and seeks locally) for any cross-file seek —
    // no byte-offset stream restarts, so backward seeks always work.
    const files = samoAudiobookFileSegments(audiobook);
    const startIndex = pickSamoAudiobookFileIndex(files, progressSeconds);
    const startFile = files[startIndex];
    const contentUrl = startFile
        ? buildSamoAudiobookFileUrl(server, audiobook.id, startFile.mediaFileId, streamToken)
        : getSamoAudiobookStreamUrl(auth, audiobook.id, { streamToken });

    return {
        contentUrl,
        duration,
        item: samoAudiobookToLibraryItem(
            audiobook,
            resolveSamoAudiobookArtworkUrl(auth, audiobook, streamToken),
        ),
        patch: {
            audiobookFiles: files,
            chapters,
            streamOffsetSeconds: startFile?.startOffsetSeconds ?? 0,
        },
        position: progressSeconds,
        sessionId: null,
    };
};

export const resolveSamoPodcastPlaySession = async (
    server: ServerListItemWithCredential,
    item: LongFormLibraryItem,
    episode: LongFormPodcastEpisode,
) => {
    const auth = samoAuth(server);
    const streamToken = await ensureStreamToken(server);
    const loaded = await loadSamoPodcastLibraryItem(server, item.id);
    const episodesResponse = await samoExtras.getPodcastEpisodes(server, item.id);
    const samoEpisode = samoItemsOf(episodesResponse).find((entry) => entry.id === episode.id);
    const progressSeconds =
        samoEpisode?.progress?.progressSeconds ?? samoEpisode?.playback?.progressSeconds;
    const resume = Math.max(0, Math.floor(progressSeconds ?? 0));
    const contentUrl = getSamoPodcastEpisodeStreamUrl(auth, episode.id, {
        ...(resume > 0 ? { offsetSeconds: resume } : {}),
        streamToken,
    });

    const resolvedEpisode =
        loaded.media?.episodes?.find((entry) => entry.id === episode.id) ?? episode;
    const duration =
        resolvedEpisode.duration ??
        resolvedEpisode.audioFile?.duration ??
        item.media?.duration ??
        0;

    return {
        contentUrl,
        duration,
        episode: resolvedEpisode,
        item: loaded,
        position: progressSeconds ?? 0,
        sessionId: null,
    };
};
