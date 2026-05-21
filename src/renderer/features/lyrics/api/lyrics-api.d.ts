import { QueryHookArgs } from '/@/renderer/lib/react-query';
import { FullLyricsMetadata, LyricGetQuery, LyricSearchQuery, LyricSource, LyricsQuery, LyricsResponse, QueueSong, Song, StructuredLyric, SynchronizedLyricsArray } from '/@/shared/types/domain-types';
export type LyricsQueryResult = {
    local: FullLyricsMetadata | null | StructuredLyric[];
    remoteAuto: FullLyricsMetadata | null;
};
export declare const formatLyricsForDisplay: (lyrics: string) => string | SynchronizedLyricsArray;
export declare const fetchRemoteLyricsById: (params: {
    remoteSongId: string;
    remoteSource: LyricSource;
    song?: QueueSong | Song;
}) => Promise<LyricsResponse | null>;
export declare const clearLyricsCacheForSong: (song: QueueSong | Song) => Promise<void>;
export declare const lyricsQueries: {
    search: (args: Omit<QueryHookArgs<LyricSearchQuery>, "serverId">) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<any, Error, any, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<any, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: any;
            [dataTagErrorSymbol]: Error;
        };
    };
    songLyrics: (args: QueryHookArgs<LyricsQuery>, song: QueueSong | undefined) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<LyricsQueryResult, Error, LyricsQueryResult, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<LyricsQueryResult, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: LyricsQueryResult;
            [dataTagErrorSymbol]: Error;
        };
    };
    songLyricsByRemoteId: (args: QueryHookArgs<Partial<LyricGetQuery>>) => import("@tanstack/query-core").OmitKeyof<import("@tanstack/react-query").UseQueryOptions<LyricsResponse | null, Error, LyricsResponse | null, readonly unknown[]>, "queryFn"> & {
        queryFn?: import("@tanstack/query-core").QueryFunction<LyricsResponse | null, readonly unknown[], never> | undefined;
    } & {
        queryKey: readonly unknown[] & {
            [dataTagSymbol]: LyricsResponse | null;
            [dataTagErrorSymbol]: Error;
        };
    };
};
