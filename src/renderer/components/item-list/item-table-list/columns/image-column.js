import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { useState } from 'react';
import styles from './image-column.module.css';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { TableColumnContainer, } from '/@/renderer/components/item-list/item-table-list/item-table-list-column';
import { PlayButton } from '/@/renderer/features/shared/components/play-button';
import { LONG_PRESS_PLAY_BEHAVIOR, PlayTooltip, } from '/@/renderer/features/shared/components/play-button-group';
import { usePlayButtonBehavior } from '/@/renderer/store';
import { Icon } from '/@/shared/components/icon/icon';
import { Skeleton } from '/@/shared/components/skeleton/skeleton';
import { LibraryItem } from '/@/shared/types/domain-types';
const ImageColumnBase = (props) => {
    const rowItem = props.getRowItem?.(props.rowIndex) ?? props.data[props.rowIndex];
    const row = rowItem?.id;
    const item = rowItem;
    const playButtonBehavior = usePlayButtonBehavior();
    const internalState = props.internalState;
    const [isHovered, setIsHovered] = useState(false);
    const isFolder = rowItem?._itemType === LibraryItem.FOLDER;
    const shouldShowFolderIcon = isFolder && !item?.imageId && !item?.imageUrl;
    const handlePlay = (playType, event) => {
        if (!item) {
            return;
        }
        // For SONG items, use double click behavior
        if ((props.itemType === LibraryItem.SONG ||
            props.itemType === LibraryItem.PLAYLIST_SONG ||
            item._itemType === LibraryItem.SONG) &&
            props.controls?.onDoubleClick) {
            // Calculate the index based on rowIndex, accounting for header if enabled
            const isHeaderEnabled = !!props.enableHeader;
            const index = isHeaderEnabled ? props.rowIndex - 1 : props.rowIndex;
            props.controls.onDoubleClick({
                event: null,
                index,
                internalState,
                item,
                itemType: props.itemType,
                meta: {
                    playType,
                    singleSongOnly: true,
                },
            });
            return;
        }
        // For other item types, use regular onPlay
        if (!props.controls?.onPlay) {
            return;
        }
        props.controls.onPlay({
            event,
            item,
            itemType: props.itemType,
            playType,
        });
    };
    if (typeof row === 'string') {
        return (_jsx(TableColumnContainer, { ...props, children: _jsxs("div", { className: clsx(styles.imageContainer, {
                    [styles.compactImageContainer]: props.size === 'compact',
                }), onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false), children: [_jsx(ItemImage, { containerClassName: clsx({
                            [styles.compactImageContainer]: props.size === 'compact',
                            [styles.imageContainerWithAspectRatio]: props.size === 'default' || props.size === 'large',
                        }), enableDebounce: true, enableViewport: false, explicitStatus: item?.explicitStatus, id: item?.imageId, itemType: item?._itemType, src: item?.imageUrl, type: "table" }), isHovered && (_jsx("div", { className: clsx(styles.playButtonOverlay, {
                            [styles.compactPlayButtonOverlay]: props.size === 'compact',
                        }), children: _jsx(PlayTooltip, { disabled: props.itemType === LibraryItem.QUEUE_SONG, type: playButtonBehavior, children: _jsx(PlayButton, { fill: true, onClick: (e) => handlePlay(playButtonBehavior, e), onLongPress: (e) => handlePlay(LONG_PRESS_PLAY_BEHAVIOR[playButtonBehavior], e) }) }) }))] }) }));
    }
    if (shouldShowFolderIcon) {
        return (_jsx(TableColumnContainer, { ...props, children: _jsx(Icon, { className: styles.folderIcon, icon: "folder", size: "2xl" }) }));
    }
    return (_jsx(TableColumnContainer, { ...props, children: _jsx("div", { className: clsx(styles.imageContainer, {
                [styles.compactImageContainer]: props.size === 'compact',
                [styles.skeletonWithAspectRatio]: props.size === 'default' || props.size === 'large',
            }), children: _jsx(Skeleton, { containerClassName: styles.skeleton }) }) }));
};
export const ImageColumn = ImageColumnBase;
