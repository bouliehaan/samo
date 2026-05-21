import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { AnimatePresence } from 'motion/react';
import { Fragment, memo, useCallback, useMemo, useState } from 'react';
import { generatePath, Link } from 'react-router';
import styles from './item-card.module.css';
import i18n from '/@/i18n/i18n';
import { ItemCardControls } from '/@/renderer/components/item-card/item-card-controls';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { getDraggedItems } from '/@/renderer/components/item-list/helpers/get-dragged-items';
import { getTitlePath } from '/@/renderer/components/item-list/helpers/get-title-path';
import { useItemDraggingState, useItemSelectionState, } from '/@/renderer/components/item-list/helpers/item-list-state';
import { JoinedArtists } from '/@/renderer/features/albums/components/joined-artists';
import { useDragDrop } from '/@/renderer/hooks/use-drag-drop';
import { AppRoute } from '/@/renderer/router/routes';
import { recordRecentArtist, recordRecentPlaylist } from '/@/renderer/store';
import { formatDateAbsolute, formatDateRelative, formatDurationString, formatPartialIsoDateUTC, } from '/@/renderer/utils/format';
import { SEPARATOR_STRING } from '/@/shared/api/utils';
import { ExplicitIndicator } from '/@/shared/components/explicit-indicator/explicit-indicator';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Separator } from '/@/shared/components/separator/separator';
import { Skeleton } from '/@/shared/components/skeleton/skeleton';
import { Text } from '/@/shared/components/text/text';
import { useDoubleClick } from '/@/shared/hooks/use-double-click';
import { LibraryItem, } from '/@/shared/types/domain-types';
import { DragOperation, DragTarget } from '/@/shared/types/drag-and-drop';
import { stringToColor } from '/@/shared/utils/string-to-color';
export const ItemCard = ({ controls, data, enableDrag, enableExpansion, enableMultiSelect, enableNavigation = true, imageAsLink, imageFetchPriority, internalState, isRound, itemType, rows: providedRows, type = 'poster', withControls, }) => {
    const showRatings = false;
    const imageUrl = getImageUrl(data);
    const rows = providedRows || [];
    switch (type) {
        case 'compact':
            return (_jsx(MemoizedCompactItemCard, { controls: controls, data: data, enableDrag: enableDrag, enableExpansion: enableExpansion, enableMultiSelect: enableMultiSelect, enableNavigation: enableNavigation, imageAsLink: imageAsLink, imageFetchPriority: imageFetchPriority, imageUrl: imageUrl, internalState: internalState, isRound: isRound, itemType: itemType, rows: rows, showRating: showRatings, withControls: withControls }));
        case 'poster':
            return (_jsx(MemoizedPosterItemCard, { controls: controls, data: data, enableDrag: enableDrag, enableExpansion: enableExpansion, enableMultiSelect: enableMultiSelect, enableNavigation: enableNavigation, imageAsLink: imageAsLink, imageFetchPriority: imageFetchPriority, imageUrl: imageUrl, internalState: internalState, isRound: isRound, itemType: itemType, rows: rows, showRating: showRatings, withControls: withControls }));
        case 'default':
        default:
            return (_jsx(MemoizedDefaultItemCard, { controls: controls, data: data, enableDrag: enableDrag, enableExpansion: enableExpansion, enableNavigation: enableNavigation, imageAsLink: imageAsLink, imageFetchPriority: imageFetchPriority, imageUrl: imageUrl, internalState: internalState, isRound: isRound, itemType: itemType, rows: rows, showRating: showRatings, withControls: withControls }));
    }
};
const recordRecentCardItem = (data, itemType) => {
    if (itemType === LibraryItem.ALBUM_ARTIST || itemType === LibraryItem.ARTIST) {
        recordRecentArtist(data);
    }
    else if (itemType === LibraryItem.PLAYLIST) {
        recordRecentPlaylist(data);
    }
};
const ItemCardStandardImageArea = memo(function ItemCardStandardImageArea({ controls, data, enableExpansion, enableImageViewport = true, enableNavigation, handleContextMenu, handleImageClick, handleLinkDragStart, imageAsLink, imageFetchPriority, internalState, isRound, itemType, navigationPath, showRating, variant, withControls, }) {
    const [showControls, setShowControls] = useState(false);
    const handleMouseEnter = () => {
        if (withControls) {
            setShowControls(true);
        }
    };
    const handleMouseLeave = () => {
        if (withControls) {
            setShowControls(false);
        }
    };
    const imageContainerClassName = clsx(styles.imageContainer, {
        [styles.isRound]: isRound,
    });
    const hasRating = false;
    const imageContainerContent = (_jsxs(_Fragment, { children: [itemType === LibraryItem.GENRE &&
                data &&
                'name' in data &&
                typeof data.name === 'string' ? (_jsx(GenreImagePlaceholder, { className: clsx(styles.image, styles.genrePlaceholder, {
                    [styles.isRound]: isRound,
                }), name: data.name })) : (_jsx(ItemImage, { className: clsx(styles.image, { [styles.isRound]: isRound }), enableDebounce: false, ...(variant === 'poster' ? { enableViewport: enableImageViewport } : {}), explicitStatus: 'explicitStatus' in data && data ? data.explicitStatus : null, fetchPriority: imageFetchPriority, id: data?.imageId, itemType: itemType, src: data?.imageUrl, type: "itemCard" })), hasRating && _jsx("div", { className: styles.ratingBadge }), _jsx(AnimatePresence, { children: withControls && showControls && (_jsx(ItemCardControls, { controls: controls, enableExpansion: enableExpansion, ...(variant === 'poster' ? { internalState } : {}), item: data, itemType: itemType, showRating: showRating, type: variant })) })] }));
    return enableNavigation && navigationPath && (imageAsLink ?? !internalState) ? (_jsx(Link, { className: imageContainerClassName, draggable: false, onClick: handleImageClick, onContextMenu: handleContextMenu, onDragStart: handleLinkDragStart, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave, state: { item: data }, to: navigationPath, children: imageContainerContent })) : (_jsx("div", { className: imageContainerClassName, onClick: handleImageClick, onContextMenu: handleContextMenu, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave, children: imageContainerContent }));
});
ItemCardStandardImageArea.displayName = 'ItemCardStandardImageArea';
const CompactItemCardImageArea = memo(function CompactItemCardImageArea({ controls, data, enableExpansion, enableNavigation, handleContextMenu, handleImageClick, handleLinkDragStart, imageAsLink, imageFetchPriority, internalState, isRound, itemType, navigationPath, rows, showRating, withControls, }) {
    const [showControls, setShowControls] = useState(false);
    const handleMouseEnter = () => {
        if (withControls) {
            setShowControls(true);
        }
    };
    const handleMouseLeave = () => {
        if (withControls) {
            setShowControls(false);
        }
    };
    const imageContainerClassName = clsx(styles.imageContainer, {
        [styles.isRound]: isRound,
    });
    const hasRating = false;
    const imageContainerContent = (_jsxs(_Fragment, { children: [itemType === LibraryItem.GENRE &&
                data &&
                'name' in data &&
                typeof data.name === 'string' ? (_jsx(GenreImagePlaceholder, { className: clsx(styles.image, styles.genrePlaceholder, {
                    [styles.isRound]: isRound,
                }), name: data.name })) : (_jsx(ItemImage, { className: clsx(styles.image, {
                    [styles.isRound]: isRound,
                }), enableDebounce: false, explicitStatus: 'explicitStatus' in data && data ? data.explicitStatus : null, fetchPriority: imageFetchPriority, id: data?.imageId, itemType: itemType, src: data?.imageUrl, type: "itemCard" })), hasRating && _jsx("div", { className: styles.ratingBadge }), _jsx(AnimatePresence, { children: withControls && showControls && data && (_jsx(ItemCardControls, { controls: controls, enableExpansion: enableExpansion, internalState: internalState, item: data, itemType: itemType, showRating: showRating, type: "compact" })) }), _jsx("div", { className: clsx(styles.detailContainer, styles.compact), children: rows
                    .filter((row) => row !== null && row !== undefined)
                    .map((row, index) => (_jsx(ItemCardRow, { data: data, index: index, row: row, type: "compact" }, row.id))) })] }));
    return enableNavigation && navigationPath && (imageAsLink ?? !internalState) ? (_jsx(Link, { className: imageContainerClassName, draggable: false, onClick: handleImageClick, onContextMenu: handleContextMenu, onDragStart: handleLinkDragStart, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave, state: { item: data }, to: navigationPath, children: imageContainerContent })) : (_jsx("div", { className: imageContainerClassName, onClick: handleImageClick, onContextMenu: handleContextMenu, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave, children: imageContainerContent }));
});
CompactItemCardImageArea.displayName = 'CompactItemCardImageArea';
const CompactItemCard = ({ controls, data, enableDrag, enableExpansion, enableMultiSelect, enableNavigation, imageAsLink, imageFetchPriority, internalState, isRound, itemType, rows, showRating, withControls, }) => {
    const itemRowId = data && internalState && typeof data === 'object' && 'id' in data
        ? internalState.extractRowId(data)
        : undefined;
    const isSelected = useItemSelectionState(internalState, itemRowId || undefined);
    const getId = useCallback(() => {
        if (!data) {
            return [];
        }
        const draggedItems = getDraggedItems(data, internalState, enableMultiSelect !== false);
        return draggedItems.map((item) => item.id);
    }, [data, internalState, enableMultiSelect]);
    const getItem = useCallback(() => {
        if (!data) {
            return [];
        }
        const draggedItems = getDraggedItems(data, internalState, enableMultiSelect !== false);
        return draggedItems;
    }, [data, internalState, enableMultiSelect]);
    const onDragStart = useCallback(() => {
        if (!data) {
            return;
        }
        const draggedItems = getDraggedItems(data, internalState, enableMultiSelect !== false);
        if (internalState) {
            internalState.setDragging(draggedItems);
        }
    }, [data, internalState, enableMultiSelect]);
    const onDrop = useCallback(() => {
        if (internalState) {
            internalState.setDragging([]);
        }
    }, [internalState]);
    const dragOperation = useMemo(() => itemType === LibraryItem.QUEUE_SONG
        ? [DragOperation.REORDER, DragOperation.ADD]
        : [DragOperation.ADD], [itemType]);
    const drag = useMemo(() => ({
        getId,
        getItem,
        itemType,
        onDragStart,
        onDrop,
        operation: dragOperation,
        target: DragTarget.ALBUM,
    }), [getId, getItem, itemType, onDragStart, onDrop, dragOperation]);
    const { isDragging: isDraggingLocal, ref } = useDragDrop({
        drag,
        isEnabled: !!enableDrag && !!data,
    });
    const itemId = data && internalState ? data.id : undefined;
    const isDraggingState = useItemDraggingState(internalState, itemId);
    const isDragging = isDraggingState || isDraggingLocal;
    const handleClick = useDoubleClick({
        onDoubleClick: (e) => {
            if (!data || !controls || !internalState) {
                return;
            }
            controls.onDoubleClick?.({
                event: e,
                internalState,
                item: data,
                itemType,
            });
        },
        onSingleClick: (e) => {
            if (!data || !controls || !internalState) {
                return;
            }
            // Don't trigger selection if clicking on interactive elements
            const target = e.target;
            const isInteractiveElement = target.closest('button, a, input, select, textarea, [role="button"]');
            if (isInteractiveElement) {
                return;
            }
            controls.onClick?.({
                event: e,
                internalState,
                item: data,
                itemType,
            });
        },
    });
    if (data) {
        const navigationPath = getItemNavigationPath(data, itemType);
        const handleContextMenu = (e) => {
            if (!data || !controls) {
                return;
            }
            e.preventDefault();
            controls.onMore?.({
                event: e,
                internalState,
                item: data,
                itemType,
            });
        };
        const handleImageClick = (e) => {
            // Prevent navigation on double-click, let the double-click handler work
            if (e.detail === 2 && navigationPath) {
                e.preventDefault();
            }
            else if (navigationPath) {
                recordRecentCardItem(data, itemType);
            }
            handleClick(e);
        };
        const handleLinkDragStart = (e) => {
            // Prevent default browser link drag behavior to allow custom drag and drop
            e.preventDefault();
            e.stopPropagation();
        };
        return (_jsx("div", { className: clsx(styles.container, styles.compact, {
                [styles.dragging]: isDragging,
                [styles.selected]: isSelected,
            }), ref: ref, children: _jsx(CompactItemCardImageArea, { controls: controls, data: data, enableExpansion: enableExpansion, enableNavigation: enableNavigation, handleContextMenu: handleContextMenu, handleImageClick: handleImageClick, handleLinkDragStart: handleLinkDragStart, imageAsLink: imageAsLink, imageFetchPriority: imageFetchPriority, internalState: internalState, isRound: isRound, itemType: itemType, navigationPath: navigationPath, rows: rows, showRating: showRating, withControls: withControls }) }));
    }
    return (_jsx("div", { className: clsx(styles.container, styles.compact), children: _jsxs("div", { className: clsx(styles.imageContainer, { [styles.isRound]: isRound }), children: [_jsx(Skeleton, { className: styles.image }), _jsx("div", { className: clsx(styles.detailContainer, styles.compact), children: rows
                        .filter((row) => row !== null && row !== undefined)
                        .map((row, index) => (_jsx(Text, { className: clsx(styles.row, {
                            [styles.muted]: index > 0,
                        }), size: index > 0 ? 'sm' : 'md', children: "\u00A0" }, row.id))) })] }) }));
};
const DefaultItemCard = ({ controls, data, enableExpansion, enableNavigation, imageAsLink, imageFetchPriority, internalState, isRound, itemType, rows, showRating, withControls, }) => {
    const itemRowId = data && internalState && typeof data === 'object' && 'id' in data
        ? internalState.extractRowId(data)
        : undefined;
    const isSelected = useItemSelectionState(internalState, itemRowId || undefined);
    const handleClick = useDoubleClick({
        onDoubleClick: (e) => {
            if (!data || !controls || !internalState) {
                return;
            }
            controls.onDoubleClick?.({
                event: e,
                internalState,
                item: data,
                itemType,
            });
        },
        onSingleClick: (e) => {
            if (!data || !controls || !internalState) {
                return;
            }
            // Don't trigger selection if clicking on interactive elements
            const target = e.target;
            const isInteractiveElement = target.closest('button, a, input, select, textarea, [role="button"]');
            if (isInteractiveElement) {
                return;
            }
            controls.onClick?.({
                event: e,
                internalState,
                item: data,
                itemType,
            });
        },
    });
    if (data) {
        const navigationPath = getItemNavigationPath(data, itemType);
        const handleContextMenu = (e) => {
            if (!data || !controls) {
                return;
            }
            e.preventDefault();
            controls.onMore?.({
                event: e,
                internalState,
                item: data,
                itemType,
            });
        };
        const handleImageClick = (e) => {
            // Prevent navigation on double-click, let the double-click handler work
            if (e.detail === 2 && navigationPath) {
                e.preventDefault();
            }
            else if (navigationPath) {
                recordRecentCardItem(data, itemType);
            }
            handleClick(e);
        };
        const handleLinkDragStart = (e) => {
            // Prevent default browser link drag behavior to allow custom drag and drop
            e.preventDefault();
            e.stopPropagation();
        };
        return (_jsxs("div", { className: clsx(styles.container, {
                [styles.selected]: isSelected,
            }), children: [_jsx(ItemCardStandardImageArea, { controls: controls, data: data, enableExpansion: enableExpansion, enableNavigation: enableNavigation, handleContextMenu: handleContextMenu, handleImageClick: handleImageClick, handleLinkDragStart: handleLinkDragStart, imageAsLink: imageAsLink, imageFetchPriority: imageFetchPriority, internalState: internalState, isRound: isRound, itemType: itemType, navigationPath: navigationPath, showRating: showRating, variant: "default", withControls: withControls }), _jsx("div", { className: styles.detailContainer, children: rows
                        .filter((row) => row !== null && row !== undefined)
                        .map((row, index) => (_jsx(ItemCardRow, { data: data, index: index, row: row, type: "default" }, row.id))) })] }));
    }
    return (_jsxs("div", { className: clsx(styles.container), children: [_jsx("div", { className: clsx(styles.imageContainer, { [styles.isRound]: isRound }), children: _jsx(Skeleton, { className: styles.image }) }), _jsx("div", { className: styles.detailContainer, children: rows
                    .filter((row) => row !== null && row !== undefined)
                    .map((row, index) => (_jsx(Text, { className: clsx(styles.row, {
                        [styles.muted]: index > 0,
                    }), size: index > 0 ? 'sm' : 'md', children: "\u00A0" }, row.id))) })] }));
};
const PosterItemCard = ({ controls, data, enableDrag, enableExpansion, enableMultiSelect, enableNavigation, imageAsLink, imageFetchPriority, internalState, isRound, itemType, rows, showRating, withControls, }) => {
    const itemRowId = data && internalState && typeof data === 'object' && 'id' in data
        ? internalState.extractRowId(data)
        : undefined;
    const isSelected = useItemSelectionState(internalState, itemRowId || undefined);
    const getId = useCallback(() => {
        if (!data) {
            return [];
        }
        const draggedItems = getDraggedItems(data, internalState, enableMultiSelect !== false);
        return draggedItems.map((item) => item.id);
    }, [data, internalState, enableMultiSelect]);
    const getItem = useCallback(() => {
        if (!data) {
            return [];
        }
        const draggedItems = getDraggedItems(data, internalState, enableMultiSelect !== false);
        return draggedItems;
    }, [data, internalState, enableMultiSelect]);
    const onDragStart = useCallback(() => {
        if (!data) {
            return;
        }
        const draggedItems = getDraggedItems(data, internalState, enableMultiSelect !== false);
        if (internalState) {
            internalState.setDragging(draggedItems);
        }
    }, [data, internalState, enableMultiSelect]);
    const onDrop = useCallback(() => {
        if (internalState) {
            internalState.setDragging([]);
        }
    }, [internalState]);
    const dragOperation = useMemo(() => itemType === LibraryItem.QUEUE_SONG
        ? [DragOperation.REORDER, DragOperation.ADD]
        : [DragOperation.ADD], [itemType]);
    const drag = useMemo(() => ({
        getId,
        getItem,
        itemType,
        onDragStart,
        onDrop,
        operation: dragOperation,
        target: DragTarget.ALBUM,
    }), [getId, getItem, itemType, onDragStart, onDrop, dragOperation]);
    const { isDragging: isDraggingLocal, ref } = useDragDrop({
        drag,
        isEnabled: !!enableDrag && !!data,
    });
    const itemId = data && internalState ? data.id : undefined;
    const isDraggingState = useItemDraggingState(internalState, itemId);
    const isDragging = isDraggingState || isDraggingLocal;
    const handleClick = useDoubleClick({
        onDoubleClick: (e) => {
            if (!data || !controls || !internalState) {
                return;
            }
            controls.onDoubleClick?.({
                event: e,
                internalState,
                item: data,
                itemType,
            });
        },
        onSingleClick: (e) => {
            if (!data || !controls || !internalState) {
                return;
            }
            // Don't trigger selection if clicking on interactive elements
            const target = e.target;
            const isInteractiveElement = target.closest('button, a, input, select, textarea, [role="button"]');
            if (isInteractiveElement) {
                return;
            }
            controls.onClick?.({
                event: e,
                internalState,
                item: data,
                itemType,
            });
        },
    });
    if (data) {
        const navigationPath = getItemNavigationPath(data, itemType);
        const handleContextMenu = (e) => {
            if (!data || !controls) {
                return;
            }
            e.preventDefault();
            controls.onMore?.({
                event: e,
                internalState,
                item: data,
                itemType,
            });
        };
        const handleImageClick = (e) => {
            // Prevent navigation on double-click, let the double-click handler work
            if (e.detail === 2 && navigationPath) {
                e.preventDefault();
            }
            else if (navigationPath) {
                recordRecentCardItem(data, itemType);
            }
            handleClick(e);
        };
        const handleLinkDragStart = (e) => {
            // Prevent default browser link drag behavior to allow custom drag and drop
            e.preventDefault();
            e.stopPropagation();
        };
        return (_jsxs("div", { className: clsx(styles.container, styles.poster, {
                [styles.dragging]: isDragging,
                [styles.selected]: isSelected,
            }), ref: ref, children: [_jsx(ItemCardStandardImageArea, { controls: controls, data: data, enableExpansion: enableExpansion, enableNavigation: enableNavigation, handleContextMenu: handleContextMenu, handleImageClick: handleImageClick, handleLinkDragStart: handleLinkDragStart, imageAsLink: imageAsLink, imageFetchPriority: imageFetchPriority, internalState: internalState, isRound: isRound, itemType: itemType, navigationPath: navigationPath, showRating: showRating, variant: "poster", withControls: withControls }), data && (_jsx("div", { className: styles.detailContainer, children: rows
                        .filter((row) => row !== null && row !== undefined)
                        .map((row, index) => (_jsx(ItemCardRow, { data: data, index: index, row: row, type: "poster" }, row.id))) }))] }));
    }
    return (_jsxs("div", { className: clsx(styles.container, styles.poster), children: [_jsx("div", { className: clsx(styles.imageContainer, { [styles.isRound]: isRound }), children: _jsx(Skeleton, { className: clsx(styles.image, { [styles.isRound]: isRound }) }) }), _jsx("div", { className: styles.detailContainer, children: rows
                    .filter((row) => row !== null && row !== undefined)
                    .map((row, index) => (_jsx(Text, { className: clsx(styles.row, {
                        [styles.muted]: index > 0,
                    }), size: index > 0 ? 'sm' : 'md', children: "\u00A0" }, row.id))) })] }));
};
const MemoizedPosterItemCard = memo(PosterItemCard);
MemoizedPosterItemCard.displayName = 'MemoizedPosterItemCard';
const MemoizedCompactItemCard = memo(CompactItemCard);
MemoizedCompactItemCard.displayName = 'MemoizedCompactItemCard';
const MemoizedDefaultItemCard = memo(DefaultItemCard);
MemoizedDefaultItemCard.displayName = 'MemoizedDefaultItemCard';
export const getDataRows = (type) => {
    return [
        {
            format: (data) => {
                const explicitStatus = 'explicitStatus' in data ? data.explicitStatus : null;
                if ('name' in data && data.name) {
                    if ('id' in data && data.id) {
                        if ('_itemType' in data) {
                            switch (data._itemType) {
                                case LibraryItem.ALBUM:
                                    return (_jsxs(Link, { state: { item: data }, to: generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, {
                                            albumId: data.id,
                                        }), children: [_jsx(ExplicitIndicator, { explicitStatus: explicitStatus }), data.name] }));
                                case LibraryItem.ALBUM_ARTIST:
                                    return (_jsxs(Link, { onClick: () => recordRecentArtist(data), state: { item: data }, to: generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL, {
                                            albumArtistId: data.id,
                                        }), children: [_jsx(ExplicitIndicator, { explicitStatus: explicitStatus }), data.name] }));
                                case LibraryItem.GENRE:
                                    return (_jsx(Link, { state: { item: data }, to: generatePath(AppRoute.LIBRARY_GENRES_DETAIL, {
                                            genreId: data.id,
                                        }), children: data.name }));
                                case LibraryItem.PLAYLIST:
                                    return (_jsx(Link, { onClick: () => recordRecentPlaylist(data), state: { item: data }, to: generatePath(AppRoute.PLAYLISTS_DETAIL_SONGS, {
                                            playlistId: data.id,
                                        }), children: data.name }));
                                default:
                                    return (_jsxs(_Fragment, { children: [_jsx(ExplicitIndicator, { explicitStatus: explicitStatus }), data.name] }));
                            }
                        }
                    }
                    return (_jsxs(_Fragment, { children: [_jsx(ExplicitIndicator, { explicitStatus: explicitStatus }), data.name] }));
                }
                return '';
            },
            id: 'name',
        },
        {
            format: (data) => {
                if ('albumArtists' in data && Array.isArray(data.albumArtists)) {
                    return (_jsx(JoinedArtists, { artistName: data.albumArtistName, artists: data.albumArtists, linkProps: { fw: 400, isMuted: true }, rootTextProps: {
                            fw: 400,
                            isMuted: type === 'compact' ? false : true,
                            size: 'sm',
                        } }));
                }
                return '';
            },
            id: 'albumArtists',
            isMuted: true,
        },
        {
            format: (data) => {
                if ('artists' in data && Array.isArray(data.artists)) {
                    return data.artists.map((artist, index) => (_jsxs(Fragment, { children: [_jsx(Link, { onClick: () => recordRecentArtist(artist, {
                                    serverId: data._serverId,
                                    serverType: data._serverType,
                                }), state: { item: artist }, to: generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL, {
                                    albumArtistId: artist.id,
                                }), children: artist.name }), index < data.artists.length - 1 && _jsx(Separator, {})] }, artist.id)));
                }
                return '';
            },
            id: 'artists',
            isMuted: true,
        },
        {
            format: (data) => {
                if ('duration' in data && data.duration !== null) {
                    return formatDurationString(data.duration);
                }
                return '';
            },
            id: 'duration',
        },
        {
            format: (data) => {
                if ('releaseYear' in data && data.releaseYear != null) {
                    const releaseYear = data.releaseYear;
                    const originalYear = 'originalYear' in data && data.originalYear > 0 ? data.originalYear : null;
                    if (originalYear !== null && originalYear !== releaseYear) {
                        return `${originalYear}${SEPARATOR_STRING}${releaseYear}`;
                    }
                    return String(releaseYear);
                }
                return '';
            },
            id: 'releaseYear',
        },
        {
            format: (data) => {
                if ('releaseDate' in data && data.releaseDate) {
                    if ('originalDate' in data &&
                        data.originalDate &&
                        data.originalDate !== data.releaseDate) {
                        return `${formatPartialIsoDateUTC(data.originalDate)}${SEPARATOR_STRING}${formatPartialIsoDateUTC(data.releaseDate)}`;
                    }
                    return `${formatPartialIsoDateUTC(data.releaseDate)}`;
                }
                return '';
            },
            id: 'releaseDate',
        },
        {
            format: (data) => {
                if ('createdAt' in data && data.createdAt) {
                    return formatDateAbsolute(data.createdAt);
                }
                return '';
            },
            id: 'createdAt',
        },
        {
            format: (data) => {
                if ('lastPlayedAt' in data && data.lastPlayedAt) {
                    return (_jsxs(Group, { align: "center", gap: "xs", children: [_jsx(Icon, { icon: "lastPlayed", size: "sm" }), formatDateRelative(data.lastPlayedAt)] }));
                }
                return '';
            },
            id: 'lastPlayedAt',
        },
        {
            format: (data) => {
                if ('playCount' in data && data.playCount !== null) {
                    return i18n.t('entity.play', { count: data.playCount });
                }
                return '';
            },
            id: 'playCount',
        },
        {
            format: (data) => {
                if ('genres' in data && Array.isArray(data.genres)) {
                    return data.genres
                        .map((genre) => genre.name)
                        .join(', ');
                }
                return '';
            },
            id: 'genres',
            isMuted: true,
        },
        {
            format: (data) => {
                if ('album' in data && data.album) {
                    const song = data;
                    if ('albumId' in song && song.albumId) {
                        const albumData = {
                            id: song.albumId,
                            imageUrl: song.imageUrl,
                            name: song.album,
                        };
                        return (_jsx(Link, { state: { item: albumData }, to: generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, {
                                albumId: song.albumId,
                            }), children: song.album }));
                    }
                    return song.album;
                }
                return '';
            },
            id: 'album',
            isMuted: true,
        },
        {
            format: (data) => {
                if ('songCount' in data && data.songCount !== null) {
                    return i18n.t('entity.trackWithCount', { count: data.songCount });
                }
                return '';
            },
            id: 'songCount',
        },
        {
            format: (data) => {
                if ('albumCount' in data && data.albumCount !== null) {
                    return i18n.t('entity.albumWithCount', { count: data.albumCount });
                }
                return '';
            },
            id: 'albumCount',
        },
        {
            format: (data) => {
                if ('userFavorite' in data) {
                    return data.userFavorite ? '★' : '';
                }
                return '';
            },
            id: 'userFavorite',
        },
    ];
};
export const getDataRowsCount = () => {
    return getDataRows().length;
};
const getImageUrl = (data) => {
    if (data && 'imageUrl' in data) {
        return data.imageUrl || undefined;
    }
    return undefined;
};
const GenreImagePlaceholder = ({ className, name }) => {
    const { color, isLight } = useMemo(() => stringToColor(name), [name]);
    return (_jsx("div", { className: className, style: {
            backgroundColor: color,
            color: isLight ? '#000' : '#fff',
        }, children: _jsx("span", { className: styles.genrePlaceholderText, children: name }) }));
};
const getItemNavigationPath = (data, itemType) => {
    if (!data || !('id' in data) || !data.id) {
        return null;
    }
    const effectiveItemType = '_itemType' in data && data._itemType ? data._itemType : itemType;
    return getTitlePath(effectiveItemType, data.id);
};
const ItemCardRow = memo(({ data, index, row, type, }) => {
    const alignmentClass = row.align === 'center'
        ? styles['align-center']
        : row.align === 'end'
            ? styles['align-end']
            : styles['align-start'];
    // All rows except the first one (index 0) should be muted
    const isMuted = index > 0 || row.isMuted;
    const formattedContent = useMemo(() => {
        if (!data) {
            return null;
        }
        return row.format(data);
    }, [data, row]);
    if (!data) {
        return (_jsx("div", { className: clsx(styles.row, alignmentClass, {
                [styles.compact]: type === 'compact',
                [styles.default]: type === 'default',
                [styles.muted]: isMuted,
                [styles.poster]: type === 'poster',
            }), children: "\u00A0" }));
    }
    return (_jsx(Text, { className: clsx(styles.row, alignmentClass, {
            [styles.bold]: index === 0,
            [styles.compact]: type === 'compact',
            [styles.default]: type === 'default',
            [styles.muted]: isMuted,
            [styles.poster]: type === 'poster',
        }), size: index > 0 ? 'sm' : 'md', children: formattedContent }));
});
ItemCardRow.displayName = 'ItemCardRow';
export const MemoizedItemCard = memo(ItemCard);
