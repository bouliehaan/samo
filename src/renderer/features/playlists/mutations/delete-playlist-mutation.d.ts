import { AxiosError } from 'axios';
import { PreviousQueryData } from '/@/renderer/features/playlists/mutations/playlist-optimistic-updates';
import { MutationHookArgs } from '/@/renderer/lib/react-query';
import { DeletePlaylistArgs, DeletePlaylistResponse } from '/@/shared/types/domain-types';
export declare const useDeletePlaylist: (args: MutationHookArgs) => import("@tanstack/react-query").UseMutationResult<DeletePlaylistResponse, AxiosError<unknown, any>, DeletePlaylistArgs, PreviousQueryData[]>;
