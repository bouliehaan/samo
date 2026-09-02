import { closeAllModals, ContextModalProps } from '@mantine/modals';
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { playlistsQueries } from '/@/renderer/features/playlists/api/playlists-api';
import { useUpdatePlaylistTracks } from '/@/renderer/features/playlists/mutations/update-playlist-tracks-mutation';
import { useCurrentServerId } from '/@/renderer/store';
import { ConfirmModal } from '/@/shared/components/modal/modal';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
import { logFn } from '/@/shared/utils/logger';

export const SaveAndReplaceContextModal = ({
    innerProps,
}: ContextModalProps<{ onSuccess: () => void; playlistId: string; songIds: string[] }>) => {
    const { t } = useTranslation();
    const { onSuccess, playlistId, songIds } = innerProps;
    const serverId = useCurrentServerId();

    const updatePlaylistMutation = useUpdatePlaylistTracks({});

    // The server's own idea of how long this playlist is, to check the list
    // being saved against. See handleConfirm for why that check exists.
    const detailQuery = useQuery({
        ...playlistsQueries.detail({ query: { id: playlistId }, serverId }),
        enabled: Boolean(playlistId && serverId),
    });
    const serverSongCount = detailQuery.data?.songCount ?? null;

    const handleConfirm = useCallback(() => {
        if (!serverId || !playlistId) {
            logFn.error('serverId or playlistId is not defined');
            return;
        }

        // This save replaces the playlist's entire contents, so a list that is
        // short of what the server holds does not reorder the playlist — it
        // deletes the difference. The list is loaded exhaustively now, so this
        // should never fire; it is here because the cost of it firing is
        // silent, permanent data loss, and the cost of the check is one
        // comparison against a count we already have.
        //
        // Refuses rather than warns: there is no version of "save part of the
        // playlist over the whole playlist" that the user meant.
        if (serverSongCount !== null && songIds.length < serverSongCount) {
            logFn.error(
                `refused playlist save: ${songIds.length} of ${serverSongCount} tracks loaded`,
            );
            toast.error({
                message: `Only ${songIds.length} of this playlist's ${serverSongCount} tracks have loaded. Saving now would delete the rest — reopen the playlist and try again.`,
                title: 'Playlist not fully loaded',
            });
            closeAllModals();
            return;
        }

        updatePlaylistMutation.mutate(
            {
                apiClientProps: { serverId },
                body: {
                    id: playlistId,
                    songIds,
                },
            },
            {
                onError: (err) => {
                    logFn.error(err instanceof Error ? err.message : String(err), {
                        meta: { error: err },
                    });
                    toast.error({
                        message: err.message,
                        title: t('error.genericError', {
                            postProcess: 'sentenceCase',
                        }),
                    });
                },
                onSuccess: () => {
                    onSuccess();
                    closeAllModals();
                    toast.success({
                        message: t('form.editPlaylist.success', {
                            postProcess: 'sentenceCase',
                        }),
                    });
                },
            },
        );
    }, [serverId, playlistId, updatePlaylistMutation, songIds, serverSongCount, t, onSuccess]);

    return (
        <ConfirmModal loading={updatePlaylistMutation.isPending} onConfirm={handleConfirm}>
            <Text>{t('common.areYouSure', { postProcess: 'sentenceCase' })}</Text>
        </ConfirmModal>
    );
};
