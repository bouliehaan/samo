import { AxiosError } from 'axios';
import { MutationHookArgs } from '/@/renderer/lib/react-query';
import { UpdatePlaylistArgs, UpdatePlaylistResponse } from '/@/shared/types/domain-types';
export declare const useUpdatePlaylist: (args: MutationHookArgs) => import("@tanstack/react-query").UseMutationResult<UpdatePlaylistResponse, AxiosError<unknown, any>, UpdatePlaylistArgs, null>;
