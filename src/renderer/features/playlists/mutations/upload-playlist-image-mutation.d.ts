import { AxiosError } from 'axios';
import { MutationHookArgs } from '/@/renderer/lib/react-query';
import { UploadPlaylistImageArgs } from '/@/shared/types/domain-types';
export declare const useUploadPlaylistImage: (args: MutationHookArgs) => import("@tanstack/react-query").UseMutationResult<boolean, AxiosError<unknown, any>, UploadPlaylistImageArgs, null>;
