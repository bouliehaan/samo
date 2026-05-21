import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AnimatePresence, motion } from 'motion/react';
import { memo, useEffect, useLayoutEffect, useRef, useState, } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import styles from './full-screen-player.module.css';
import { useItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { FullScreenPlayerImage } from '/@/renderer/features/player/components/full-screen-player-image';
import { FullScreenPlayerQueue } from '/@/renderer/features/player/components/full-screen-player-queue';
import { useFastAverageColor } from '/@/renderer/hooks';
import { useNowPlaying } from '/@/renderer/hooks/use-now-playing';
import { useFullScreenPlayerStore, useFullScreenPlayerStoreActions, usePlayerData, usePlayerSong, useWindowSettings, } from '/@/renderer/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Group } from '/@/shared/components/group/group';
import { useHotkeys } from '/@/shared/hooks/use-hotkeys';
import { LibraryItem } from '/@/shared/types/domain-types';
const mainBackground = 'var(--theme-colors-background)';
const backgroundImageVariants = {
    closed: {
        opacity: 0,
        transition: {
            duration: 0.8,
            ease: 'linear',
        },
    },
    initial: {
        opacity: 0,
    },
    open: (custom) => {
        const { isOpen } = custom;
        return {
            opacity: isOpen ? 1 : 0,
            transition: {
                duration: 0.4,
                ease: 'linear',
            },
        };
    },
};
const BackgroundImage = memo(({ dynamicBackground, dynamicIsImage }) => {
    const currentSong = usePlayerSong();
    const { nextSong } = usePlayerData();
    const nowPlaying = useNowPlaying();
    const isNonMusicMode = nowPlaying.source === 'audiobook' ||
        nowPlaying.source === 'podcast' ||
        nowPlaying.source === 'radio';
    const musicCurrentImageUrl = useItemImageUrl({
        id: currentSong?.imageId || undefined,
        itemType: LibraryItem.SONG,
        type: 'itemCard',
    });
    const musicNextImageUrl = useItemImageUrl({
        id: nextSong?.imageId || undefined,
        itemType: LibraryItem.SONG,
        type: 'itemCard',
    });
    const currentImageUrl = isNonMusicMode ? nowPlaying.artwork : musicCurrentImageUrl;
    const nextImageUrl = isNonMusicMode ? nowPlaying.artwork : musicNextImageUrl;
    const [imageState, setImageState] = useState({
        bottomImage: nextImageUrl,
        current: 0,
        topImage: currentImageUrl,
    });
    const previousSongRef = useRef(currentSong?._uniqueId);
    const imageStateRef = useRef(imageState);
    // Keep ref in sync
    useEffect(() => {
        imageStateRef.current = imageState;
    }, [imageState]);
    // Update images when song changes
    useEffect(() => {
        const currentImageKey = isNonMusicMode
            ? `${nowPlaying.source}-${nowPlaying.title}-${currentImageUrl ?? 'none'}`
            : currentSong?._uniqueId;
        if (currentImageKey === previousSongRef.current) {
            return;
        }
        const isTop = imageStateRef.current.current === 0;
        setImageState({
            bottomImage: isTop ? currentImageUrl : nextImageUrl,
            current: isTop ? 1 : 0,
            topImage: isTop ? nextImageUrl : currentImageUrl,
        });
        previousSongRef.current = currentImageKey;
    }, [
        isNonMusicMode,
        nowPlaying.source,
        nowPlaying.title,
        currentSong?._uniqueId,
        currentImageUrl,
        nextSong?._uniqueId,
        nextImageUrl,
    ]);
    if (!dynamicBackground || !dynamicIsImage) {
        return null;
    }
    const getBackgroundImageUrl = (imageUrl, songId, albumId) => {
        if (!imageUrl || !songId || !albumId) {
            return imageUrl;
        }
        return imageUrl.replace(songId, albumId);
    };
    // Determine which song IDs to use for keys and image URLs
    const mediaImageKey = `${nowPlaying.source}-${nowPlaying.title}-${nowPlaying.artwork ?? 'none'}`;
    const topSongId = isNonMusicMode
        ? mediaImageKey
        : imageState.current === 0
            ? currentSong?._uniqueId
            : nextSong?._uniqueId;
    const bottomSongId = isNonMusicMode
        ? mediaImageKey
        : imageState.current === 0
            ? nextSong?._uniqueId
            : currentSong?._uniqueId;
    const topSong = isNonMusicMode ? undefined : imageState.current === 0 ? currentSong : nextSong;
    const bottomSong = isNonMusicMode
        ? undefined
        : imageState.current === 0
            ? nextSong
            : currentSong;
    return (_jsxs(AnimatePresence, { initial: false, mode: "sync", children: [imageState.current === 0 && imageState.topImage && (_jsx(motion.div, { animate: "open", className: styles.backgroundImage, custom: { isOpen: imageState.current === 0 }, exit: "closed", initial: "closed", style: {
                    backgroundImage: imageState.topImage
                        ? `url("${getBackgroundImageUrl(imageState.topImage, topSong?.id, topSong?.albumId)}"), url("${imageState.topImage}")`
                        : undefined,
                }, variants: backgroundImageVariants }, `top-${topSongId || 'none'}`)), imageState.current === 1 && imageState.bottomImage && (_jsx(motion.div, { animate: "open", className: styles.backgroundImage, custom: { isOpen: imageState.current === 1 }, exit: "closed", initial: "closed", style: {
                    backgroundImage: imageState.bottomImage
                        ? `url("${getBackgroundImageUrl(imageState.bottomImage, bottomSong?.id, bottomSong?.albumId)}"), url("${imageState.bottomImage}")`
                        : undefined,
                }, variants: backgroundImageVariants }, `bottom-${bottomSongId || 'none'}`))] }));
});
BackgroundImage.displayName = 'BackgroundImage';
const BackgroundImageOverlay = memo(({ dynamicBackground, dynamicImageBlur }) => {
    if (!dynamicBackground) {
        return null;
    }
    return (_jsx("div", { className: styles.backgroundImageOverlay, style: {
            '--image-blur': `${dynamicImageBlur ?? 0}rem`,
        } }));
});
BackgroundImageOverlay.displayName = 'BackgroundImageOverlay';
const Controls = () => {
    const { t } = useTranslation();
    const { expanded } = useFullScreenPlayerStore();
    const { setStore } = useFullScreenPlayerStoreActions();
    const handleToggleFullScreenPlayer = () => {
        setStore({ expanded: !expanded, visualizerExpanded: false });
    };
    useHotkeys([['Escape', handleToggleFullScreenPlayer]]);
    return (_jsx(Group, { className: styles.controlsContainer, gap: "sm", pos: "absolute", style: {
            background: 'rgb(var(--theme-colors-background-transparent), 0%)',
            left: 0,
            top: 'max(72px, calc(env(titlebar-area-height, 0px) + 0.75rem))',
        }, children: _jsx(ActionIcon, { icon: "arrowDownS", iconProps: { size: 'lg' }, onClick: handleToggleFullScreenPlayer, size: "lg", tooltip: {
                classNames: { tooltip: styles['minimize-tooltip'] },
                label: t('common.minimize', { postProcess: 'titleCase' }),
                offset: 2,
                position: 'bottom',
                withinPortal: false,
            }, variant: "subtle" }) }));
};
// The default layout reserves 90px at the bottom for the player bar; everything
// above that (including any native title bar) is part of the main-content row.
// Anchoring this overlay to fill the main-content row exactly avoids the visible
// gap above the player bar that used to appear when this height was hard-coded.
const containerVariants = {
    closed: () => ({
        bottom: 0,
        height: 'auto',
        left: 0,
        position: 'absolute',
        right: 0,
        top: '100vh',
        transition: {
            duration: 0.5,
            ease: 'easeInOut',
        },
        y: 0,
    }),
    open: (custom) => {
        const { background, dynamicBackground } = custom;
        return {
            backgroundColor: dynamicBackground ? background : mainBackground,
            bottom: 0,
            height: 'auto',
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            transition: {
                delay: 0.1,
                duration: 0.5,
                ease: 'easeInOut',
            },
            y: 0,
        };
    },
};
const PlayerContainer = memo(({ children, dynamicBackground, dynamicIsImage, windowBarStyle }) => {
    const currentSong = usePlayerSong();
    const nowPlaying = useNowPlaying();
    const isNonMusicMode = nowPlaying.source === 'audiobook' ||
        nowPlaying.source === 'podcast' ||
        nowPlaying.source === 'radio';
    const musicImageUrl = useItemImageUrl({
        id: currentSong?.imageId || undefined,
        imageUrl: currentSong?.imageUrl,
        itemType: LibraryItem.SONG,
        type: 'itemCard',
    });
    const imageUrl = isNonMusicMode ? nowPlaying.artwork : musicImageUrl;
    const { background } = useFastAverageColor({
        algorithm: 'dominant',
        src: imageUrl,
        srcLoaded: true,
    });
    return (_jsxs(motion.div, { animate: "open", className: styles.container, custom: { background, dynamicBackground, windowBarStyle }, exit: "closed", initial: "closed", transition: { duration: 2 }, variants: containerVariants, children: [_jsx(BackgroundImage, { dynamicBackground: dynamicBackground, dynamicIsImage: dynamicIsImage }), children] }));
});
PlayerContainer.displayName = 'PlayerContainer';
export const FullScreenPlayer = () => {
    const { dynamicBackground, dynamicImageBlur, dynamicIsImage } = useFullScreenPlayerStore();
    const { setStore } = useFullScreenPlayerStoreActions();
    const { windowBarStyle } = useWindowSettings();
    const location = useLocation();
    const isOpenedRef = useRef(null);
    useLayoutEffect(() => {
        if (isOpenedRef.current !== null) {
            setStore({ expanded: false });
        }
        isOpenedRef.current = true;
    }, [location, setStore]);
    return (_jsxs(PlayerContainer, { dynamicBackground: dynamicBackground, dynamicIsImage: dynamicIsImage, windowBarStyle: windowBarStyle, children: [_jsx(Controls, {}), _jsx(BackgroundImageOverlay, { dynamicBackground: dynamicBackground, dynamicImageBlur: dynamicImageBlur }), _jsxs("div", { className: styles.responsiveContainer, children: [_jsx(FullScreenPlayerImage, {}), _jsx(FullScreenPlayerQueue, {})] })] }));
};
