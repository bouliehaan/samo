import { AxiosError } from 'axios';
import { MutationHookArgs } from '/@/renderer/lib/react-query';
import { UploadArtistImageArgs } from '/@/shared/types/domain-types';
export declare const useUploadArtistImage: (args: MutationHookArgs) => import("@tanstack/react-query").UseMutationResult<boolean, AxiosError<unknown, any>, UploadArtistImageArgs, null>;
