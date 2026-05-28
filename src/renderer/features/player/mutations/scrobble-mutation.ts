import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useRef } from 'react';

import { api } from '/@/renderer/api';
import { queryKeys } from '/@/renderer/api/query-keys';
import { MutationOptions } from '/@/renderer/lib/react-query';
import { incrementQueuePlayCount, usePlayerStoreBase } from '/@/renderer/store/player.store';
import { ScrobbleArgs, ScrobbleResponse } from '/@/shared/types/domain-types';

export const useSendScrobble = (options?: MutationOptions) => {
    const queryClient = useQueryClient();
    const lastScrobbledAlbumKeyRef = useRef<string>('');

    return useMutation<ScrobbleResponse, AxiosError, ScrobbleArgs, null>({
        mutationFn: (args) => {
            return api.controller.scrobble({
                ...args,
                apiClientProps: { serverId: args.apiClientProps.serverId },
            });
        },
        onSuccess: (_data, variables) => {
            // Manually increment the play count for the song in the queue if scrobble was submitted
            if (variables.query.submission) {
                const serverId = variables.apiClientProps.serverId;
                incrementQueuePlayCount([variables.query.id]);

                // Only invalidate the album query once per album to prevent multiple play count increments
                // When playing an album, scrobbling each song would increment the album's play count,
                // so we track which album we last invalidated and skip subsequent songs from the same album
                if (variables.query.albumId) {
                    const playerContext = usePlayerStoreBase.getState().player.context;
                    const isPlayingFromAlbum = playerContext.kind === 'album';
                    const currentAlbumId = isPlayingFromAlbum ? playerContext.albumId : undefined;
                    const albumKey = `${serverId}:${variables.query.albumId}`;

                    // Skip invalidation if:
                    // 1. We're playing from an album context AND
                    // 2. The current song is from that same album AND
                    // 3. We already invalidated once for this album
                    const isSameAlbumAsContext =
                        isPlayingFromAlbum && currentAlbumId === variables.query.albumId;
                    const alreadyInvalidatedThisAlbum =
                        albumKey === lastScrobbledAlbumKeyRef.current;

                    if (!isSameAlbumAsContext || !alreadyInvalidatedThisAlbum) {
                        lastScrobbledAlbumKeyRef.current = albumKey;
                        queryClient.invalidateQueries({
                            queryKey: queryKeys.albums.detail(serverId, {
                                id: variables.query.albumId,
                            }),
                        });
                    }
                }

                queryClient.invalidateQueries({
                    queryKey: queryKeys.songs.root(serverId),
                });

                queryClient.invalidateQueries({
                    queryKey: queryKeys.albums.root(serverId),
                });

                queryClient.invalidateQueries({
                    queryKey: queryKeys.albumArtists.root(serverId),
                });

                // Invalidate recently played carousel on home route
                queryClient.invalidateQueries({
                    queryKey: ['home', 'recentlyPlayed'],
                });

                // Invalidate most played / unplayed carousels on home route
                queryClient.invalidateQueries({
                    queryKey: ['home', 'mostPlayed'],
                });
                queryClient.invalidateQueries({
                    queryKey: ['home', 'unplayed'],
                });

                // Invalidate album artist top songs
                queryClient.invalidateQueries({
                    queryKey: queryKeys.albumArtists.topSongs(serverId),
                });

                // Invalidate album artist favorite songs
                queryClient.invalidateQueries({
                    queryKey: queryKeys.albumArtists.favoriteSongs(serverId),
                });
            }
        },
        ...options,
    });
};
