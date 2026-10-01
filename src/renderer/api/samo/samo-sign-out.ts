import { revokeSamoCredential, ServerType } from '@samo/core/server';

import { samoFetch } from '/@/renderer/api/samo/samo-fetch';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

/**
 * Revoke, on its server, the token a saved server holds once the app has
 * stopped using it: the server was removed, or signing in again replaced the
 * token. Without this every removed server left a live credential on the
 * account.
 *
 * Fired, never awaited, and it never throws: removing a server must not depend
 * on that server answering. Requests go to `url`, the address every other samo
 * call uses.
 */
export const retireSamoCredential = (
    server: null | Pick<ServerListItemWithCredential, 'credential' | 'type' | 'url'> | undefined,
): void => {
    if (server?.type !== ServerType.SAMO || !server.credential) {
        return;
    }
    void revokeSamoCredential(samoFetch, { credential: server.credential, url: server.url });
};
