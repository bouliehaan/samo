import { AxiosError } from 'axios';
import { PreviousQueryData } from '/@/renderer/features/shared/mutations/favorite-optimistic-updates';
import { MutationHookArgs } from '/@/renderer/lib/react-query';
import { RatingResponse, SetRatingArgs } from '/@/shared/types/domain-types';
export declare const useSetRatingMutation: (args: MutationHookArgs) => import("@tanstack/react-query").UseMutationResult<RatingResponse, AxiosError<unknown, any>, SetRatingArgs, PreviousQueryData[]>;
export declare const useIsMutatingRating: () => boolean;
