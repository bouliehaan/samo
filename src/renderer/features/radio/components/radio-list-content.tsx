import { useQuery } from '@tanstack/react-query';
import { Suspense, useEffect, useMemo } from 'react';

import { useListContext } from '/@/renderer/context/list-context';
import { radioQueries } from '/@/renderer/features/radio/api/radio-api';
import { RadioListItems } from '/@/renderer/features/radio/components/radio-list-items';
import { SamoRadioPanel } from '/@/renderer/features/samo-radio/components/samo-radio-panel';
import { GridPageSkeleton } from '/@/renderer/features/shared/components/page-skeletons/page-skeletons';
import { useSearchTermFilter } from '/@/renderer/features/shared/hooks/use-search-term-filter';
import { useSortByFilter } from '/@/renderer/features/shared/hooks/use-sort-by-filter';
import { useSortOrderFilter } from '/@/renderer/features/shared/hooks/use-sort-order-filter';
import { searchLibraryItems } from '/@/renderer/features/shared/utils';
import { useCurrentServer } from '/@/renderer/store';
import { sortRadioList } from '/@/shared/api/utils';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Stack } from '/@/shared/components/stack/stack';
import { LibraryItem, RadioListSort, SortOrder } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';

export const RadioListContent = () => {
    const server = useCurrentServer();
    const { setItemCount } = useListContext();
    const { searchTerm } = useSearchTermFilter();
    const { sortBy } = useSortByFilter<RadioListSort>(RadioListSort.NAME, ItemListKey.RADIO);
    const { sortOrder } = useSortOrderFilter(SortOrder.ASC, ItemListKey.RADIO);

    const radioListQuery = useQuery({
        ...radioQueries.list({
            query: undefined,
            serverId: server?.id || '',
        }),
    });

    const filteredAndSortedRadioStations = useMemo(() => {
        let stations = radioListQuery.data || [];

        if (searchTerm) {
            stations = searchLibraryItems(stations, searchTerm, LibraryItem.RADIO_STATION);
        }

        if (sortBy && sortOrder) {
            stations = sortRadioList(stations, sortBy, sortOrder);
        }

        return stations;
    }, [radioListQuery.data, searchTerm, sortBy, sortOrder]);

    useEffect(() => {
        setItemCount?.(filteredAndSortedRadioStations.length || 0);
    }, [filteredAndSortedRadioStations.length, setItemCount]);

    if (radioListQuery.isLoading) {
        return <GridPageSkeleton />;
    }

    return (
        <Suspense fallback={<GridPageSkeleton />}>
            <ScrollArea>
                <Stack gap="xl" p="md">
                    {/* Samo's own outputs sit above the stations, because they
                        are the thing on this page you act on rather than browse
                        — and because "what is the stereo playing" is the
                        question you came here with. It draws nothing when there
                        is no device. */}
                    <SamoRadioPanel />
                    <RadioListItems data={filteredAndSortedRadioStations} />
                </Stack>
            </ScrollArea>
        </Suspense>
    );
};
