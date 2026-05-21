import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import imageColumnStyles from '../item-detail-list/columns/image-column.module.css';
import styles from './album-group-header.module.css';
import { TableItemSize } from './item-table-list';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { PlayButton } from '/@/renderer/features/shared/components/play-button';
import { LONG_PRESS_PLAY_BEHAVIOR, PlayTooltip, } from '/@/renderer/features/shared/components/play-button-group';
import { usePlayButtonBehavior } from '/@/renderer/store';
import { LibraryItem } from '/@/shared/types/domain-types';
export const AlbumGroupHeader = ({ groupRowCount, onPlay, size = 'normal', song, }) => {
    const [isHovered, setIsHovered] = useState(false);
    const playButtonBehavior = usePlayButtonBehavior();
    const rowHeight = {
        compact: TableItemSize.COMPACT,
        large: TableItemSize.LARGE,
        normal: TableItemSize.DEFAULT,
    }[size];
    const infoHeight = groupRowCount !== undefined ? groupRowCount * rowHeight : undefined;
    return (_jsxs("div", { className: styles.container, children: [_jsxs("div", { className: styles.imageContainer, onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false), children: [_jsx(ItemImage, { className: imageColumnStyles.compactImage, enableDebounce: true, enableViewport: false, id: song?.imageId, itemType: LibraryItem.SONG, src: song?.imageUrl, type: "table" }), isHovered && onPlay && (_jsx("div", { className: imageColumnStyles.playButtonOverlay, children: _jsx(PlayTooltip, { type: playButtonBehavior, children: _jsx(PlayButton, { fill: true, onClick: (e) => {
                                    e.stopPropagation();
                                    onPlay(playButtonBehavior);
                                }, onLongPress: (e) => {
                                    e.stopPropagation();
                                    onPlay(LONG_PRESS_PLAY_BEHAVIOR[playButtonBehavior]);
                                } }) }) }))] }), _jsxs("div", { className: styles.info, style: { height: infoHeight }, children: [_jsx("div", { className: styles.albumName, children: song?.album ?? '' }), _jsx("div", { className: styles.artistName, children: song?.albumArtistName ?? '' })] })] }));
};
