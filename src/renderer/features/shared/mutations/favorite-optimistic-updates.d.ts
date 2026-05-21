import { QueryClient } from '@tanstack/react-query';
import { FavoriteArgs } from '/@/shared/types/domain-types';
export interface PreviousQueryData {
    data: unknown;
    queryKey: readonly unknown[];
}
export declare const applyFavoriteOptimisticUpdates: (queryClient: QueryClient, variables: FavoriteArgs, isFavorite: boolean) => PreviousQueryData[];
export declare const applyFavoriteOptimisticUpdatesDeferred: (queryClient: QueryClient, variables: FavoriteArgs, isFavorite: boolean) => PreviousQueryData[];
export declare const restoreFavoriteQueryData: (queryClient: QueryClient, previousQueries: PreviousQueryData[]) => void;
