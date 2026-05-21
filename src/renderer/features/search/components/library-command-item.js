import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useState } from 'react';
import styles from './library-command-item.module.css';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { LONG_PRESS_PLAY_BEHAVIOR, PlayTooltip, } from '/@/renderer/features/shared/components/play-button-group';
import { usePlayButtonClick } from '/@/renderer/features/shared/hooks/use-play-button-click';
import { recordRecentItem, recordRecentSong, useCurrentServer } from '/@/renderer/store';
import { ActionIcon, ActionIconGroup } from '/@/shared/components/action-icon/action-icon';
import { Flex } from '/@/shared/components/flex/flex';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';
const createPlayKeyDownHandler = (playType, disabled, onPlay) => {
    return (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled) {
                onPlay(playType);
            }
        }
        else if (e.key === 'Tab') {
            e.stopPropagation();
        }
    };
};
export const LibraryCommandItem = ({ disabled, explicitStatus, id, imageId, imageUrl, isHighlighted, itemType, song, subtitle, title, }) => {
    const { addToQueueByData, addToQueueByFetch } = usePlayer();
    const server = useCurrentServer();
    const handlePlay = useCallback((playType) => {
        if (!server.id)
            return;
        // Use addToQueueByData for songs when we have the song data
        if (itemType === LibraryItem.SONG && song) {
            recordRecentSong(song);
            addToQueueByData([song], playType);
        }
        else {
            const mediaType = itemType === LibraryItem.ALBUM
                ? 'album'
                : itemType === LibraryItem.ALBUM_ARTIST || itemType === LibraryItem.ARTIST
                    ? 'artist'
                    : itemType === LibraryItem.PLAYLIST
                        ? 'playlist'
                        : undefined;
            if (mediaType) {
                recordRecentItem({
                    artwork: {
                        imageId,
                        imageItemType: mediaType === 'artist' ? LibraryItem.ALBUM_ARTIST : itemType,
                        imageUrl,
                        kind: 'music',
                        serverId: server.id,
                        shape: mediaType === 'artist' ? 'circle' : undefined,
                    },
                    itemId: id,
                    mediaType,
                    serverId: server.id,
                    subtitle: subtitle ?? mediaType,
                    title: title ?? 'Untitled',
                });
            }
            addToQueueByFetch(server.id, [id], itemType, playType);
        }
    }, [
        addToQueueByData,
        addToQueueByFetch,
        id,
        imageId,
        imageUrl,
        itemType,
        server.id,
        song,
        subtitle,
        title,
    ]);
    const handlePlayNext = usePlayButtonClick({
        onClick: () => {
            handlePlay(Play.NEXT);
        },
        onLongPress: () => {
            handlePlay(LONG_PRESS_PLAY_BEHAVIOR[Play.NEXT]);
        },
    });
    const handlePlayNow = usePlayButtonClick({
        onClick: () => {
            handlePlay(Play.NOW);
        },
        onLongPress: () => {
            handlePlay(LONG_PRESS_PLAY_BEHAVIOR[Play.NOW]);
        },
    });
    const handlePlayLast = usePlayButtonClick({
        onClick: () => {
            handlePlay(Play.LAST);
        },
        onLongPress: () => {
            handlePlay(LONG_PRESS_PLAY_BEHAVIOR[Play.LAST]);
        },
    });
    const [isHovered, setIsHovered] = useState(false);
    const showControls = isHighlighted || isHovered;
    return (_jsxs(Flex, { gap: "xl", justify: "space-between", onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false), style: { height: '40px', width: '100%' }, children: [_jsxs("div", { className: styles.itemGrid, style: { '--item-height': '40px' }, children: [_jsx("div", { className: styles.imageWrapper, children: _jsx(ItemImage, { alt: "cover", className: styles.image, explicitStatus: explicitStatus ?? song?.explicitStatus ?? null, height: 40, id: imageId, itemType: itemType, src: imageUrl, type: "table", width: 40 }) }), _jsxs("div", { className: styles.metadataWrapper, children: [_jsx(Text, { overflow: "hidden", children: title }), _jsx(Text, { isMuted: true, overflow: "hidden", size: "sm", children: subtitle })] })] }), showControls && (_jsxs(ActionIconGroup, { className: styles.controls, children: [_jsx(PlayTooltip, { disabled: disabled, type: Play.NOW, children: _jsx(ActionIcon, { icon: "mediaPlay", size: "xs", variant: "default", ...handlePlayNow.handlers, ...handlePlayNow.props, onKeyDown: createPlayKeyDownHandler(Play.NOW, Boolean(disabled ?? handlePlayNow.props.disabled), handlePlay) }) }), _jsx(PlayTooltip, { disabled: disabled, type: Play.NEXT, children: _jsx(ActionIcon, { icon: "mediaPlayNext", size: "xs", variant: "default", ...handlePlayNext.handlers, ...handlePlayNext.props, onKeyDown: createPlayKeyDownHandler(Play.NEXT, Boolean(disabled ?? handlePlayNext.props.disabled), handlePlay) }) }), _jsx(PlayTooltip, { disabled: disabled, type: Play.LAST, children: _jsx(ActionIcon, { icon: "mediaPlayLast", size: "xs", variant: "default", ...handlePlayLast.handlers, ...handlePlayLast.props, onKeyDown: createPlayKeyDownHandler(Play.LAST, Boolean(disabled ?? handlePlayLast.props.disabled), handlePlay) }) })] }))] }));
};
