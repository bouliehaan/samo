import { AxiosError } from 'axios';
import { MutationHookArgs } from '/@/renderer/lib/react-query';
import { CreateInternetRadioStationArgs, CreateInternetRadioStationResponse } from '/@/shared/types/domain-types';
export declare const useCreateRadioStation: (args: MutationHookArgs) => import("@tanstack/react-query").UseMutationResult<CreateInternetRadioStationResponse, AxiosError<unknown, any>, CreateInternetRadioStationArgs, null>;
