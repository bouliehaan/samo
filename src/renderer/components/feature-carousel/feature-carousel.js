import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generatePath, Link } from 'react-router';
import styles from './feature-carousel.module.css';
import { ItemImage, useItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { BackgroundOverlay } from '/@/renderer/features/shared/components/library-background-overlay';
import { PlayButtonGroup } from '/@/renderer/features/shared/components/play-button-group';
import { useContainerQuery, useFastAverageColor } from '/@/renderer/hooks';
import { AppRoute } from '/@/renderer/router/routes';
import { useCurrentServer } from '/@/renderer/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Badge } from '/@/shared/components/badge/badge';
import { Group } from '/@/shared/components/group/group';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';
const containerVariants = {
    animate: {},
    exit: {},
    initial: {},
};
const itemVariants = {
    animate: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.2,
            ease: 'easeOut',
        },
        y: 0,
    },
    exit: {
        opacity: 0,
        transition: {
            duration: 0.3,
            ease: 'easeIn',
        },
        y: 0,
    },
    initial: {
        opacity: 0,
        y: 0,
    },
};
const getItemsPerRow = (breakpoints) => {
    if (breakpoints.is3xl)
        return 6;
    if (breakpoints.is2xl)
        return 5;
    if (breakpoints.isXl)
        return 5;
    if (breakpoints.isLg)
        return 4;
    if (breakpoints.isMd)
        return 3;
    if (breakpoints.isSm)
        return 2;
    return 2;
};
const CarouselItem = ({ album }) => {
    const imageUrl = useItemImageUrl({
        id: album.imageId || undefined,
        itemType: LibraryItem.ALBUM,
        type: 'itemCard',
    });
    const { background: backgroundColor } = useFastAverageColor({
        algorithm: 'dominant',
        src: imageUrl || null,
        srcLoaded: true,
    });
    const server = useCurrentServer();
    const { addToQueueByFetch } = usePlayer();
    const handlePlay = (type) => {
        if (!server?.id)
            return;
        addToQueueByFetch(server.id, [album.id], LibraryItem.ALBUM, type);
    };
    return (_jsxs("div", { className: styles.carouselItem, children: [_jsx(BackgroundOverlay, { backgroundColor: backgroundColor, opacity: 0.7 }), _jsx(Link, { className: styles.carouselLink, state: { item: album }, to: generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, {
                    albumId: album.id,
                }), children: _jsxs("div", { className: styles.content, children: [_jsx("div", { className: styles.titleSection, children: _jsx(Text, { className: styles.title, fw: 700, lineClamp: 2, size: "lg", ta: "center", children: album.name }) }), _jsxs("div", { className: styles.imageSection, children: [_jsx(ItemImage, { className: styles.albumImage, containerClassName: styles.albumImageContainer, enableDebounce: false, enableViewport: false, explicitStatus: album.explicitStatus, fetchPriority: "high", id: album.imageId, itemType: LibraryItem.ALBUM, src: imageUrl, type: "itemCard" }), _jsx("div", { className: styles.playButtonOverlay, children: _jsx(PlayButtonGroup, { onPlay: handlePlay }) })] }), _jsx("div", { className: styles.metadataSection, children: _jsxs(Stack, { gap: "sm", children: [album.albumArtists?.[0] && (_jsx(Text, { className: styles.artist, fw: 500, lineClamp: 1, size: "md", ta: "center", children: album.albumArtists[0].name })), _jsxs(Group, { gap: "xs", justify: "center", wrap: "wrap", children: [album.genres?.slice(0, 2).map((genre) => (_jsx(Badge, { classNames: { label: styles.badge }, size: "sm", variant: "transparent", children: genre.name }, `genre-${genre.id}`))), album.releaseYear && (_jsx(Badge, { classNames: { label: styles.badge }, size: "sm", variant: "transparent", children: album.releaseYear }))] })] }) })] }) })] }));
};
export const FeatureCarousel = ({ data, onNearEnd }) => {
    const [startIndex, setStartIndex] = useState(0);
    const directionRef = useRef({ isNext: true });
    const { is2xl, is3xl, isLg, isMd, isSm, isXl, ref: containerRef, } = useContainerQuery({
        '2xl': 1920,
        '3xl': 2560,
        lg: 1024,
        md: 768,
        sm: 640,
        xl: 1440,
    });
    const itemsPerRow = useMemo(() => getItemsPerRow({ is2xl, is3xl, isLg, isMd, isSm, isXl }), [is2xl, is3xl, isLg, isMd, isSm, isXl]);
    const visibleItems = useMemo(() => {
        if (!data)
            return [];
        const items = [];
        for (let i = 0; i < itemsPerRow; i++) {
            const index = (startIndex + i) % data.length;
            items.push(data[index]);
        }
        return items;
    }, [data, startIndex, itemsPerRow]);
    // Check if we're near the end and trigger loading more
    useEffect(() => {
        if (!data || !onNearEnd)
            return;
        const remainingItems = data.length - startIndex;
        // Trigger when we have less than 2 rows worth of items remaining
        if (remainingItems < itemsPerRow * 2) {
            onNearEnd();
        }
    }, [data, startIndex, itemsPerRow, onNearEnd]);
    const handleNext = useCallback((e) => {
        e?.preventDefault();
        e?.stopPropagation();
        if (!data)
            return;
        directionRef.current = { isNext: true };
        setStartIndex((prev) => (prev + itemsPerRow) % data.length);
    }, [data, itemsPerRow]);
    const handlePrevious = useCallback((e) => {
        e?.preventDefault();
        e?.stopPropagation();
        if (!data)
            return;
        directionRef.current = { isNext: false };
        setStartIndex((prev) => (prev - itemsPerRow + data.length) % data.length);
    }, [data, itemsPerRow]);
    const canNavigate = data && data.length > itemsPerRow;
    const wheelCooldownRef = useRef(0);
    const wheelThreshold = 10;
    const wheelCooldownMs = 250;
    const handleWheel = useCallback((event) => {
        if (!canNavigate || !data) {
            return;
        }
        if (!event.shiftKey) {
            return;
        }
        const now = Date.now();
        const elapsed = now - wheelCooldownRef.current;
        const horizontalDelta = Math.abs(event.deltaY);
        if (horizontalDelta < wheelThreshold || elapsed < wheelCooldownMs) {
            return;
        }
        if (event.deltaY > 0) {
            wheelCooldownRef.current = now;
            handleNext();
        }
        else if (event.deltaY < 0) {
            wheelCooldownRef.current = now;
            handlePrevious();
        }
    }, [canNavigate, data, handleNext, handlePrevious, wheelCooldownMs, wheelThreshold]);
    if (!data || data.length === 0) {
        return null;
    }
    return (_jsxs("div", { className: styles.carouselContainer, onWheel: handleWheel, ref: containerRef, children: [_jsx(AnimatePresence, { initial: false, mode: "popLayout", children: _jsx(motion.div, { animate: "animate", className: styles.carousel, exit: "exit", initial: "initial", style: { '--items-per-row': itemsPerRow }, variants: containerVariants, children: visibleItems.map((album, index) => (_jsx(motion.div, { variants: itemVariants, children: _jsx(CarouselItem, { album: album }) }, `item-${album.id}-${startIndex}-${index}`))) }, `carousel-${startIndex}`) }), data.length > itemsPerRow && (_jsxs(_Fragment, { children: [_jsx(ActionIcon, { className: styles.navArrowLeft, icon: "arrowLeftS", iconProps: { size: 'xl' }, onClick: handlePrevious, radius: "50%", size: "md", styles: {
                            icon: {
                                color: 'white',
                                fill: 'white',
                            },
                        }, variant: "subtle" }), _jsx(ActionIcon, { className: styles.navArrowRight, icon: "arrowRightS", iconProps: { size: 'xl' }, onClick: handleNext, radius: "50%", size: "md", styles: {
                            icon: {
                                color: 'white',
                                fill: 'white',
                            },
                        }, variant: "subtle" })] }))] }));
};
