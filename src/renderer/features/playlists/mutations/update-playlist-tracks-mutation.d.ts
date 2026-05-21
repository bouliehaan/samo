import { AxiosError } from 'axios';
import { MutationHookArgs } from '/@/renderer/lib/react-query';
import { SetPlaylistSongsArgs } from '/@/shared/types/domain-types';
export declare const useUpdatePlaylistTracks: (args: MutationHookArgs) => import("@tanstack/react-query").UseMutationResult<null, AxiosError<unknown, any>, SetPlaylistSongsArgs, null>;
