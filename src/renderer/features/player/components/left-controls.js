import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import clsx from 'clsx';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { generatePath, Link } from 'react-router';
import { shallow } from 'zustand/shallow';
import styles from './left-controls.module.css';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { JOINED_ARTISTS_MUTED_PROPS, JoinedArtists, } from '/@/renderer/features/albums/components/joined-artists';
import { ContextMenuController } from '/@/renderer/features/context-menu/context-menu-controller';
import { RadioMetadataDisplay } from '/@/renderer/features/player/components/radio-metadata-display';
import { useIsRadioActive, useRadioPlayer, } from '/@/renderer/features/radio/hooks/use-radio-player';
import { useNowPlaying } from '/@/renderer/hooks/use-now-playing';
import { AppRoute } from '/@/renderer/router/routes';
import { useAppStore, useAppStoreActions, useFullScreenPlayerStore, useHotkeySettings, usePlayerSong, useSetFullScreenPlayerStore, } from '/@/renderer/store';
import { useAudiobookItem } from '/@/renderer/store/audiobook.store';
import { useCurrentServerWithCredential } from '/@/renderer/store/auth.store';
import { usePodcastItem, usePodcastServer } from '/@/renderer/store/podcast.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Center } from '/@/shared/components/center/center';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Text } from '/@/shared/components/text/text';
import { Tooltip } from '/@/shared/components/tooltip/tooltip';
import { PlaybackSelectors } from '/@/shared/constants/playback-selectors';
import { useHotkeys } from '/@/shared/hooks/use-hotkeys';
import { LibraryItem } from '/@/shared/types/domain-types';
export const LeftControls = () => {
    const { t } = useTranslation();
    const { setSideBar } = useAppStoreActions();
    const { expanded: isFullScreenPlayerExpanded, visualizerExpanded: isFullScreenVisualizerExpanded, } = useFullScreenPlayerStore();
    const setFullScreenPlayerStore = useSetFullScreenPlayerStore();
    const { collapsed, image } = useAppStore((state) => ({
        collapsed: state.sidebar.collapsed,
        image: state.sidebar.image,
    }), shallow);
    const currentSong = usePlayerSong();
    const nowPlaying = useNowPlaying();
    const podcastItem = usePodcastItem();
    const podcastServer = usePodcastServer();
    const audiobookItem = useAudiobookItem();
    const currentServer = useCurrentServerWithCredential();
    const isAudiobookMode = nowPlaying.source === 'audiobook';
    const isPodcastMode = nowPlaying.source === 'podcast';
    const isLongFormMode = isAudiobookMode || isPodcastMode;
    const longFormTitle = nowPlaying.title;
    const longFormArtist = nowPlaying.artist;
    const longFormSubtitle = nowPlaying.subtitle;
    const longFormCoverUrl = nowPlaying.artwork ?? '';
    const isRadioActive = useIsRadioActive();
    const { currentStationArt } = useRadioPlayer();
    const { bindings } = useHotkeySettings();
    const isRadioMode = isRadioActive;
    const hasRadioStationImage = Boolean(currentStationArt?.imageId || currentStationArt?.imageUrl);
    const hideImage = image && !collapsed;
    const isSongDefined = Boolean(currentSong?.id) && !isRadioMode && !isLongFormMode;
    const title = currentSong?.name;
    const artists = currentSong?.artists;
    const handleToggleFullScreenPlayer = (e) => {
        // don't toggle if right click
        if (e && 'button' in e && e.button === 2) {
            return;
        }
        e?.stopPropagation();
        const shouldClose = isFullScreenPlayerExpanded || isFullScreenVisualizerExpanded;
        if (shouldClose) {
            setFullScreenPlayerStore({ expanded: false, visualizerExpanded: false });
        }
        else {
            setFullScreenPlayerStore({ expanded: true });
        }
    };
    const handleToggleSidebarImage = (e) => {
        e?.stopPropagation();
        setSideBar({ image: true });
    };
    const handleToggleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isPodcastMode && podcastItem && podcastServer) {
            ContextMenuController.call({
                cmd: { items: [podcastItem], server: podcastServer, type: 'podcast' },
                event: e,
            });
        }
        else if (isAudiobookMode && audiobookItem && currentServer) {
            ContextMenuController.call({
                cmd: { items: [audiobookItem], server: currentServer, type: 'audiobook' },
                event: e,
            });
        }
        else if (currentSong) {
            ContextMenuController.call({
                cmd: { items: [currentSong], type: LibraryItem.SONG },
                event: e,
            });
        }
    };
    const stopPropagation = (e) => e?.stopPropagation();
    useHotkeys([
        [
            bindings.toggleFullscreenPlayer.allowGlobal
                ? ''
                : bindings.toggleFullscreenPlayer.hotkey,
            handleToggleFullScreenPlayer,
        ],
    ]);
    return (_jsx("div", { className: styles.leftControlsContainer, children: _jsxs(LayoutGroup, { children: [_jsx(AnimatePresence, { initial: false, mode: "popLayout", children: !hideImage && (_jsx("div", { className: styles.imageWrapper, children: _jsxs(motion.div, { animate: { opacity: 1, scale: 1, x: 0 }, className: styles.image, exit: { opacity: 0, x: -50 }, initial: { opacity: 0, x: -50 }, onClick: handleToggleFullScreenPlayer, onContextMenu: handleToggleContextMenu, role: "button", transition: { duration: 0.2, ease: 'easeIn' }, children: [_jsx(Tooltip, { label: t('player.toggleFullscreenPlayer', {
                                        postProcess: 'sentenceCase',
                                    }), openDelay: 0, children: isRadioMode && hasRadioStationImage ? (_jsx(ItemImage, { className: clsx(styles.playerbarImage, PlaybackSelectors.playerCoverArt), enableDebounce: false, enableViewport: false, fetchPriority: "high", id: currentStationArt?.imageId ?? undefined, itemType: LibraryItem.RADIO_STATION, serverId: currentStationArt?.serverId, src: currentStationArt?.imageUrl ?? '', type: "table" })) : isRadioMode ? (_jsx(Center, { className: clsx(styles.playerbarImage, styles.radioImage), children: _jsx(Icon, { color: "muted", icon: "radio", size: "40%" }) })) : isLongFormMode && longFormCoverUrl ? (_jsx("img", { alt: longFormTitle || 'Cover art', className: clsx(styles.playerbarImage, PlaybackSelectors.playerCoverArt), src: longFormCoverUrl })) : (_jsx(ItemImage, { className: clsx(styles.playerbarImage, PlaybackSelectors.playerCoverArt), enableDebounce: false, enableViewport: false, explicitStatus: currentSong?.explicitStatus, fetchPriority: "high", id: currentSong?.imageId, itemType: LibraryItem.SONG, serverId: currentSong?._serverId, type: "table" })) }), !collapsed && (_jsx(ActionIcon, { icon: "arrowUpS", iconProps: { size: 'xl' }, onClick: handleToggleSidebarImage, opacity: 0.8, radius: "md", size: "xs", style: {
                                        cursor: 'default',
                                        position: 'absolute',
                                        right: 2,
                                        top: 2,
                                    }, tooltip: {
                                        label: t('common.expand', {
                                            postProcess: 'titleCase',
                                        }),
                                        openDelay: 0,
                                    } }))] }, "playerbar-image") })) }), _jsx(motion.div, { className: styles.metadataStack, layout: "position", children: isRadioMode ? (_jsx(RadioMetadataDisplay, { onStopPropagation: stopPropagation, onToggleContextMenu: handleToggleContextMenu })) : isLongFormMode ? (_jsxs(_Fragment, { children: [_jsx("div", { className: styles.lineItem, onClick: stopPropagation, children: _jsx(Group, { align: "center", gap: "xs", wrap: "nowrap", children: _jsx(Text, { className: PlaybackSelectors.songTitle, fw: 500, onContextMenu: handleToggleContextMenu, overflow: "hidden", children: longFormTitle || '—' }) }) }), _jsx("div", { className: clsx(styles.lineItem, styles.secondary, PlaybackSelectors.songArtist), onClick: stopPropagation, children: isPodcastMode && podcastItem?.id ? (_jsx(Text, { component: Link, isLink: true, isMuted: true, overflow: "hidden", size: "sm", to: generatePath(AppRoute.PODCASTS_DETAIL, {
                                        itemId: podcastItem.id,
                                    }), children: longFormArtist || 'Podcast' })) : (_jsx(Text, { isMuted: true, overflow: "hidden", size: "sm", children: longFormArtist ||
                                        (isPodcastMode ? 'Podcast' : 'Unknown author') })) }), _jsx("div", { className: clsx(styles.lineItem, styles.secondary, PlaybackSelectors.songAlbum), onClick: stopPropagation, children: _jsx(Text, { isMuted: true, overflow: "hidden", size: "sm", children: longFormSubtitle || (isPodcastMode ? 'Podcast' : 'Audiobook') }) })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: styles.lineItem, onClick: stopPropagation, children: _jsxs(Group, { align: "center", gap: "xs", wrap: "nowrap", children: [_jsxs(Text, { className: PlaybackSelectors.songTitle, component: Link, fw: 500, isLink: true, onContextMenu: handleToggleContextMenu, overflow: "hidden", to: AppRoute.NOW_PLAYING, children: [title || '—', currentSong?.trackSubtitle && (_jsxs(Text, { component: "span", isMuted: true, size: "sm", children: [' (', currentSong.trackSubtitle, ')'] }))] }), isSongDefined && (_jsx(ActionIcon, { icon: "ellipsisVertical", onClick: (e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (currentSong) {
                                                    ContextMenuController.call({
                                                        cmd: {
                                                            items: [currentSong],
                                                            type: LibraryItem.SONG,
                                                        },
                                                        event: e,
                                                    });
                                                }
                                            }, size: "xs", styles: {
                                                root: {
                                                    '--ai-size-xs': '1.15rem',
                                                },
                                            }, variant: "subtle" }))] }) }), _jsx("div", { className: clsx(styles.lineItem, styles.secondary, PlaybackSelectors.songArtist), onClick: stopPropagation, children: _jsx(JoinedArtists, { artistName: currentSong?.artistName || '', artists: artists || [], linkProps: {
                                        ...JOINED_ARTISTS_MUTED_PROPS.linkProps,
                                        size: 'md',
                                    }, rootTextProps: {
                                        ...JOINED_ARTISTS_MUTED_PROPS.rootTextProps,
                                        size: 'md',
                                    } }) }), _jsx("div", { className: clsx(styles.lineItem, styles.secondary, PlaybackSelectors.songAlbum), onClick: stopPropagation, children: _jsx(Text, { component: Link, fw: 500, isLink: true, overflow: "hidden", size: "md", to: currentSong?.albumId
                                        ? generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, {
                                            albumId: currentSong.albumId,
                                        })
                                        : '', children: currentSong?.album || '—' }) })] })) })] }) }));
};
