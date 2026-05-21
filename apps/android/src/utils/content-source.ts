import { getMobileContentSource, type MobileContentSource } from '@samo/core/mobile';
import { ServerType, type ServerAuthenticationResult } from '@samo/core/server';

import { getPersistedServerAuthKey } from '../services/persisted-server';

export const getSourceFromSourceId = (
    sourceId: string,
    serverConnections: ServerAuthenticationResult[],
): MobileContentSource | undefined => {
    const connected = serverConnections.find(
        (connection) => getPersistedServerAuthKey(connection) === sourceId,
    );
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
        id: sourceId,
        title: url.replace(/^https?:\/\//i, ''),
        type,
        url,
    };
};
