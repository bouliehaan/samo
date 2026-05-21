import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { GridCarousel } from '/@/renderer/components/grid-carousel/grid-carousel-v2';
import { MemoizedItemCard } from '/@/renderer/components/item-card/item-card';
import { useDefaultItemListControls } from '/@/renderer/components/item-list/helpers/item-list-controls';
import { useGridRows } from '/@/renderer/components/item-list/helpers/use-grid-rows';
import { LibraryItem } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';
export function AlbumGridCarousel(props) {
    const { data, excludeIds, rowCount = 1, title } = props;
    const rows = useGridRows(LibraryItem.ALBUM, ItemListKey.ALBUM);
    const controls = useDefaultItemListControls();
    const cards = useMemo(() => {
        const filteredItems = excludeIds
            ? data.filter((album) => !excludeIds.includes(album.id))
            : data;
        return filteredItems.map((album) => ({
            content: (_jsx(MemoizedItemCard, { controls: controls, data: album, enableDrag: true, enableExpansion: true, imageFetchPriority: "low", itemType: LibraryItem.ALBUM, rows: rows, type: "poster", withControls: true })),
            id: album.id,
        }));
    }, [data, excludeIds, controls, rows]);
    const handleNextPage = () => { };
    const handlePrevPage = () => { };
    if (cards.length === 0) {
        return null;
    }
    return (_jsx(GridCarousel, { cards: cards, onNextPage: handleNextPage, onPrevPage: handlePrevPage, rowCount: rowCount, title: title }));
}
