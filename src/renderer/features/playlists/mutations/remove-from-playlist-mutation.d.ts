import { AxiosError } from 'axios';
import { MutationOptions } from '/@/renderer/lib/react-query';
import { RemoveFromPlaylistArgs, RemoveFromPlaylistResponse } from '/@/shared/types/domain-types';
export declare const useRemoveFromPlaylist: (options?: MutationOptions) => import("@tanstack/react-query").UseMutationResult<RemoveFromPlaylistResponse, AxiosError<unknown, any>, RemoveFromPlaylistArgs, null>;
