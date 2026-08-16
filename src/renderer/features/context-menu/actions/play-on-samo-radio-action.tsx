import { type SamoRadioItemRef } from '@samo/core/server';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from '/@/renderer/api/query-keys';
import { fetchSongsByItemType } from '/@/renderer/features/player/context/player-context';
import {
    getSamoRadioServer,
    sendToSamoRadioDevice,
} from '/@/renderer/features/samo-radio/api/samo-radio-api';
import { useSamoRadioPolling } from '/@/renderer/features/samo-radio/hooks/use-samo-radio-polling';
import { samoRadioQueueForSend } from '/@/renderer/features/samo-radio/utils/samo-radio-refs';
import { useSamoRadioTargets } from '/@/renderer/store/samo-radio.store';
import { sortSongsByFetchedOrder } from '/@/shared/api/utils';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { toast } from '/@/shared/components/toast/toast';
import { LibraryItem, Song } from '/@/shared/types/domain-types';
import { logFn } from '/@/shared/utils/logger';

/**
 * "Play on the stereo" for anything in the catalog.
 *
 * The device is sent ids, never audio: Samo resolves each one to a stream URL
 * on its side and the device pulls it directly. So most things do not have to
 * be fetched to be *sent* — but an album does, because samo-radio has no album
 * type. Albums, playlists and artists are expanded into their tracks here;
 * audiobooks, episodes and stations are a single id the server expands itself.
 *
 * The entry is absent entirely when there is no device, rather than greyed: on
 * a server without samo-radio it would be a permanent dead line in the menu of
 * every album in the library.
 */

interface PlayOnSamoRadioActionProps {
    /** Ids of the items being acted on, in the order they should play. */
    ids: string[];
    /**
     * How this catalog kind reaches the device, for the kinds it resolves from
     * a single id. Left unset for music, which is sent as tracks.
     */
    itemType?: LibraryItem;
    /**
     * Overrides `itemType` for the media that lives outside the music
     * catalog — audiobooks and podcast episodes have no `LibraryItem` of their
     * own, and a station is sent as a live item rather than expanded.
     */
    sendAs?: SamoRadioItemRef['type'];
    /** Songs, when the caller already has them — skips the fetch entirely. */
    songs?: Song[];
}

export const PlayOnSamoRadioAction = ({
    ids,
    itemType,
    sendAs,
    songs,
}: PlayOnSamoRadioActionProps) => {
    const targets = useSamoRadioTargets();
    const queryClient = useQueryClient();

    // A right click is not the moment to go discovering: the menu renders from
    // what the poller already knows. This only keeps that fresh while a menu
    // host is alive.
    useSamoRadioPolling();

    const handleSend = useCallback(
        async (deviceId: string, deviceName: string) => {
            const server = getSamoRadioServer();
            if (!server) {
                return;
            }

            // Everything the device is asked for by a bare id has to belong to
            // the server that will resolve it — ids only mean something on the
            // server that issued them.
            const directType =
                sendAs ??
                (itemType === LibraryItem.SONG
                    ? 'track'
                    : itemType === LibraryItem.RADIO_STATION
                      ? 'station'
                      : null);

            try {
                let items: SamoRadioItemRef[];
                let startIndex = 0;

                if (songs && songs.length > 0) {
                    ({ items, startIndex } = samoRadioQueueForSend(songs, 0, server.id));
                } else if (directType) {
                    items = ids.map((id) => ({ id, type: directType }));
                } else {
                    // Albums, playlists and artists: the tracks are what the
                    // device can actually be asked for.
                    const fetched = await queryClient.fetchQuery({
                        gcTime: 0,
                        queryFn: () =>
                            fetchSongsByItemType(queryClient, server.id, {
                                id: ids,
                                itemType: itemType as LibraryItem,
                            }),
                        queryKey: queryKeys.player.fetch({ itemType, samoRadio: ids }),
                        staleTime: 0,
                    });
                    // A playlist already comes back in the order it should
                    // play; everything else is regrouped into the order the ids
                    // were asked for, the same way the local queue does it.
                    const ordered =
                        itemType === LibraryItem.PLAYLIST
                            ? fetched
                            : sortSongsByFetchedOrder(fetched, ids, itemType as LibraryItem);
                    ({ items, startIndex } = samoRadioQueueForSend(ordered, 0, server.id));
                }

                if (items.length === 0) {
                    toast.warn({ message: `Nothing here that ${deviceName} can play.` });
                    return;
                }

                await sendToSamoRadioDevice({ deviceId, items, startIndex });
                toast.success({ message: `Playing on ${deviceName}.` });
            } catch (error) {
                logFn.error('Failed to send to samo-radio', { meta: { error } });
                toast.error({
                    message:
                        error instanceof Error ? error.message : `Could not reach ${deviceName}.`,
                });
            }
        },
        [ids, itemType, queryClient, sendAs, songs],
    );

    if (targets.length === 0 || ids.length === 0) {
        return null;
    }

    // One device is the common case — a submenu to pick from a list of one is a
    // click for nothing.
    if (targets.length === 1) {
        return (
            <ContextMenu.Item
                leftIcon="radio"
                onSelect={() => void handleSend(targets[0].id, targets[0].name)}
            >
                Play on {targets[0].name}
            </ContextMenu.Item>
        );
    }

    return (
        <ContextMenu.Submenu>
            <ContextMenu.SubmenuTarget>
                <ContextMenu.Item leftIcon="radio" rightIcon="arrowRightS">
                    Play on Samo Radio
                </ContextMenu.Item>
            </ContextMenu.SubmenuTarget>
            <ContextMenu.SubmenuContent>
                {targets.map((target) => (
                    <ContextMenu.Item
                        key={target.id}
                        leftIcon="radio"
                        onSelect={() => void handleSend(target.id, target.name)}
                    >
                        {target.name}
                    </ContextMenu.Item>
                ))}
            </ContextMenu.SubmenuContent>
        </ContextMenu.Submenu>
    );
};
