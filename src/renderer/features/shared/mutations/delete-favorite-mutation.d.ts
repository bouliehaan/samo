import { AxiosError } from 'axios';
import { PreviousQueryData } from '/@/renderer/features/shared/mutations/favorite-optimistic-updates';
import { MutationHookArgs } from '/@/renderer/lib/react-query';
import { FavoriteArgs, FavoriteResponse } from '/@/shared/types/domain-types';
export declare const useDeleteFavorite: (args: MutationHookArgs) => import("@tanstack/react-query").UseMutationResult<FavoriteResponse, AxiosError<unknown, any>, FavoriteArgs, PreviousQueryData[]>;
export declare const useIsMutatingDeleteFavorite: () => boolean;
