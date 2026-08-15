import { buildSamoAuthenticatedImageRequest, ServerType } from '@samo/core/server';
import { useMemo } from 'react';

import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

/**
 * Authenticated image request for a long-form cover.
 *
 * Long-form artwork does not go through `ItemImage` the way music does: that
 * component is keyed by the music `LibraryItem` enum, and audiobooks/podcasts
 * are not members of it. Rather than lie about the item type, long-form builds
 * its own request here — once, instead of the copy of this block that used to
 * live in each of the four long-form surfaces.
 */
export const useLongFormCoverRequest = (
    server: null | ServerListItemWithCredential | undefined,
    coverUrl: string | undefined,
    cacheScope: string,
    itemId: string,
) =>
    useMemo(() => {
        if (!server || !coverUrl) {
            return undefined;
        }

        return buildSamoAuthenticatedImageRequest(
            {
                credential: server.credential,
                type: ServerType.SAMO,
                url: server.url,
            },
            coverUrl,
            ['samo', server.id, cacheScope, itemId].join(':'),
        );
    }, [cacheScope, coverUrl, itemId, server]);
