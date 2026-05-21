import { QueryClient } from '@tanstack/react-query';
import { DeletePlaylistArgs } from '/@/shared/types/domain-types';
export interface PreviousQueryData {
    data: unknown;
    queryKey: readonly unknown[];
}
export declare const applyDeletePlaylistOptimisticUpdates: (queryClient: QueryClient, variables: DeletePlaylistArgs) => PreviousQueryData[];
export declare const restorePlaylistQueryData: (queryClient: QueryClient, previousQueries: PreviousQueryData[]) => void;
