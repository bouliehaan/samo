import { useSuspenseQuery } from '@tanstack/react-query';
import { Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { ListContext, useListContext } from '/@/renderer/context/list-context';
import { playlistsQueries } from '/@/renderer/features/playlists/api/playlists-api';
import { ClientSideSongFilters } from '/@/renderer/features/playlists/components/client-side-song-filters';
import { PlaylistDetailSongListContent } from '/@/renderer/features/playlists/components/playlist-detail-song-list-content';
import { PlaylistDetailSongListHeader } from '/@/renderer/features/playlists/components/playlist-detail-song-list-header';
import { usePlaylistSongListFilters } from '/@/renderer/features/playlists/hooks/use-playlist-song-list-filters';
import { AnimatedPage } from '/@/renderer/features/shared/components/animated-page';
import { ListWithSidebarContainer } from '/@/renderer/features/shared/components/list-with-sidebar-container';
import { PageErrorBoundary } from '/@/renderer/features/shared/components/page-error-boundary';
import { TrackListSkeleton } from '/@/renderer/features/shared/components/page-skeletons/page-skeletons';
import {
    PlaylistTarget,
    useCurrentServer,
    usePageSidebar,
    usePlaylistTarget,
} from '/@/renderer/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';

const PlaylistSongListFiltersSidebar = () => {
    const { t } = useTranslation();
    const { setIsSidebarOpen } = useListContext();
    const { clear } = usePlaylistSongListFilters();

    return (
        <Stack h="100%" style={{ minHeight: 0 }}>
            <Group justify="space-between" pb={0} pl="md" pr="md" pt="md">
                <Text fw={500} size="xl">
                    {t('common.filters', { postProcess: 'sentenceCase' })}
                </Text>
                <Group gap="xs">
                    <Button onClick={clear} size="compact-sm" variant="subtle">
                        {t('common.reset', { postProcess: 'sentenceCase' })}
                    </Button>
                    {setIsSidebarOpen && (
                        <ActionIcon
                            icon="unpin"
                            onClick={() => setIsSidebarOpen(false)}
                            size="compact-sm"
                            variant="subtle"
                        />
                    )}
                </Group>
            </Group>
            <ScrollArea style={{ flex: 1, minHeight: 0 }}>
                <ClientSideSongFilters />
            </ScrollArea>
        </Stack>
    );
};

const PlaylistDetailSongListRoute = () => {
    const { playlistId } = useParams() as { playlistId: string };
    const server = useCurrentServer();

    // Suspend until the playlist detail resolves so the header renders with data
    // rather than flashing through its own loading state.
    useSuspenseQuery({
        ...playlistsQueries.detail({ query: { id: playlistId }, serverId: server?.id }),
    });
    const playlistTarget = usePlaylistTarget();
    const displayMode: LibraryItem.ALBUM | LibraryItem.SONG =
        playlistTarget === PlaylistTarget.ALBUM ? LibraryItem.ALBUM : LibraryItem.SONG;
    const listKey =
        displayMode === LibraryItem.ALBUM ? ItemListKey.PLAYLIST_ALBUM : ItemListKey.PLAYLIST_SONG;

    const [itemCount, setItemCount] = useState<number | undefined>(undefined);
    const [listData, setListData] = useState<unknown[]>([]);
    const [mode, setMode] = useState<'edit' | 'view'>('view');
    const [isSidebarOpen, setIsSidebarOpen] = usePageSidebar(listKey);

    const providerValue = useMemo(() => {
        return {
            customFilters: undefined,
            displayMode,
            id: playlistId,
            isSidebarOpen,
            itemCount,
            listData,
            listKey,
            mode,
            pageKey: listKey,
            setIsSidebarOpen,
            setItemCount,
            setListData,
            setMode,
        };
    }, [
        playlistId,
        displayMode,
        listKey,
        isSidebarOpen,
        itemCount,
        listData,
        mode,
        setIsSidebarOpen,
    ]);

    return (
        <AnimatedPage key={`playlist-detail-songList-${playlistId}`}>
            <ListContext.Provider value={providerValue}>
                <PlaylistDetailSongListHeader />

                <ListWithSidebarContainer>
                    <ListWithSidebarContainer.SidebarPortal>
                        <Suspense fallback={<Spinner container />}>
                            <PlaylistSongListFiltersSidebar />
                        </Suspense>
                    </ListWithSidebarContainer.SidebarPortal>
                    <Suspense fallback={<TrackListSkeleton />}>
                        <PlaylistDetailSongListContent />
                    </Suspense>
                </ListWithSidebarContainer>
            </ListContext.Provider>
        </AnimatedPage>
    );
};

const PlaylistDetailSongListRouteWithBoundary = () => {
    return (
        <PageErrorBoundary>
            <PlaylistDetailSongListRoute />
        </PageErrorBoundary>
    );
};

export default PlaylistDetailSongListRouteWithBoundary;
