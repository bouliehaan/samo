import { AxiosError } from 'axios';
import { MutationHookArgs } from '/@/renderer/lib/react-query';
import { DeleteInternetRadioStationArgs, DeleteInternetRadioStationResponse } from '/@/shared/types/domain-types';
export declare const useDeleteRadioStation: (args: MutationHookArgs) => import("@tanstack/react-query").UseMutationResult<DeleteInternetRadioStationResponse, AxiosError<unknown, any>, DeleteInternetRadioStationArgs, null>;
