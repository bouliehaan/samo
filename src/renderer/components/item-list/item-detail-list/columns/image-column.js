import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { useState } from 'react';
import styles from './image-column.module.css';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { PlayButton } from '/@/renderer/features/shared/components/play-button';
import { LONG_PRESS_PLAY_BEHAVIOR, PlayTooltip, } from '/@/renderer/features/shared/components/play-button-group';
import { usePlayButtonBehavior } from '/@/renderer/store';
import { LibraryItem } from '/@/shared/types/domain-types';
export const ImageColumn = ({ controls, internalState, rowIndex = 0, song, }) => {
    const playButtonBehavior = usePlayButtonBehavior();
    const [isHovered, setIsHovered] = useState(false);
    const handlePlay = (playType) => {
        if (!song || !controls?.onDoubleClick) {
            return;
        }
        controls.onDoubleClick({
            event: null,
            index: rowIndex,
            internalState,
            item: song,
            itemType: LibraryItem.SONG,
            meta: { playType, singleSongOnly: true },
        });
    };
    return (_jsxs("div", { className: styles.imageContainer, onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false), children: [_jsx(ItemImage, { className: styles.compactImage, containerClassName: styles.compactContainer, explicitStatus: song.explicitStatus, id: song.imageId, itemType: LibraryItem.SONG, serverId: song._serverId, type: "table" }), isHovered && (_jsx("div", { className: clsx(styles.playButtonOverlay), children: _jsx(PlayTooltip, { disabled: false, type: playButtonBehavior, children: _jsx(PlayButton, { fill: true, onClick: () => handlePlay(playButtonBehavior), onLongPress: () => handlePlay(LONG_PRESS_PLAY_BEHAVIOR[playButtonBehavior]) }) }) }))] }));
};
