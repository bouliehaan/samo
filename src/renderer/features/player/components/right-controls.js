import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { t } from 'i18next';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PopoverPlayQueue } from '/@/renderer/features/now-playing/components/popover-play-queue';
import { AudioPathBadge } from '/@/renderer/features/player/components/audio-path-badge';
import { AudiobookChapterListButton } from '/@/renderer/features/player/components/audiobook-chapter-list-button';
import { PlayerConfig } from '/@/renderer/features/player/components/player-config';
import { CustomPlayerbarSlider } from '/@/renderer/features/player/components/playerbar-slider';
import { SleepTimerButton } from '/@/renderer/features/player/components/sleep-timer-button';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { useCreateFavorite } from '/@/renderer/features/shared/mutations/create-favorite-mutation';
import { useDeleteFavorite } from '/@/renderer/features/shared/mutations/delete-favorite-mutation';
import { useAppStoreActions, useAutoDJSettings, useFullScreenPlayerStore, useHotkeySettings, usePlayerData, usePlayerSong, usePlayerVolumeState, useSetFullScreenPlayerStore, useSettingsStoreActions, useSidebarRightExpanded, useSideQueueType, useVolumeWheelStep, useVolumeWidth, } from '/@/renderer/store';
import { useFullScreenPlayerStoreActions } from '/@/renderer/store/full-screen-player.store';
import { usePlaybackSource } from '/@/renderer/store/playback-owner.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Button } from '/@/shared/components/button/button';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { useHotkeys } from '/@/shared/hooks/use-hotkeys';
import { useMediaQuery } from '/@/shared/hooks/use-media-query';
import { useThrottledCallback } from '/@/shared/hooks/use-throttled-callback';
import { LibraryItem } from '/@/shared/types/domain-types';
const calculateVolumeUp = (volume, volumeWheelStep) => {
    let volumeToSet;
    const newVolumeGreaterThanHundred = volume + volumeWheelStep > 100;
    if (newVolumeGreaterThanHundred) {
        volumeToSet = 100;
    }
    else {
        volumeToSet = volume + volumeWheelStep;
    }
    return volumeToSet;
};
const calculateVolumeDown = (volume, volumeWheelStep) => {
    let volumeToSet;
    const newVolumeLessThanZero = volume - volumeWheelStep < 0;
    if (newVolumeLessThanZero) {
        volumeToSet = 0;
    }
    else {
        volumeToSet = volume - volumeWheelStep;
    }
    return volumeToSet;
};
export const RightControls = () => {
    const currentSong = usePlayerSong();
    const { currentSong: currentSongData } = usePlayerData();
    const badgeSong = currentSong ?? currentSongData;
    const source = usePlaybackSource();
    return (_jsxs(Flex, { align: "flex-end", direction: "column", h: "100%", px: "1rem", py: "0.5rem", children: [_jsx(Group, { h: "calc(100% / 3)", children: _jsx(AutoDJButton, {}) }), _jsxs(Group, { align: "center", gap: "xs", wrap: "nowrap", children: [(source === 'music' || source == null) && (_jsx(AudioPathBadge, { compact: true, inline: true, mode: "playerbar", song: badgeSong })), _jsx(AudiobookChapterListButton, {}), _jsx(SleepTimerButton, {}), _jsx(PlayerConfig, {}), _jsx(LyricsButton, {}), _jsx(FavoriteButton, {}), _jsx(QueueButton, {}), _jsx(VolumeButton, {})] }), _jsx(Group, { h: "calc(100% / 3)" })] }));
};
const AutoDJButton = () => {
    const { t } = useTranslation();
    const settings = useAutoDJSettings();
    const { setSettings } = useSettingsStoreActions();
    const toggleAutoDJ = () => {
        setSettings({
            autoDJ: {
                ...settings,
                enabled: !settings.enabled,
            },
        });
    };
    return (_jsx(Button, { onClick: (e) => {
            e.stopPropagation();
            toggleAutoDJ();
        }, size: "compact-xs", style: { color: settings.enabled ? 'var(--theme-colors-primary)' : undefined }, uppercase: true, variant: "transparent", children: t('setting.autoDJ') }));
};
const QueueButton = () => {
    const { t } = useTranslation();
    const isSidebarRightExpanded = useSidebarRightExpanded();
    const { setSideBar } = useAppStoreActions();
    const sideQueueType = useSideQueueType();
    const { bindings } = useHotkeySettings();
    const [popoverOpened, setPopoverOpened] = useState(false);
    const handleToggleQueue = () => {
        if (sideQueueType === 'sideQueue') {
            setSideBar({ rightExpanded: !isSidebarRightExpanded });
        }
        else {
            setPopoverOpened((prev) => !prev);
        }
    };
    const handlePopoverClose = () => {
        setPopoverOpened(false);
    };
    useHotkeys([
        [bindings.toggleQueue.isGlobal ? '' : bindings.toggleQueue.hotkey, handleToggleQueue],
    ]);
    const handleClick = (e) => {
        e.stopPropagation();
        if (sideQueueType === 'sideQueue') {
            return handleToggleQueue();
        }
    };
    if (sideQueueType === 'sideQueue') {
        return (_jsx(ActionIcon, { icon: isSidebarRightExpanded ? 'panelRightClose' : 'panelRightOpen', iconProps: {
                size: 'lg',
            }, onClick: handleClick, size: "sm", tooltip: {
                label: t('player.viewQueue', { postProcess: 'titleCase' }),
                openDelay: 0,
            }, variant: "subtle" }));
    }
    return (_jsx(PopoverPlayQueue, { onClose: handlePopoverClose, onToggle: (e) => {
            e.stopPropagation();
            handleToggleQueue();
        }, opened: popoverOpened }));
};
const LyricsButton = () => {
    const setFullScreenPlayerStore = useSetFullScreenPlayerStore();
    const activeTab = useFullScreenPlayerStore((state) => state.activeTab);
    const { setStore } = useFullScreenPlayerStoreActions();
    const { expanded: isFullScreenPlayerExpanded } = useFullScreenPlayerStore();
    const expandFullScreenPlayer = () => {
        setFullScreenPlayerStore({ expanded: !isFullScreenPlayerExpanded });
    };
    return (_jsx(ActionIcon, { icon: "microphone", iconProps: {
            color: activeTab === 'lyrics' && isFullScreenPlayerExpanded ? 'primary' : undefined,
            size: 'lg',
        }, onClick: (e) => {
            e.stopPropagation();
            if (!isFullScreenPlayerExpanded)
                setStore({ activeTab: 'lyrics' });
            expandFullScreenPlayer();
        }, role: "button", size: "sm", tooltip: {
            label: t('player.lyrics', { postProcess: 'titleCase' }),
            openDelay: 0,
        }, variant: "subtle" }));
};
const FavoriteButton = () => {
    const currentSong = usePlayerSong();
    const { bindings } = useHotkeySettings();
    const addToFavoritesMutation = useCreateFavorite({});
    const removeFromFavoritesMutation = useDeleteFavorite({});
    const handleAddToFavorites = (song) => {
        if (!song?.id)
            return;
        addToFavoritesMutation.mutate({
            apiClientProps: { serverId: song?._serverId || '' },
            query: {
                id: [song.id],
                type: LibraryItem.SONG,
            },
        });
    };
    const handleRemoveFromFavorites = (song) => {
        if (!song?.id)
            return;
        removeFromFavoritesMutation.mutate({
            apiClientProps: { serverId: song?._serverId || '' },
            query: {
                id: [song.id],
                type: LibraryItem.SONG,
            },
        });
    };
    const handleToggleFavorite = (song) => {
        if (!song?.id)
            return;
        if (song.userFavorite) {
            handleRemoveFromFavorites(song);
        }
        else {
            handleAddToFavorites(song);
        }
    };
    useFavoritePreviousSongHotkeys({
        handleAddToFavorites,
        handleRemoveFromFavorites,
        handleToggleFavorite,
    });
    useHotkeys([
        [
            bindings.favoriteCurrentAdd.isGlobal ? '' : bindings.favoriteCurrentAdd.hotkey,
            () => handleAddToFavorites(currentSong),
        ],
        [
            bindings.favoriteCurrentRemove.isGlobal ? '' : bindings.favoriteCurrentRemove.hotkey,
            () => handleRemoveFromFavorites(currentSong),
        ],
        [
            bindings.favoriteCurrentToggle.isGlobal ? '' : bindings.favoriteCurrentToggle.hotkey,
            () => handleToggleFavorite(currentSong),
        ],
    ]);
    return (_jsx(ActionIcon, { icon: "favorite", iconProps: {
            fill: currentSong?.userFavorite ? 'primary' : undefined,
            size: 'lg',
        }, onClick: (e) => {
            e.stopPropagation();
            handleToggleFavorite(currentSong);
        }, size: "sm", tooltip: {
            label: currentSong?.userFavorite
                ? t('player.unfavorite', { postProcess: 'titleCase' })
                : t('player.favorite', { postProcess: 'titleCase' }),
            openDelay: 0,
        }, variant: "subtle" }));
};
const useFavoritePreviousSongHotkeys = ({ handleAddToFavorites, handleRemoveFromFavorites, handleToggleFavorite, }) => {
    const { bindings } = useHotkeySettings();
    const { previousSong } = usePlayerData();
    useHotkeys([
        [
            bindings.favoritePreviousAdd.isGlobal ? '' : bindings.favoritePreviousAdd.hotkey,
            () => handleAddToFavorites(previousSong),
        ],
        [
            bindings.favoritePreviousRemove.isGlobal ? '' : bindings.favoritePreviousRemove.hotkey,
            () => handleRemoveFromFavorites(previousSong),
        ],
        [
            bindings.favoritePreviousToggle.isGlobal ? '' : bindings.favoritePreviousToggle.hotkey,
            () => handleToggleFavorite(previousSong),
        ],
    ]);
    return null;
};
const VolumeButton = () => {
    const { bindings } = useHotkeySettings();
    const { muted, volume } = usePlayerVolumeState();
    const volumeWheelStep = useVolumeWheelStep();
    const volumeWidth = useVolumeWidth();
    const { decreaseVolume, increaseVolume, mediaToggleMute, setVolume } = usePlayer();
    const isMinWidth = useMediaQuery('(max-width: 480px)');
    const [sliderValue, setSliderValue] = useState(volume);
    // Mirror external volume changes (hydration, hotkeys, mute) into the local slider value.
    // This is the only path that updates the slider when the user is not dragging.
    useEffect(() => {
        setSliderValue(volume);
    }, [volume]);
    // The slider fires onChange continuously while dragging. We throttle the store write so
    // the leading edge is responsive and the trailing edge captures the final resting value.
    // Crucially: we only write when the user actually moves the slider — never on mount —
    // so an initial-render `setVolume(volume)` can't overwrite the persisted value before
    // hydration completes.
    const setVolumeThrottled = useThrottledCallback(setVolume, 100);
    const handleVolumeDown = useCallback(() => {
        decreaseVolume(volumeWheelStep);
    }, [decreaseVolume, volumeWheelStep]);
    const handleVolumeUp = useCallback(() => {
        increaseVolume(volumeWheelStep);
    }, [increaseVolume, volumeWheelStep]);
    const handleVolumeSlider = useCallback((e) => {
        setSliderValue(e);
        setVolumeThrottled(e);
    }, [setVolumeThrottled]);
    const handleMute = useCallback(() => {
        mediaToggleMute();
    }, [mediaToggleMute]);
    const handleVolumeWheel = useCallback((e) => {
        let volumeToSet;
        if (e.deltaY > 0 || e.deltaX > 0) {
            volumeToSet = calculateVolumeDown(volume, volumeWheelStep);
        }
        else {
            volumeToSet = calculateVolumeUp(volume, volumeWheelStep);
        }
        setVolume(volumeToSet);
    }, [setVolume, volume, volumeWheelStep]);
    const handleVolumeDownThrottled = useThrottledCallback(handleVolumeDown, 100);
    const handleVolumeUpThrottled = useThrottledCallback(handleVolumeUp, 100);
    useHotkeys([
        [bindings.volumeDown.isGlobal ? '' : bindings.volumeDown.hotkey, handleVolumeDownThrottled],
        [bindings.volumeUp.isGlobal ? '' : bindings.volumeUp.hotkey, handleVolumeUpThrottled],
        [bindings.volumeMute.isGlobal ? '' : bindings.volumeMute.hotkey, handleMute],
    ]);
    return (_jsxs(_Fragment, { children: [_jsx(ActionIcon, { icon: muted ? 'volumeMute' : volume > 50 ? 'volumeMax' : 'volumeNormal', iconProps: {
                    color: muted ? 'muted' : undefined,
                    size: 'xl',
                }, onClick: (e) => {
                    e.stopPropagation();
                    handleMute();
                }, onWheel: handleVolumeWheel, size: "sm", tooltip: {
                    label: muted ? t('player.muted', { postProcess: 'titleCase' }) : volume,
                    openDelay: 0,
                }, variant: "subtle" }), !isMinWidth ? (_jsx(CustomPlayerbarSlider, { max: 100, min: 0, onChange: handleVolumeSlider, onClick: (e) => {
                    e.stopPropagation();
                }, onWheel: handleVolumeWheel, size: 6, value: sliderValue, w: volumeWidth })) : null] }));
};
