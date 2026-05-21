import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { GridCarousel, GridCarouselSkeletonFallback, } from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { MemoizedItemCard } from '/@/renderer/components/item-card/item-card';
import { useDefaultItemListControls } from '/@/renderer/components/item-list/helpers/item-list-controls';
import { useGridRows } from '/@/renderer/components/item-list/helpers/use-grid-rows';
import { LibraryItem } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export function AlbumArtistGridCarousel(props) {
    const { data, excludeIds, isLoading = false, rowCount = 1, title } = props;
    const rows = useGridRows(LibraryItem.ALBUM_ARTIST, ItemListKey.ALBUM_ARTIST);
    const controls = useDefaultItemListControls();
    const cards = useMemo(() => {
        const filteredItems = excludeIds
            ? data.filter((albumArtist) => !excludeIds.includes(albumArtist.id))
            : data;
        return filteredItems.map((albumArtist) => ({
            content: (_jsx(MemoizedItemCard, { controls: controls, data: albumArtist, enableDrag: true, isRound: true, itemType: LibraryItem.ALBUM_ARTIST, rows: rows, type: "poster", withControls: true })),
            id: albumArtist.id,
        }));
    }, [data, excludeIds, controls, rows]);
    if (isLoading) {
        return (_jsx(GridCarouselSkeletonFallback, { placeholderItemType: LibraryItem.ALBUM_ARTIST, placeholderRound: true, placeholderRows: rows, rowCount: rowCount, title: title }));
    }
    const handleNextPage = () => { };
    const handlePrevPage = () => { };
    if (cards.length === 0) {
        return null;
    }
    return (_jsx(GridCarousel, { cards: cards, onNextPage: handleNextPage, onPrevPage: handlePrevPage, rowCount: rowCount, title: title }));
}
