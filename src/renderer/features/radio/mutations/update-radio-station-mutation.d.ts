import { AxiosError } from 'axios';
import { MutationHookArgs } from '/@/renderer/lib/react-query';
import { UpdateInternetRadioStationArgs, UpdateInternetRadioStationResponse } from '/@/shared/types/domain-types';
export declare const useUpdateRadioStation: (args: MutationHookArgs) => import("@tanstack/react-query").UseMutationResult<UpdateInternetRadioStationResponse, AxiosError<unknown, any>, UpdateInternetRadioStationArgs, null>;
