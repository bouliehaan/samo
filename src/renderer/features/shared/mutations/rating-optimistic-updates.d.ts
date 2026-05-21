import { QueryClient } from '@tanstack/react-query';
import { PreviousQueryData } from './favorite-optimistic-updates';
import { SetRatingArgs } from '/@/shared/types/domain-types';
export declare const applyRatingOptimisticUpdates: (queryClient: QueryClient, variables: SetRatingArgs, rating: number) => PreviousQueryData[];
export declare const applyRatingOptimisticUpdatesDeferred: (queryClient: QueryClient, variables: SetRatingArgs, rating: number) => PreviousQueryData[];
export declare const restoreRatingQueryData: (queryClient: QueryClient, previousQueries: PreviousQueryData[]) => void;
