import { queryOptions } from '@tanstack/react-query';

import {
    listSamoAudiobookLibraryItems,
    listSamoPodcastLibraryItems,
    loadSamoAudiobookLibraryItem,
    loadSamoPodcastLibraryItem,
    type SamoBackedLibraryItem,
} from '/@/renderer/api/samo/samo-long-form';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

/**
 * A long-form library is a whole-library fetch, so it is cached for a while and
 * kept around well past the last screen that used it — bouncing Home → sidebar →
 * Audiobooks should not re-download the library each time.
 */
const LONG_FORM_STALE_TIME_MS = 1000 * 60 * 5;
const LONG_FORM_GC_TIME_MS = 1000 * 60 * 30;

/**
 * Every long-form cache key in one place.
 *
 * These used to be hand-rolled at each call site, and the same
 * `listSamoAudiobookLibraryItems(server)` call sat under three different keys —
 * `['samo','home','audiobooks',id]`, `['samo','sidebar','audiobooks',id]` and
 * `['samo','audiobooks',id]` — so Home, the sidebar and the Audiobooks page each
 * downloaded the entire library separately. Keys derived in one place instead of
 * per-screen means one fetch feeds every screen, and an invalidation written
 * against a key actually matches the query it is meant to refresh.
 */
export const longFormKeys = {
    audiobookDetail: (serverId: string | undefined, audiobookId: string | undefined) =>
        ['samo', 'long-form', serverId, 'audiobook', audiobookId] as const,
    audiobooks: (serverId: string | undefined) =>
        ['samo', 'long-form', serverId, 'audiobooks'] as const,
    podcastDetail: (serverId: string | undefined, showId: string | undefined) =>
        ['samo', 'long-form', serverId, 'podcast', showId] as const,
    podcasts: (serverId: string | undefined) =>
        ['samo', 'long-form', serverId, 'podcasts'] as const,
    /**
     * Shows *with* every show's episodes — a genuine N+1 that only unified
     * search needs (it ranks individual episode titles). Kept under its own key
     * so the cheap show-summary list above is never evicted or blocked by it.
     */
    podcastsWithEpisodes: (serverId: string | undefined) =>
        ['samo', 'long-form', serverId, 'podcasts', 'with-episodes'] as const,
};

export const longFormQueries = {
    audiobookDetail: (server: null | ServerListItemWithCredential | undefined, id: string) =>
        queryOptions({
            enabled: Boolean(server?.id && id),
            gcTime: LONG_FORM_GC_TIME_MS,
            queryFn: () => loadSamoAudiobookLibraryItem(server!, id),
            queryKey: longFormKeys.audiobookDetail(server?.id, id),
            staleTime: LONG_FORM_STALE_TIME_MS,
        }),

    audiobooks: (server: null | ServerListItemWithCredential | undefined) =>
        queryOptions({
            enabled: Boolean(server?.id),
            gcTime: LONG_FORM_GC_TIME_MS,
            queryFn: (): Promise<SamoBackedLibraryItem[]> => listSamoAudiobookLibraryItems(server!),
            queryKey: longFormKeys.audiobooks(server?.id),
            staleTime: LONG_FORM_STALE_TIME_MS,
        }),

    podcastDetail: (server: null | ServerListItemWithCredential | undefined, showId: string) =>
        queryOptions({
            enabled: Boolean(server?.id && showId),
            gcTime: LONG_FORM_GC_TIME_MS,
            queryFn: () => loadSamoPodcastLibraryItem(server!, showId),
            queryKey: longFormKeys.podcastDetail(server?.id, showId),
            staleTime: LONG_FORM_STALE_TIME_MS,
        }),

    podcasts: (server: null | ServerListItemWithCredential | undefined) =>
        queryOptions({
            enabled: Boolean(server?.id),
            gcTime: LONG_FORM_GC_TIME_MS,
            queryFn: (): Promise<SamoBackedLibraryItem[]> => listSamoPodcastLibraryItems(server!),
            queryKey: longFormKeys.podcasts(server?.id),
            staleTime: LONG_FORM_STALE_TIME_MS,
        }),

    podcastsWithEpisodes: (server: null | ServerListItemWithCredential | undefined) =>
        queryOptions({
            enabled: Boolean(server?.id),
            gcTime: LONG_FORM_GC_TIME_MS,
            queryFn: (): Promise<SamoBackedLibraryItem[]> =>
                listSamoPodcastLibraryItems(server!, { includeEpisodes: true }),
            queryKey: longFormKeys.podcastsWithEpisodes(server?.id),
            staleTime: LONG_FORM_STALE_TIME_MS,
        }),
};
