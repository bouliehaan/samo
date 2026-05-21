import { AxiosError } from 'axios';
import { MutationHookArgs } from '/@/renderer/lib/react-query';
import { CreatePlaylistArgs, CreatePlaylistResponse } from '/@/shared/types/domain-types';
export declare const useCreatePlaylist: (args: MutationHookArgs) => import("@tanstack/react-query").UseMutationResult<CreatePlaylistResponse, AxiosError<unknown, any>, CreatePlaylistArgs, null>;
