import {
    listSamoRecents,
    resolveSamoAudiobookArtworkUrl,
    resolveSamoPodcastArtworkUrl,
    type SamoRecentItem,
    ServerType,
} from '@samo/core/server';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { samoFetch } from '/@/renderer/api/samo/samo-fetch';
import {
    samoAudiobookToLibraryItem,
    samoPodcastToLibraryItem,
} from '/@/renderer/api/samo/samo-long-form';
import {
    playHistoryKey,
    recentAlbumEntry,
    recentAudiobookEntry,
    RecentItem,
    RecentItemInput,
    recentPlaylistEntry,
    recentPodcastEntry,
    recentSongEntry,
    useCurrentServerWithCredential,
    usePlayHistoryStore,
} from '/@/renderer/store';
import { samoNormalize } from '/@/shared/api/samo/samo-normalize';
import { ServerListItemWithCredential } from '/@/shared/types/domain-types';

/** The same length as the list kept on this device. */
const SERVER_RECENTS_LIMIT = 80;

const toRecentEntry = (
    item: SamoRecentItem,
    server: ServerListItemWithCredential,
): null | RecentItemInput => {
    switch (item.kind) {
        case 'album':
            return item.album ? recentAlbumEntry(samoNormalize.album(item.album, server)) : null;
        case 'audiobook':
            return item.audiobook
                ? recentAudiobookEntry(
                      samoAudiobookToLibraryItem(
                          item.audiobook,
                          resolveSamoAudiobookArtworkUrl(server, item.audiobook),
                      ),
                      server.id,
                  )
                : null;
        case 'playlist':
            return item.playlist
                ? recentPlaylistEntry(samoNormalize.playlist(item.playlist, server))
                : null;
        case 'podcast':
            return item.podcast
                ? recentPodcastEntry(
                      samoPodcastToLibraryItem(
                          item.podcast,
                          [],
                          resolveSamoPodcastArtworkUrl(server, item.podcast),
                      ),
                      server.id,
                  )
                : null;
        case 'song':
            return item.track ? recentSongEntry(samoNormalize.song(item.track, server)) : null;
        default:
            return null;
    }
};

export const toServerRecentItems = (
    items: SamoRecentItem[],
    server: ServerListItemWithCredential,
): RecentItem[] =>
    items.flatMap((item) => {
        const selectedAt = Date.parse(item.playedAt);
        const entry = Number.isFinite(selectedAt) ? toRecentEntry(item, server) : null;
        if (!entry) return [];
        return [
            {
                ...entry,
                key: playHistoryKey({
                    itemId: entry.itemId,
                    serverId: entry.serverId,
                    type: entry.mediaType,
                }),
                selectedAt,
            },
        ];
    });

/**
 * Merges what the server recorded this user playing into Recents.
 *
 * Recents live in localStorage, so clearing site data — or opening the player
 * in a new browser — used to leave the list empty although every play was on
 * record. The local list still renders first; this fills it in behind.
 * A server from before the endpoint answers 404, which simply merges nothing.
 */
export const useServerRecentsSync = () => {
    const server = useCurrentServerWithCredential();
    const isSamo = server?.type === ServerType.SAMO && Boolean(server.credential);
    const mergeFromServer = usePlayHistoryStore((state) => state.actions.mergeFromServer);

    const query = useQuery({
        enabled: isSamo,
        queryFn: ({ signal }) =>
            listSamoRecents(samoFetch, server!, { limit: SERVER_RECENTS_LIMIT, signal }),
        queryKey: ['samo', 'recents', server?.id],
        // Picks up what was played on another device when the tab comes back.
        refetchOnWindowFocus: true,
        retry: false,
        staleTime: 1000 * 60 * 5,
    });

    useEffect(() => {
        if (!server || !query.data?.items) return;
        mergeFromServer(toServerRecentItems(query.data.items, server));
    }, [mergeFromServer, query.data, server]);
};

/** Mounted once per layout so Recents fill in whether or not the sidebar is open. */
export const ServerRecentsSync = () => {
    useServerRecentsSync();
    return null;
};
