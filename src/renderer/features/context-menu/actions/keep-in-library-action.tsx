import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useParams } from 'react-router';

import { keepExploTracks } from '/@/renderer/api/samo/samo-controller';
import { playlistsQueries } from '/@/renderer/features/playlists/api/playlists-api';
import {
    invalidateLibraryQueries,
    invalidatePlaylistQueries,
} from '/@/renderer/features/playlists/mutations/playlist-invalidation';
import { getServerById, useCurrentServerId } from '/@/renderer/store';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { toast } from '/@/shared/components/toast/toast';
import { Song } from '/@/shared/types/domain-types';

interface KeepInLibraryActionProps {
    items: Song[];
}

/**
 * Copies tracks out of the Explore queue and into the music library.
 *
 * Explore is a rotating window over samo's explo drop folder, and the weekly
 * run empties that folder — so anything not kept is gone by Tuesday. The
 * server does the copying (it owns the filesystem) and writes the identified
 * metadata into the copy, so the kept file is correct in any player rather
 * than carrying whatever the original sharer typed.
 *
 * Only offered on the Explore playlist. Everywhere else these tracks are
 * already in the library and the action would be meaningless.
 */
export const KeepInLibraryAction = ({ items }: KeepInLibraryActionProps) => {
    const serverId = useCurrentServerId();
    const queryClient = useQueryClient();
    const { playlistId } = useParams() as { playlistId?: string };
    const [isKeeping, setIsKeeping] = useState(false);

    const detailQuery = useQuery({
        ...playlistsQueries.detail({ query: { id: playlistId ?? '' }, serverId }),
        enabled: Boolean(playlistId && serverId),
    });

    const handleKeep = useCallback(async () => {
        const server = serverId ? getServerById(serverId) : undefined;
        if (!server || items.length === 0) return;

        setIsKeeping(true);
        try {
            const response = await keepExploTracks(
                server,
                items.map((item) => item.id),
            );

            // Report per-track outcomes rather than a bare "done". A partial
            // result is the normal case: a track already in the library needed
            // no copy, which is a success, and swallowing that would leave you
            // unsure whether anything happened at all.
            const parts: string[] = [];
            if (response.kept > 0) parts.push(`${response.kept} kept`);
            if (response.alreadyInLibrary > 0)
                parts.push(`${response.alreadyInLibrary} already in library`);
            if (response.failed > 0) parts.push(`${response.failed} failed`);

            // A kept track is a NEW row in the library — a new song, in an
            // album, under an artist, changing the counts on all three. None of
            // those reads knew to refetch, which is why a track kept here
            // stayed invisible everywhere else until the app restarted: this
            // action invalidated nothing at all.
            //
            // Gated on something actually landing. A run that only found tracks
            // already in the library changed no rows, and throwing away the
            // library cache to discover that costs a full refetch of every list
            // on screen for nothing.
            if (response.kept > 0) {
                invalidateLibraryQueries(queryClient, serverId);
                // The Explore playlist keeps its drops — the server leaves the
                // original in place for rotation to collect — but what is shown
                // against it comes from the same catalog projection the copy
                // just changed.
                invalidatePlaylistQueries(queryClient, serverId, playlistId);
            }

            if (response.failed > 0) {
                const first = response.results.find((result) => result.error);
                toast.warn({
                    message: first?.error
                        ? `${parts.join(', ')} — ${first.error}`
                        : parts.join(', '),
                    title: 'Kept with problems',
                });
            } else {
                toast.success({ message: parts.join(', ') || 'Nothing to keep' });
            }
        } catch (err: any) {
            toast.error({ message: err?.message ?? 'Could not keep these tracks' });
        } finally {
            setIsKeeping(false);
        }
    }, [items, playlistId, queryClient, serverId]);

    if (!playlistId || !detailQuery.data?.isSystem || items.length === 0) return null;

    return (
        <ContextMenu.Item disabled={isKeeping} leftIcon="download" onSelect={handleKeep}>
            {items.length > 1 ? `Keep ${items.length} in library` : 'Keep in library'}
        </ContextMenu.Item>
    );
};
