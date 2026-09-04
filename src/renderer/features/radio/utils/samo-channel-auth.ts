import { ServerType } from '@samo/core/server';

import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

export type SamoChannelAuth = {
    credential: string;
    type: ServerType.SAMO;
    url: string;
};

/**
 * The connected server as something the channel endpoints will accept, or null.
 *
 * Everything a listener does with a channel — reading what is on air, skipping
 * it, opening the stream — needs the same three fields off the same server, and
 * each of those surfaces used to rebuild them from its own ternary. One copy,
 * so "is this server one that has channels at all" is answered the same way
 * everywhere: a non-samo backend, or a samo one with no credential yet, simply
 * has none, and every caller reads that as nothing to offer.
 */
export const samoChannelAuth = (
    server: null | ServerListItemWithCredential | undefined,
): null | SamoChannelAuth =>
    server?.type === ServerType.SAMO && server.url && server.credential
        ? { credential: server.credential, type: ServerType.SAMO, url: server.url }
        : null;
