import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { t } from 'i18next';
import { motion } from 'motion/react';
import { memo, useMemo } from 'react';
import styles from './item-card-controls.module.css';
import { PlayButton } from '/@/renderer/features/shared/components/play-button';
import { PlayTooltip } from '/@/renderer/features/shared/components/play-button-group';
import { useIsMutatingCreateFavorite } from '/@/renderer/features/shared/mutations/create-favorite-mutation';
import { useIsMutatingDeleteFavorite } from '/@/renderer/features/shared/mutations/delete-favorite-mutation';
import { animationVariants } from '/@/shared/components/animations/animation-variants';
import { Icon } from '/@/shared/components/icon/icon';
import { Tooltip } from '/@/shared/components/tooltip/tooltip';
import { LibraryItem, } from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';
const containerProps = {
    compact: {
        animate: 'show',
        exit: 'hidden',
        initial: 'hidden',
        variants: animationVariants.combine(animationVariants.zoomIn, animationVariants.fadeIn),
    },
    default: {
        animate: 'show',
        exit: 'hidden',
        initial: 'hidden',
        variants: animationVariants.combine(animationVariants.zoomIn, animationVariants.fadeIn),
    },
    poster: {
        animate: 'show',
        exit: 'hidden',
        initial: 'hidden',
        variants: animationVariants.combine(animationVariants.slideInUp, animationVariants.fadeIn),
    },
};
const createPlayHandler = (controls, item, internalState, itemType, playType) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!item) {
        return;
    }
    const isSongItem = itemType === LibraryItem.SONG ||
        itemType === LibraryItem.PLAYLIST_SONG ||
        item._itemType === LibraryItem.SONG;
    if (isSongItem && controls?.onDoubleClick && internalState) {
        const rowId = internalState.extractRowId(item);
        if (rowId) {
            const index = internalState.findItemIndex(rowId);
            return controls.onDoubleClick({
                event: null,
                index,
                internalState,
                item,
                itemType,
                meta: {
                    playType,
                },
            });
        }
    }
    controls?.onPlay?.({
        event: e,
        internalState,
        item,
        itemType,
        playType,
    });
};
const createFavoriteHandler = (controls, item, internalState, itemType) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!item) {
        return;
    }
    const newFavorite = !item.userFavorite;
    controls?.onFavorite?.({
        event: e,
        favorite: newFavorite,
        internalState,
        item,
        itemType,
    });
};
const moreDoubleClickHandler = (e) => {
    e.stopPropagation();
    e.preventDefault();
};
const createMoreHandler = (controls, item, internalState, itemType) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    controls?.onMore?.({
        event: e,
        internalState,
        item,
        itemType,
    });
};
const createExpandHandler = (controls, item, internalState, itemType) => (e) => {
    e.stopPropagation();
    e.preventDefault();
    controls?.onExpand?.({
        event: e,
        internalState,
        item,
        itemType,
    });
};
export const ItemCardControls = ({ controls, enableExpansion, internalState, item, itemType, type = 'default', }) => {
    const playNowHandler = useMemo(() => createPlayHandler(controls, item, internalState, itemType, Play.NOW), [controls, item, internalState, itemType]);
    const playShuffleHandler = useMemo(() => createPlayHandler(controls, item, internalState, itemType, Play.SHUFFLE), [controls, item, internalState, itemType]);
    const favoriteHandler = useMemo(() => createFavoriteHandler(controls, item, internalState, itemType), [controls, item, internalState, itemType]);
    const moreHandler = useMemo(() => createMoreHandler(controls, item, internalState, itemType), [controls, item, internalState, itemType]);
    const expandHandler = useMemo(() => createExpandHandler(controls, item, internalState, itemType), [controls, item, internalState, itemType]);
    const isFavorite = item?.userFavorite ?? false;
    const showShuffle = itemType !== LibraryItem.ALBUM && itemType !== LibraryItem.SONG;
    return (_jsxs(motion.div, { className: clsx(styles.container), ...containerProps[type], children: [controls?.onPlay && (_jsxs(Tooltip.Group, { children: [_jsx(PlayTooltip, { showShuffleHint: false, type: Play.NOW, children: _jsx(PlayButton, { classNames: clsx(styles.playButton, styles.primary, {
                                [styles.singlePrimary]: !showShuffle,
                            }), onClick: playNowHandler }) }), showShuffle && (_jsx(Tooltip, { label: t('action.shuffle', { postProcess: 'sentenceCase' }), children: _jsx(PlayButton, { classNames: clsx(styles.playButton, styles.secondary, styles.right), icon: "mediaShuffle", onClick: playShuffleHandler }) }))] })), controls?.onFavorite && (_jsx(FavoriteButton, { isFavorite: isFavorite, onClick: favoriteHandler })), controls?.onMore && (_jsx(SecondaryButton, { className: styles.options, icon: "ellipsisHorizontal", onClick: moreHandler, onDoubleClick: moreDoubleClickHandler })), controls?.onExpand && enableExpansion && (_jsx(SecondaryButton, { className: styles.expand, icon: "arrowDownS", onClick: expandHandler }))] }));
};
const FavoriteButton = memo(({ isFavorite, onClick, }) => {
    const isMutatingCreate = useIsMutatingCreateFavorite();
    const isMutatingDelete = useIsMutatingDeleteFavorite();
    const isMutating = isMutatingCreate || isMutatingDelete;
    const favoriteIconProps = useMemo(() => ({
        color: isFavorite ? 'primary' : 'default',
        fill: isFavorite ? 'primary' : undefined,
    }), [isFavorite]);
    return (_jsx(SecondaryButton, { className: styles.favorite, disabled: isMutating, icon: "favorite", iconProps: favoriteIconProps, onClick: onClick }));
}, (prev, next) => prev.isFavorite === next.isFavorite);
const SecondaryButton = memo(({ className, disabled, icon, iconProps, onClick, onDoubleClick, }) => {
    const handleClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        onClick?.(e);
    };
    const handleDoubleClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        onDoubleClick?.(e);
    };
    const handleMouseDown = (e) => {
        e.stopPropagation();
        e.preventDefault();
    };
    return (_jsx("button", { className: clsx(styles.secondaryButton, className), disabled: disabled, onClick: handleClick, onDoubleClick: handleDoubleClick, onMouseDown: handleMouseDown, children: _jsx(Icon, { icon: icon, size: "lg", ...iconProps }) }));
});
