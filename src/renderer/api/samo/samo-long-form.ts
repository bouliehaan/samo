import { buildMobilePodcastFeedEpisodes } from '@samo/core/mobile';
import {
    collectSamoPages,
    ensureSamoStreamToken,
    getCachedSamoStreamToken,
    getSamoAudiobookStreamUrl,
    getSamoPodcastEpisodeStreamUrl,
    listSamoAllPodcastEpisodes,
    listSamoAudiobooks,
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
import { clampPosition } from '/@/renderer/store/audiobook-resume-math';
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

    const progress = audiobook.progress;

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
        // Server-side per-user progress, carried so callers that only have a
        // library item (the launch session restore) can seed the playhead from
        // the SERVER rather than from this machine's last-known position — that
        // local value is stale the moment you listen on another device.
        mediaProgress: progress
            ? {
                  currentTime: progress.progressSeconds,
                  duration: audiobook.durationSeconds,
                  isFinished: progress.completed,
              }
            : undefined,
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

/**
 * Page size for long-form library listings. The ceilings below are runaway
 * guards against a server reporting a nonsense total — not product limits.
 * Every one of these lists used to be a single `limit: 500` request, which
 * silently truncated: library item 501 simply did not exist as far as the app
 * was concerned, with no error and no indication anything was missing.
 */
const LONG_FORM_PAGE_SIZE = 500;
const LONG_FORM_LIBRARY_CEILING = 50_000;
const PODCAST_EPISODE_CEILING = 20_000;

export const listSamoAudiobookLibraryItems = async (
    server: ServerListItemWithCredential,
): Promise<SamoBackedLibraryItem[]> => {
    const auth = samoAuth(server);
    const audiobooks = await collectSamoPages(
        LONG_FORM_PAGE_SIZE,
        LONG_FORM_LIBRARY_CEILING,
        (offset) => listSamoAudiobooks(browserFetch, auth, { limit: LONG_FORM_PAGE_SIZE, offset }),
    );
    return audiobooks.map((audiobook) =>
        samoAudiobookToLibraryItem(audiobook, resolveSamoAudiobookArtworkUrl(auth, audiobook)),
    );
};

/** Every episode of one show, across as many pages as the show has. */
const listAllSamoPodcastEpisodes = async (
    server: ServerListItemWithCredential,
    showId: string,
): Promise<SamoPodcastEpisode[]> =>
    collectSamoPages(LONG_FORM_PAGE_SIZE, PODCAST_EPISODE_CEILING, (offset) =>
        samoExtras.getPodcastEpisodes(server, showId, { limit: LONG_FORM_PAGE_SIZE, offset }),
    );

export const listSamoPodcastLibraryItems = async (
    server: ServerListItemWithCredential,
    options?: { includeEpisodes?: boolean },
): Promise<SamoBackedLibraryItem[]> => {
    const auth = samoAuth(server);
    const shows = await collectSamoPages(LONG_FORM_PAGE_SIZE, LONG_FORM_LIBRARY_CEILING, (offset) =>
        listSamoPodcasts(browserFetch, auth, { limit: LONG_FORM_PAGE_SIZE, offset }),
    );

    // The Podcasts grid and sidebar only render show summaries (cover, title,
    // author, episode count). Fetching every show's full episode list here was
    // an N+1 — the page blocked on one request PER show (each up to 500
    // episodes) before first paint, which is the "super slow podcast loading".
    // Episode count comes from the show summary (`episodeCount`), so the list
    // needs no episodes at all. Detail pages load episodes on demand via
    // `loadSamoPodcastLibraryItem`; only callers that match against episode
    // titles (unified search) opt back into the per-show fetch.
    if (!options?.includeEpisodes) {
        return shows.map((show) =>
            samoPodcastToLibraryItem(show, [], resolveSamoPodcastArtworkUrl(auth, show)),
        );
    }

    return Promise.all(
        shows.map(async (show) =>
            samoPodcastToLibraryItem(
                show,
                await listAllSamoPodcastEpisodes(server, show.id),
                resolveSamoPodcastArtworkUrl(auth, show),
            ),
        ),
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
    const response = await listSamoAllPodcastEpisodes(browserFetch, auth, {
        limit: 300,
        signal,
    });
    const episodes = buildMobilePodcastFeedEpisodes(samoItemsOf(response));

    return episodes.map((episode) => ({
        artworkUrl: resolveSamoPodcastEpisodeArtworkUrl(auth, episode),
        episode,
    }));
};

export const loadSamoPodcastLibraryItem = async (
    server: ServerListItemWithCredential,
    showId: string,
): Promise<SamoBackedLibraryItem> => {
    const auth = samoAuth(server);
    const [show, episodes] = await Promise.all([
        samoExtras.getPodcastShow(server, showId),
        listAllSamoPodcastEpisodes(server, showId),
    ]);
    return samoPodcastToLibraryItem(show, episodes, resolveSamoPodcastArtworkUrl(auth, show));
};

/**
 * One audiobook, by id. The list endpoint already carries chapters, but a
 * detail page opened straight from a deep link, the sidebar or search has no
 * list in hand — and refetching the whole library to render one book would be
 * absurd.
 */
export const loadSamoAudiobookLibraryItem = async (
    server: ServerListItemWithCredential,
    audiobookId: string,
): Promise<SamoBackedLibraryItem> => {
    const auth = samoAuth(server);
    const audiobook = await samoExtras.getAudiobook(server, audiobookId);
    return samoAudiobookToLibraryItem(audiobook, resolveSamoAudiobookArtworkUrl(auth, audiobook));
};

export const resolveSamoAudiobookPlaySession = async (
    server: ServerListItemWithCredential,
    item: LongFormLibraryItem,
    /**
     * Explicit start point, in book-global seconds — used when the listener
     * picked a chapter rather than pressing Play. Without it the session starts
     * from the listener's saved server-side progress.
     *
     * This is resolved here, in the same request that picks which file to
     * stream, so a chapter deep in the book opens the right file immediately.
     * Starting playback and then seeking would load the wrong file first and
     * race the seek against the load.
     */
    startSeconds?: number,
) => {
    const auth = samoAuth(server);
    const streamToken = await ensureStreamToken(server);
    const audiobook = await samoExtras.getAudiobook(server, item.id);
    const duration = audiobook.durationSeconds ?? item.media?.duration ?? 0;
    const savedProgress = audiobook.progress?.progressSeconds ?? 0;
    // An explicitly chosen chapter is never "near the end, so restart" — it is
    // exactly where the listener asked to be, so it is only clamped in range.
    const progressSeconds =
        typeof startSeconds === 'number' && Number.isFinite(startSeconds)
            ? clampPosition(startSeconds, duration)
            : savedProgress;
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
        // Artwork stays token-free even here, where the stream URL above needs a
        // token: mpv fetches the audio in its own process, but the cover goes to
        // an <img> that the main process authenticates by header.
        item: samoAudiobookToLibraryItem(
            audiobook,
            resolveSamoAudiobookArtworkUrl(auth, audiobook),
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
