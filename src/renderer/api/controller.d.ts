import { AuthenticationResponse, ControllerEndpoint, ServerType } from '/@/shared/types/domain-types';
export interface GeneralController extends Omit<Required<ControllerEndpoint>, 'authenticate'> {
    authenticate: (url: string, body: {
        legacy?: boolean;
        password: string;
        username: string;
    }, type: ServerType) => Promise<AuthenticationResponse>;
}
export declare const controller: GeneralController;
