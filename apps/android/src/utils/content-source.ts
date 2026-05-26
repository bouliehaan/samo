import { type MobilePlayableAudio } from '@samo/core/mobile';
import { getMobileContentSource, type MobileContentSource } from '@samo/core/mobile';
import {
    findServerAuthenticationForSource,
    normalizeServerContentSourceId,
    ServerType,
    type ServerAuthenticationResult,
} from '@samo/core/server';

import { getPersistedServerAuthKey } from '../services/persisted-server';

export const getSourceFromSourceId = (
    sourceId: string,
    serverConnections: ServerAuthenticationResult[],
): MobileContentSource | undefined => {
    const connected = findServerAuthenticationForSource(serverConnections, { id: sourceId });
    if (connected) {
        return getMobileContentSource(connected);
    }

    const separator = sourceId.indexOf(':');
    if (separator <= 0) {
        return undefined;
    }

    const type = sourceId.slice(0, separator) as ServerType;
    const url = sourceId.slice(separator + 1);
    if (!Object.values(ServerType).includes(type) || !url) {
        return undefined;
    }

    return {
        id: normalizeServerContentSourceId(sourceId),
        title: url.replace(/^https?:\/\//i, ''),
        type,
        url,
    };
};

export const getContentSourceFromDownloadCollection = (
    collection: Pick<{ sourceId: string }, 'sourceId'>,
    serverConnections: ServerAuthenticationResult[],
): MobileContentSource | undefined =>
    getSourceFromSourceId(collection.sourceId, serverConnections);

export const getContentSourceFromPlaybackItem = (
    item: Pick<MobilePlayableAudio, 'contentSourceId' | 'id'>,
    serverConnections: ServerAuthenticationResult[],
): MobileContentSource | undefined => {
    const idPrefixMatch = item.id.match(
        /^([^:]+:[^:]+):(?:music|audiobook|podcast(?:-episode)?|radio):/,
    );
    const sourceId = item.contentSourceId ?? idPrefixMatch?.[1];
    if (!sourceId) {
        return undefined;
    }

    const connected = serverConnections.find(
        (candidate) => getPersistedServerAuthKey(candidate) === sourceId,
    );
    if (connected) {
        return getMobileContentSource(connected);
    }

    return getSourceFromSourceId(sourceId, serverConnections);
};
