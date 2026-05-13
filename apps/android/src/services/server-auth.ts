import {
    authenticateServerConnection,
    getServerAuthenticationErrorMessage,
    type ServerAuthenticationInput,
    type ServerAuthenticationResult,
} from '@samo/core/server';

export type AndroidAuthState =
    | { message: string; status: 'error' }
    | { message: string; status: 'loading' }
    | { result: ServerAuthenticationResult; status: 'connected' }
    | { status: 'idle' };

export type ServerAuthInput = ServerAuthenticationInput;

export const authenticateServer = async (input: ServerAuthInput): Promise<AndroidAuthState> => {
    try {
        return { result: await authenticateServerConnection(input), status: 'connected' };
    } catch (error) {
        return { message: getServerAuthenticationErrorMessage(error), status: 'error' };
    }
};
