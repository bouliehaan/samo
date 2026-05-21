import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef, useState } from 'react';
import { PlayQueue } from '/@/renderer/features/now-playing/components/play-queue';
import { PlayQueueListControls } from '/@/renderer/features/now-playing/components/play-queue-list-controls';
import { Flex } from '/@/shared/components/flex/flex';
import { ItemListKey } from '/@/shared/types/types';
export const DrawerPlayQueue = () => {
    const queueRef = useRef(null);
    const [search, setSearch] = useState(undefined);
    return (_jsxs(Flex, { direction: "column", h: "100%", children: [_jsx("div", { style: {
                    backgroundColor: 'var(--theme-colors-background)',
                    borderRadius: '10px',
                }, children: _jsx(PlayQueueListControls, { handleSearch: setSearch, searchTerm: search, tableRef: queueRef, type: ItemListKey.SIDE_QUEUE }) }), _jsx(Flex, { bg: "var(--theme-colors-background)", h: "100%", mb: "0.6rem", children: _jsx(PlayQueue, { listKey: ItemListKey.SIDE_QUEUE, ref: queueRef, searchTerm: search }) })] }));
};
