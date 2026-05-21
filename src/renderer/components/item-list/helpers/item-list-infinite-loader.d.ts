import { UseSuspenseQueryOptions } from '@tanstack/react-query';
import { LibraryItem } from '/@/shared/types/domain-types';
export declare const getListQueryKeyName: (itemType: LibraryItem) => string;
interface UseItemListInfiniteLoaderProps {
    eventKey: string;
    fetchThreshold?: number;
    itemsPerPage: number;
    itemType: LibraryItem;
    listCountQuery: UseSuspenseQueryOptions<number, Error, number, readonly unknown[]>;
    listQueryFn: (args: {
        apiClientProps: any;
        query: any;
    }) => Promise<{
        items: unknown[];
    }>;
    query: Record<string, any>;
    serverId: string;
}
export declare const infiniteLoaderDataQueryKey: (serverId: string, itemType: LibraryItem, query?: Record<string, any>) => (string | Record<string, any>)[];
export declare const useItemListInfiniteLoader: ({ eventKey, fetchThreshold, itemsPerPage, itemType, listCountQuery, listQueryFn, query, serverId, }: UseItemListInfiniteLoaderProps) => {
    dataVersion: any;
    getItem: (index: number) => any;
    getItemIndex: (id: string) => any;
    itemCount: number;
    loadedItems: unknown[];
    onRangeChanged: import("lodash").DebouncedFuncLeading<(range: {
        startIndex: number;
        stopIndex: number;
    }) => Promise<void>>;
    refresh: (force?: boolean) => Promise<void>;
    updateItems: (indexes: number[], value: object) => void;
};
export declare const parseListCountQuery: (query: any) => any;
export {};
