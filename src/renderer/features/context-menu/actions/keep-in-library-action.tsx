import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useParams } from 'react-router';

import { keepExploTracks } from '/@/renderer/api/samo/samo-controller';
import { playlistsQueries } from '/@/renderer/features/playlists/api/playlists-api';
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
    }, [items, serverId]);

    if (!playlistId || !detailQuery.data?.isSystem || items.length === 0) return null;

    return (
        <ContextMenu.Item disabled={isKeeping} leftIcon="download" onSelect={handleKeep}>
            {items.length > 1 ? `Keep ${items.length} in library` : 'Keep in library'}
        </ContextMenu.Item>
    );
};
