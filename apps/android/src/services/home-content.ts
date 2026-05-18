import {
    getMobileHomeContentErrorMessage,
    loadMobileHomeContentForServers,
    type MobileHomeContent,
} from '@samo/core/mobile';
import { type ServerAuthenticationResult } from '@samo/core/server';

// Home is a launch surface, not the exhaustive library browser. View All does
// the full fetch when requested; keeping this slice lean avoids a wide album
// detail fan-out before the first scroll can feel responsive.
const ANDROID_HOME_CONTENT_LIMIT = 36;
const ANDROID_HOME_QUALITY_SCAN_LIMIT = 18;

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
                qualityScanLimit: ANDROID_HOME_QUALITY_SCAN_LIMIT,
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
