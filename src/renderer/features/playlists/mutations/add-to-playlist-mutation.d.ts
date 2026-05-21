import { AxiosError } from 'axios';
import { MutationHookArgs } from '/@/renderer/lib/react-query';
import { AddToPlaylistArgs, AddToPlaylistResponse } from '/@/shared/types/domain-types';
export declare const useAddToPlaylist: (args: MutationHookArgs) => import("@tanstack/react-query").UseMutationResult<AddToPlaylistResponse, AxiosError<unknown, any>, AddToPlaylistArgs, null>;
