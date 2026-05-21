import { AxiosError } from 'axios';
import { MutationHookArgs } from '/@/renderer/lib/react-query';
import { DeletePlaylistImageArgs } from '/@/shared/types/domain-types';
export declare const useDeletePlaylistImage: (args: MutationHookArgs) => import("@tanstack/react-query").UseMutationResult<boolean, AxiosError<unknown, any>, DeletePlaylistImageArgs, null>;
