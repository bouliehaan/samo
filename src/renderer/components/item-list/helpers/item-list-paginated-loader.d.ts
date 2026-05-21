import { UseSuspenseQueryOptions } from '@tanstack/react-query';
import { LibraryItem } from '/@/shared/types/domain-types';
interface UseItemListPaginatedLoaderProps {
    currentPage: number;
    eventKey?: string;
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
export declare const useItemListPaginatedLoader: ({ currentPage, eventKey, itemsPerPage, itemType, listCountQuery, listQueryFn, query, serverId, }: UseItemListPaginatedLoaderProps) => {
    data: unknown[];
    pageCount: number;
    totalItemCount: number;
};
export {};
