import { QueryFunctionContext } from '@tanstack/react-query';
export declare const splitPaginatedQuery: (key: any) => {
    filter: any;
    pagination: {
        limit: any;
        startIndex: any;
    };
} | {
    filter: any;
    pagination: undefined;
};
export type QueryPagination = {
    limit?: number;
    startIndex?: number;
};
export declare const queryKeys: Record<string, Record<string, (...props: any) => QueryFunctionContext['queryKey']>>;
