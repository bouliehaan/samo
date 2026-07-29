import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useLocation, useParams } from 'react-router';

import { useItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { useListContext } from '/@/renderer/context/list-context';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { playlistsQueries } from '/@/renderer/features/playlists/api/playlists-api';
import { PlaylistDetailSongListHeaderFilters } from '/@/renderer/features/playlists/components/playlist-detail-song-list-header-filters';
import { openUpdatePlaylistModal } from '/@/renderer/features/playlists/components/update-playlist-modal';
import { FilterBar } from '/@/renderer/features/shared/components/filter-bar';
import {
    LibraryHeader,
    LibraryHeaderMenu,
} from '/@/renderer/features/shared/components/library-header';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { ListSearchInput } from '/@/renderer/features/shared/components/list-search-input';
import { AppRoute } from '/@/renderer/router/routes';
import { recordRecentPlaylist, useCurrentServer, usePermissions } from '/@/renderer/store';
import { formatDurationString } from '/@/renderer/utils';
import { replaceURLWithHTMLLinks } from '/@/renderer/utils/linkify';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Spoiler } from '/@/shared/components/spoiler/spoiler';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { useLocalStorage } from '/@/shared/hooks/use-local-storage';
import { LibraryItem, Song } from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';

export const PlaylistDetailSongListHeader = () => {
    const { t } = useTranslation();
    const { playlistId } = useParams() as { playlistId: string };
    const { itemCount, listData } = useListContext();
    const server = useCurrentServer();
    const location = useLocation();

    const detailQuery = useQuery({
        ...playlistsQueries.detail({ query: { id: playlistId }, serverId: server?.id }),
        placeholderData: location.state?.item,
    });

    const playlistDuration = detailQuery?.data?.duration;
    const playlistDescription = detailQuery?.data?.description?.trim();
    const { userId, ...permissions } = usePermissions();
    const canEditPublic = permissions.playlists.editPublic;
    const includesNonOwnedPublic =
        Boolean(detailQuery?.data?.public) && detailQuery?.data?.ownerId !== userId;
    const canEditPlaylist = canEditPublic || !includesNonOwnedPublic;

    const [collapsed] = useLocalStorage<boolean>({
        defaultValue: false,
        key: 'playlist-header-collapsed',
    });

    const player = usePlayer();

    const handlePlay = (type?: Play) => {
        const playlistServerId = detailQuery?.data?._serverId ?? server?.id;
        // Tag fresh-start plays with playlist context so the queue persists across launches.
        // Additive types (LAST/NEXT) ignore the context and preserve the prior intent.
        player.addToQueueByData(
            listData as Song[],
            type || Play.NOW,
            undefined,
            playlistServerId
                ? { kind: 'playlist', playlistId, serverId: playlistServerId }
                : undefined,
        );
        if (detailQuery?.data) {
            recordRecentPlaylist(detailQuery.data);
        }
    };

    const imageUrl = useItemImageUrl({
        id: detailQuery?.data?.imageId || undefined,
        itemType: LibraryItem.PLAYLIST,
        type: 'header',
    });

    return (
        <Stack gap={0}>
            {collapsed ? (
                <PageHeader>
                    <LibraryHeaderBar ignoreMaxWidth>
                        <LibraryHeaderBar.PlayButton
                            context={
                                detailQuery?.data?._serverId
                                    ? {
                                          kind: 'playlist',
                                          playlistId,
                                          serverId: detailQuery.data._serverId,
                                      }
                                    : undefined
                            }
                            itemType={LibraryItem.PLAYLIST}
                            onBeforePlay={() => {
                                if (detailQuery?.data) {
                                    recordRecentPlaylist(detailQuery.data);
                                }
                            }}
                            songs={listData as Song[]}
                        />
                        <LibraryHeaderBar.Title>{detailQuery?.data?.name}</LibraryHeaderBar.Title>
                        {!!playlistDuration && (
                            <LibraryHeaderBar.Badge>
                                {formatDurationString(playlistDuration)}
                            </LibraryHeaderBar.Badge>
                        )}
                        <LibraryHeaderBar.Badge
                            isLoading={itemCount === null || itemCount === undefined}
                        >
                            {itemCount}
                        </LibraryHeaderBar.Badge>
                    </LibraryHeaderBar>
                    <ListSearchInput />
                </PageHeader>
            ) : (
                <LibraryHeader
                    compact
                    imageUrl={imageUrl}
                    item={{
                        imageId: detailQuery?.data?.imageId,
                        imageUrl: detailQuery?.data?.imageUrl,
                        route: AppRoute.PLAYLISTS,
                        type: LibraryItem.PLAYLIST,
                    }}
                    title={detailQuery?.data?.name || ''}
                    topRight={<ListSearchInput />}
                >
                    <Stack gap="md" w="100%">
                        {playlistDescription ? (
                            <Spoiler
                                hideLabel={<></>}
                                maxHeight={16}
                                showLabel={<></>}
                                style={{ marginBottom: 0 }}
                            >
                                <Text
                                    isMuted
                                    size="sm"
                                    style={{
                                        maxWidth: '100%',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    {replaceURLWithHTMLLinks(playlistDescription)}
                                </Text>
                            </Spoiler>
                        ) : null}
                        <Group gap="sm">
                            {canEditPlaylist && detailQuery?.data ? (
                                <Button
                                    leftSection={<Icon icon="edit" />}
                                    onClick={() =>
                                        openUpdatePlaylistModal({ playlist: detailQuery.data })
                                    }
                                    variant="default"
                                >
                                    {t('action.editPlaylist', { postProcess: 'titleCase' })}
                                </Button>
                            ) : null}
                            <LibraryHeaderMenu
                                onPlay={(type) => handlePlay(type)}
                                onShuffle={() => handlePlay(Play.SHUFFLE)}
                            />
                        </Group>
                    </Stack>
                </LibraryHeader>
            )}
            <FilterBar>
                <PlaylistDetailSongListHeaderFilters />
            </FilterBar>
        </Stack>
    );
};
