import { type MobilePlayableAudio } from '@samo/core/mobile';
import {
    findServerAuthenticationForSource,
    getSamoBearerToken,
    ServerType,
    type ServerAuthenticationResult,
} from '@samo/core/server';

import { getContentSourceFromPlaybackItem } from './content-source';

const isSamoApiStreamUrl = (url: string | undefined): boolean => {
    if (!url) {
        return false;
    }
    try {
        return new URL(url).pathname.includes('/api/v1/');
    } catch {
        return false;
    }
};

/**
 * Attach server credentials for Kotlin queue auto-advance so ExoPlayer can
 * refresh expired Samo stream_token query params while JS is suspended.
 */
export const attachNativeStreamCredentials = (
    item: MobilePlayableAudio,
    serverConnections: ServerAuthenticationResult[],
): MobilePlayableAudio => {
    if (!isSamoApiStreamUrl(item.url) && !isSamoApiStreamUrl(item.castUrl)) {
        return item;
    }

    const contentSource = getContentSourceFromPlaybackItem(item, serverConnections);
    const auth = contentSource
        ? findServerAuthenticationForSource(serverConnections, contentSource)
        : undefined;
    if (!auth || auth.type !== ServerType.SAMO) {
        return item;
    }

    if (item.serverUrl === auth.url && item.serverBearerToken) {
        return item;
    }

    return {
        ...item,
        serverBearerToken: getSamoBearerToken(auth),
        serverUrl: auth.url,
    };
};

export const attachNativeStreamCredentialsToQueue = (
    queue: { index: number; items: MobilePlayableAudio[] },
    serverConnections: ServerAuthenticationResult[],
): { index: number; items: MobilePlayableAudio[] } => ({
    index: queue.index,
    items: queue.items.map((item) => attachNativeStreamCredentials(item, serverConnections)),
});
