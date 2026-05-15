import {
    getMobileHomeContentErrorMessage,
    loadMobileHomeContentForServers,
    type MobileHomeContent,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

const ANDROID_HOME_CONTENT_LIMIT = 80;

export type AndroidHomeContentState =
    | { content: MobileHomeContent; status: 'loaded' }
    | { message: string; status: 'error' }
    | { status: 'idle' }
    | { status: 'loading' };

export const loadAndroidHomeContent = async (
    authentications: ServerAuthenticationResult[],
): Promise<AndroidHomeContentState> => {
    if (authentications.length === 0) {
        return { status: 'idle' };
    }

    try {
        return {
            content: await loadMobileHomeContentForServers({
                authentications,
                limit: ANDROID_HOME_CONTENT_LIMIT,
            }),
            status: 'loaded',
        };
    } catch (error) {
        return {
            message: getMobileHomeContentErrorMessage(error),
            status: 'error',
        };
    }
};
