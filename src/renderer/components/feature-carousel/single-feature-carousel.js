import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generatePath, Link } from 'react-router';
import styles from './feature-carousel.module.css';
import { ItemImage, useItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { BackgroundOverlay } from '/@/renderer/features/shared/components/library-background-overlay';
import { calculateTitleSize } from '/@/renderer/features/shared/components/library-header';
import { PlayButtonGroup } from '/@/renderer/features/shared/components/play-button-group';
import { useContainerQuery, useFastAverageColor } from '/@/renderer/hooks';
import { AppRoute } from '/@/renderer/router/routes';
import { useCurrentServer } from '/@/renderer/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Group } from '/@/shared/components/group/group';
import { Separator } from '/@/shared/components/separator/separator';
import { Stack } from '/@/shared/components/stack/stack';
import { TextTitle } from '/@/shared/components/text-title/text-title';
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
// const CAROUSEL_AUTOPLAY_INTERVAL = 10000;
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
    const metadataItems = useMemo(() => {
        return [
            ...(album.genres?.slice(0, 2).map((genre) => genre.name) || []),
            album.releaseYear ? album.releaseYear.toString() : null,
        ].filter(Boolean);
    }, [album]);
    return (_jsxs("div", { className: styles.carouselItem, children: [imageUrl && (_jsx("div", { className: styles.blurredBackground, style: {
                    backgroundImage: `url(${imageUrl})`,
                    filter: 'blur(3rem)',
                } })), _jsx(BackgroundOverlay, { backgroundColor: backgroundColor, opacity: 0.7 }), _jsx(Link, { className: styles.carouselLink, state: { item: album }, to: generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, {
                    albumId: album.id,
                }), children: _jsxs("div", { className: styles.content, children: [_jsxs("div", { className: styles.imageSection, children: [_jsx(ItemImage, { className: styles.albumImage, containerClassName: styles.albumImageContainer, enableDebounce: false, enableViewport: false, explicitStatus: album.explicitStatus, fetchPriority: "high", id: album.imageId, itemType: LibraryItem.ALBUM, type: "itemCard" }), _jsx("div", { className: styles.playButtonOverlay, children: _jsx(PlayButtonGroup, { onPlay: handlePlay }) })] }), _jsx("div", { className: styles.metadataSection, children: _jsxs(Stack, { gap: "sm", children: [_jsx(TextTitle, { className: styles.title, fw: 900, lh: 1.1, order: 1, style: { fontSize: calculateTitleSize(album.name) }, ta: "left", children: album.name }), album.albumArtistName && (_jsx(TextTitle, { className: styles.title, fw: 700, lh: 1.1, order: 5, ta: "left", children: album.albumArtistName })), _jsx(Group, { gap: "xs", justify: "flex-start", wrap: "wrap", children: metadataItems.map((item, index) => (_jsxs(Text, { className: styles.title, fw: 600, size: "sm", children: [item, index < metadataItems.length - 1 && _jsx(Separator, {})] }, `metadata-${item}`))) })] }) })] }) })] }));
};
export const SingleFeatureCarousel = ({ data, onNearEnd }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const directionRef = useRef({ isNext: true });
    const { ref: containerRef } = useContainerQuery({
        '2xl': 1920,
        '3xl': 2560,
        lg: 1024,
        md: 768,
        sm: 640,
        xl: 1440,
    });
    // Check if we're near the end and trigger loading more
    useEffect(() => {
        if (!data || !onNearEnd)
            return;
        const remainingItems = data.length - currentIndex;
        // Trigger when we have less than 3 items remaining
        if (remainingItems < 3) {
            onNearEnd();
        }
    }, [data, currentIndex, onNearEnd]);
    // useEffect(() => {
    //     if (!data || data.length <= 1 || isPaused) {
    //         if (intervalRef.current) {
    //             clearInterval(intervalRef.current);
    //             intervalRef.current = null;
    //         }
    //         return;
    //     }
    //     if (intervalRef.current) {
    //         clearInterval(intervalRef.current);
    //     }
    //     intervalRef.current = setInterval(() => {
    //         setCurrentIndex((prev) => (prev + 1) % data.length);
    //         directionRef.current = { isNext: true };
    //     }, CAROUSEL_AUTOPLAY_INTERVAL);
    //     return () => {
    //         if (intervalRef.current) {
    //             clearInterval(intervalRef.current);
    //             intervalRef.current = null;
    //         }
    //     };
    // }, [data, isPaused, intervalKey]);
    const handleNext = useCallback((e) => {
        e?.preventDefault();
        e?.stopPropagation();
        if (!data)
            return;
        directionRef.current = { isNext: true };
        setCurrentIndex((prev) => (prev + 1) % data.length);
        // setIntervalKey((prev) => prev + 1);
    }, [data]);
    const handlePrevious = useCallback((e) => {
        e?.preventDefault();
        e?.stopPropagation();
        if (!data)
            return;
        directionRef.current = { isNext: false };
        setCurrentIndex((prev) => (prev - 1 + data.length) % data.length);
        // setIntervalKey((prev) => prev + 1);
    }, [data]);
    const canNavigate = data && data.length > 1;
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
    const currentAlbum = data[currentIndex];
    return (_jsxs("div", { className: `${styles.carouselContainer} ${styles.singleCarouselContainer}`, 
        // onMouseEnter={() => setIsPaused(true)}
        // onMouseLeave={() => setIsPaused(false)}
        onWheel: handleWheel, ref: containerRef, children: [_jsx(AnimatePresence, { initial: false, mode: "popLayout", children: _jsx(motion.div, { animate: "animate", className: styles.carousel, exit: "exit", initial: "initial", style: { '--items-per-row': 1 }, variants: containerVariants, children: _jsx(motion.div, { variants: itemVariants, children: _jsx(CarouselItem, { album: currentAlbum }) }, `item-${currentAlbum.id}-${currentIndex}`) }, `carousel-${currentIndex}`) }), data.length > 1 && (_jsxs(_Fragment, { children: [_jsx(ActionIcon, { className: styles.navArrowLeft, icon: "arrowLeftS", iconProps: { size: 'xl' }, onClick: handlePrevious, radius: "50%", size: "md", styles: {
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
