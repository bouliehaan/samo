import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { t } from 'i18next';
import { useRef, useState } from 'react';
import { PlayQueue } from '/@/renderer/features/now-playing/components/play-queue';
import { PlayQueueListControls } from '/@/renderer/features/now-playing/components/play-queue-list-controls';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Popover } from '/@/shared/components/popover/popover';
import { Stack } from '/@/shared/components/stack/stack';
import { useDisclosure } from '/@/shared/hooks/use-disclosure';
import { ItemListKey } from '/@/shared/types/types';
export const PopoverPlayQueue = ({ onClose, onToggle, opened: controlledOpened, } = {}) => {
    const queueRef = useRef(null);
    const [search, setSearch] = useState(undefined);
    const [internalOpened, internalHandlers] = useDisclosure(false);
    const opened = controlledOpened !== undefined ? controlledOpened : internalOpened;
    const handleClose = onClose ? onClose : internalHandlers.close;
    const handleToggle = onToggle ? onToggle : internalHandlers.toggle;
    return (_jsxs(Popover, { arrowSize: 24, offset: 12, onClose: handleClose, opened: opened, position: "top", transitionProps: {
            transition: 'fade',
        }, withArrow: true, children: [_jsx(Popover.Target, { children: _jsx(ActionIcon, { icon: "arrowUpToLine", iconProps: {
                        size: 'lg',
                    }, onClick: handleToggle, size: "sm", tooltip: {
                        label: t('player.viewQueue', { postProcess: 'titleCase' }),
                        openDelay: 0,
                    }, variant: "subtle" }) }), _jsx(Popover.Dropdown, { h: "600px", mah: "80dvh", opacity: 0.95, p: "xs", w: "560px", children: _jsxs(Stack, { gap: 0, h: "100%", w: "100%", children: [_jsx(PlayQueueListControls, { handleSearch: setSearch, searchTerm: search, tableRef: queueRef, type: ItemListKey.SIDE_QUEUE }), _jsx(PlayQueue, { listKey: ItemListKey.SIDE_QUEUE, ref: queueRef, searchTerm: search })] }) })] }));
};
