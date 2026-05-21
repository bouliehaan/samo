import { QueryClient } from '@tanstack/react-query';
interface OptimizedListCountOptions<TQuery, TListQuery, TResponse> {
    client: QueryClient;
    listQueryFn: (args: {
        apiClientProps: {
            serverId: string;
            signal?: AbortSignal;
        };
        query: TListQuery;
    }) => Promise<TResponse>;
    listQueryKeyFn: (serverId: string, query: TListQuery) => readonly unknown[];
    query: TQuery;
    serverId: string;
    signal?: AbortSignal;
}
export declare const getOptimizedListCount: <TQuery, TListQuery extends {
    limit?: number;
    startIndex?: number;
}, TResponse extends {
    totalRecordCount: null | number;
}>({ client, listQueryFn, listQueryKeyFn, query, serverId, signal, }: OptimizedListCountOptions<TQuery, TListQuery, TResponse>) => Promise<null | number>;
export {};
