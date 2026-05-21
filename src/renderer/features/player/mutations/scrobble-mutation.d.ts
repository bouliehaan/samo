import { AxiosError } from 'axios';
import { MutationOptions } from '/@/renderer/lib/react-query';
import { ScrobbleArgs } from '/@/shared/types/domain-types';
export declare const useSendScrobble: (options?: MutationOptions) => import("@tanstack/react-query").UseMutationResult<null, AxiosError<unknown, any>, ScrobbleArgs, null>;
