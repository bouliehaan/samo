import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import styles from './sidebar.module.css';
import { useItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { useIsRadioActive, useRadioPlayer, } from '/@/renderer/features/radio/hooks/use-radio-player';
import { LibrarySidebar } from '/@/renderer/features/sidebar/components/library-sidebar';
import { useNowPlaying } from '/@/renderer/hooks/use-now-playing';
import { useAppStore, useAppStoreActions, useFullScreenPlayerStore, useGeneralSettings, usePlayerSong, useSetFullScreenPlayerStore, } from '/@/renderer/store';
import { useWindowSettings } from '/@/renderer/store/settings.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Center } from '/@/shared/components/center/center';
import { Icon } from '/@/shared/components/icon/icon';
import { ImageUnloader } from '/@/shared/components/image/image';
import { Tooltip } from '/@/shared/components/tooltip/tooltip';
import { ExplicitStatus, LibraryItem } from '/@/shared/types/domain-types';
import { Platform } from '/@/shared/types/types';
export const Sidebar = () => {
    const { windowBarStyle } = useWindowSettings();
    const sidebarImageEnabled = useAppStore((state) => state.sidebar.image);
    const showImage = sidebarImageEnabled;
    const isCustomWindowBar = windowBarStyle === Platform.WINDOWS || windowBarStyle === Platform.MACOS;
    return (_jsxs("div", { className: clsx(styles.container, {
            [styles.customBar]: isCustomWindowBar,
        }), id: "left-sidebar", children: [_jsx(LibrarySidebar, {}), _jsx(AnimatePresence, { initial: false, mode: "popLayout", children: showImage && _jsx(SidebarImage, {}) })] }));
};
const SidebarImage = () => {
    const { t } = useTranslation();
    const leftWidth = useAppStore((state) => state.sidebar.leftWidth);
    const { setSideBar } = useAppStoreActions();
    const currentSong = usePlayerSong();
    const nowPlaying = useNowPlaying();
    const isRadioActive = useIsRadioActive();
    const { currentStationArt, isPlaying: isRadioPlaying } = useRadioPlayer();
    const { blurExplicitImages } = useGeneralSettings();
    const isLongFormMode = nowPlaying.source === 'audiobook' || nowPlaying.source === 'podcast';
    const imageUrl = useItemImageUrl({
        id: currentSong?.imageId || undefined,
        itemType: LibraryItem.SONG,
        serverId: currentSong?._serverId,
        type: 'sidebar',
    });
    const radioImageUrl = useItemImageUrl({
        id: isRadioActive ? currentStationArt?.imageId || undefined : undefined,
        imageUrl: isRadioActive ? currentStationArt?.imageUrl || undefined : undefined,
        itemType: LibraryItem.RADIO_STATION,
        serverId: isRadioActive ? currentStationArt?.serverId : undefined,
        type: 'sidebar',
    });
    const isPlayingRadio = isRadioActive && isRadioPlaying;
    const isNonMusicMode = isPlayingRadio || isLongFormMode;
    const isSongDefined = Boolean(currentSong?.id);
    const setFullScreenPlayerStore = useSetFullScreenPlayerStore();
    const { expanded: isFullScreenPlayerExpanded } = useFullScreenPlayerStore();
    const expandFullScreenPlayer = () => {
        setFullScreenPlayerStore({ expanded: !isFullScreenPlayerExpanded });
    };
    const handleToggleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!currentSong || isNonMusicMode) {
            return;
        }
        if (isSongDefined && !isFullScreenPlayerExpanded) {
            ContextMenuController.call({
                cmd: { items: [currentSong], type: LibraryItem.SONG },
                event: e,
            });
        }
    };
    return (_jsxs(motion.div, { animate: { opacity: 1, y: 0 }, className: styles.imageContainer, exit: { opacity: 0, y: 200 }, initial: { opacity: 0, y: 200 }, onClick: expandFullScreenPlayer, onContextMenu: handleToggleContextMenu, role: "button", style: {
            '--sidebar-image-height': leftWidth,
        }, transition: { duration: 0.3, ease: 'easeInOut' }, children: [_jsx(Tooltip, { label: t('player.toggleFullscreenPlayer', {
                    postProcess: 'sentenceCase',
                }), children: isLongFormMode && nowPlaying.artwork ? (_jsx("img", { alt: nowPlaying.title || 'Cover art', className: styles.sidebarImage, loading: "eager", src: nowPlaying.artwork })) : isLongFormMode ? (_jsx(Center, { className: styles.sidebarImage, style: {
                        background: 'var(--theme-colors-surface)',
                        borderRadius: 'var(--theme-card-default-radius)',
                        height: '100%',
                        width: '100%',
                    }, children: _jsx(Icon, { color: "muted", icon: nowPlaying.source === 'podcast' ? 'radio' : 'itemAlbum', size: "40%" }) })) : isRadioActive && radioImageUrl ? (_jsx("img", { className: styles.sidebarImage, loading: "eager", src: radioImageUrl })) : isRadioActive ? (_jsx(Center, { className: styles.sidebarImage, style: {
                        background: 'var(--theme-colors-surface)',
                        borderRadius: 'var(--theme-card-default-radius)',
                        height: '100%',
                        width: '100%',
                    }, children: _jsx(Icon, { color: "muted", icon: "radio", size: "40%" }) })) : imageUrl ? (_jsx("img", { className: clsx(styles.sidebarImage, {
                        [styles.censored]: currentSong?.explicitStatus === ExplicitStatus.EXPLICIT &&
                            blurExplicitImages,
                    }), loading: "eager", src: imageUrl })) : (_jsx(ImageUnloader, { icon: "emptySongImage" })) }), _jsx(ActionIcon, { icon: "arrowDownS", iconProps: {
                    size: 'lg',
                }, onClick: (e) => {
                    e.stopPropagation();
                    setSideBar({ image: false });
                }, opacity: 0.8, radius: "md", style: {
                    cursor: 'default',
                    position: 'absolute',
                    right: '1rem',
                    top: '1rem',
                }, tooltip: {
                    label: t('common.collapse', {
                        postProcess: 'titleCase',
                    }),
                    openDelay: 500,
                } })] }, "sidebar-image"));
};
