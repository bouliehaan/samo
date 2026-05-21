import { AxiosError } from 'axios';
import { MutationHookArgs } from '/@/renderer/lib/react-query';
import { AnyLibraryItems, ShareItemArgs, ShareItemResponse } from '/@/shared/types/domain-types';
export declare const useShareItem: (args: MutationHookArgs) => import("@tanstack/react-query").UseMutationResult<ShareItemResponse, AxiosError<unknown, any>, ShareItemArgs, {
    previous: undefined | {
        items: AnyLibraryItems;
    };
}>;
