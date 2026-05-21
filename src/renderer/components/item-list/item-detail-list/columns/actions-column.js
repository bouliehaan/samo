import { jsx as _jsx } from "react/jsx-runtime";
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { LibraryItem } from '/@/shared/types/domain-types';
export const ActionsColumn = ({ controls, internalState, song }) => {
    const handleClick = (event) => {
        event.stopPropagation();
        event.preventDefault();
        const index = internalState?.findItemIndex(song.id) ?? -1;
        controls?.onMore?.({
            event,
            index,
            internalState: internalState ?? undefined,
            item: song,
            itemType: LibraryItem.SONG,
        });
    };
    const handleDoubleClick = (event) => {
        event.stopPropagation();
        event.preventDefault();
    };
    return (_jsx(ActionIcon, { icon: "ellipsisHorizontal", iconProps: {
            color: 'muted',
            size: 'xs',
        }, onClick: handleClick, onDoubleClick: handleDoubleClick, size: "xs", variant: "subtle" }));
};
