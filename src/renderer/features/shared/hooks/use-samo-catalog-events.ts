import { getSamoClientId, setSamoClientLabel } from '@samo/core/server';
import { useQueryClient } from '@tanstack/react-query';
import isElectron from 'is-electron';
import { useEffect } from 'react';

import {
    invalidateLibraryQueries,
    invalidatePlaylistQueries,
} from '/@/renderer/features/playlists/mutations/playlist-invalidation';
import { getServerById, useCurrentServerId } from '/@/renderer/store';
import { ServerType } from '/@/shared/types/domain-types';

// Names this window in the server's log and in the origin echo. The random
// suffix is what makes the id unique; this only makes it readable.
setSamoClientLabel('desktop');

interface CatalogChange {
    action?: string;
    id?: string;
    origin?: string;
    scope?: string;
}

/**
 * Refetch what a change on another device just invalidated.
 *
 * Before this, a playlist edited on the phone was invisible here until
 * something happened to refetch — which, with a five-minute stale time and no
 * refetch on window focus, could be a very long time or a restart. The server
 * knows the moment it changes; this is it saying so.
 *
 * Everything here is an optimisation over behaviour that is already correct
 * without it: the queries still refetch on mount and still go stale on their
 * own. So a server without the endpoint, a dropped connection, or a missed
 * event costs freshness and never correctness — which is what lets the whole
 * path fail silently.
 */
export const useSamoCatalogEvents = (): void => {
    const queryClient = useQueryClient();
    const serverId = useCurrentServerId();

    useEffect(() => {
        if (!isElectron() || !serverId) {
            return;
        }
        const server = getServerById(serverId);
        if (!server || server.type !== ServerType.SAMO || !server.url || !server.credential) {
            return;
        }

        const unsubscribe = window.api.samo.subscribeCatalogEvents(
            { credential: server.credential, url: server.url },
            (event) => {
                if (event.type !== 'catalog-changed') {
                    return;
                }
                const change = (event.data ?? {}) as CatalogChange;
                if (change.origin && change.origin === getSamoClientId()) {
                    return;
                }

                if (change.scope === 'playlist') {
                    invalidatePlaylistQueries(queryClient, serverId, change.id);
                    return;
                }
                // A library-scoped change (a keep, an import, a scan) can move
                // playlists too — a playlist's track count follows the tracks
                // it holds — so both are invalidated rather than guessing.
                invalidateLibraryQueries(queryClient, serverId);
                invalidatePlaylistQueries(queryClient, serverId);
            },
        );

        return unsubscribe;
    }, [queryClient, serverId]);
};
