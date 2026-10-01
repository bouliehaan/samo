import { useQuery } from '@tanstack/react-query';
import { Suspense, useEffect, useMemo } from 'react';

import { useListContext } from '/@/renderer/context/list-context';
import { radioQueries } from '/@/renderer/features/radio/api/radio-api';
import { type RadioFilter } from '/@/renderer/features/radio/components/radio-list-header-filters';
import { RadioListItems } from '/@/renderer/features/radio/components/radio-list-items';
import { SamoRadioPanel } from '/@/renderer/features/samo-radio/components/samo-radio-panel';
import { GridPageSkeleton } from '/@/renderer/features/shared/components/page-skeletons/page-skeletons';
import { useSearchTermFilter } from '/@/renderer/features/shared/hooks/use-search-term-filter';
import { searchLibraryItems } from '/@/renderer/features/shared/utils';
import { useCurrentServer } from '/@/renderer/store';
import { useFavoriteRadioStationIds } from '/@/renderer/store/library-favorites.store';
import { sortRadioList } from '/@/shared/api/utils';
import { Button } from '/@/shared/components/button/button';
import { Center } from '/@/shared/components/center/center';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem, RadioListSort, SortOrder } from '/@/shared/types/domain-types';

export const RadioListContent = ({ filter }: { filter: RadioFilter }) => {
    const server = useCurrentServer();
    const { setItemCount } = useListContext();
    const { searchTerm } = useSearchTermFilter();
    const favoriteIds = useFavoriteRadioStationIds(server?.id);

    const radioListQuery = useQuery({
        ...radioQueries.list({
            query: undefined,
            serverId: server?.id || '',
        }),
        // Do not request a station list without a configured server.
        enabled: Boolean(server?.id),
    });

    const filteredAndSortedRadioStations = useMemo(() => {
        let stations = radioListQuery.data || [];

        if (searchTerm) {
            stations = searchLibraryItems(stations, searchTerm, LibraryItem.RADIO_STATION);
        }

        stations = stations.filter((station) => {
            if (filter === 'favorites') return favoriteIds.has(station.id);
            if (filter === 'channels') return station.kind === 'channel';
            if (filter === 'internet') return station.kind !== 'channel';
            return true;
        });

        return sortRadioList(stations, RadioListSort.NAME, SortOrder.ASC);
    }, [radioListQuery.data, searchTerm, filter, favoriteIds]);

    useEffect(() => {
        setItemCount?.(filteredAndSortedRadioStations.length || 0);
    }, [filteredAndSortedRadioStations.length, setItemCount]);

    if (!server?.id || radioListQuery.isLoading) {
        return <GridPageSkeleton />;
    }

    if (radioListQuery.isError) {
        return (
            <ScrollArea>
                <Center h="100%" p="xl">
                    <Stack align="center" gap="xs" maw="26rem">
                        <Text fw={650} size="lg">
                            Couldn’t load radio stations
                        </Text>
                        <Text isMuted style={{ textAlign: 'center' }}>
                            Your station list is still on the server. Try loading it again.
                        </Text>
                        <Button mt="sm" onClick={() => void radioListQuery.refetch()}>
                            Try again
                        </Button>
                    </Stack>
                </Center>
            </ScrollArea>
        );
    }

    return (
        <Suspense fallback={<GridPageSkeleton />}>
            <ScrollArea style={{ flex: 1, minHeight: 0 }}>
                <Stack gap="lg" pb="xl" px="xl">
                    <SamoRadioPanel />
                    <RadioListItems
                        data={filteredAndSortedRadioStations}
                        isFiltered={Boolean(searchTerm) || filter !== 'all'}
                    />
                </Stack>
            </ScrollArea>
        </Suspense>
    );
};
