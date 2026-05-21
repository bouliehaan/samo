import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import styles from './mobile-fullscreen-player.module.css';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { usePlayerPlaybackControlsState } from '/@/renderer/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Group } from '/@/shared/components/group/group';
import { PlayerRepeat, PlayerShuffle } from '/@/shared/types/types';
export const MobileFullscreenPlayerBottomControls = memo(({ isLyricsActive, isQueueActive, onToggleContextMenu, onToggleLyrics, onToggleQueue, }) => {
    const { repeat, shuffle } = usePlayerPlaybackControlsState();
    const { toggleRepeat, toggleShuffle } = usePlayer();
    return (_jsx("div", { className: styles.bottomControlsBar, children: _jsxs(Group, { className: styles.bottomControlsGroup, gap: 0, children: [_jsx(ActionIcon, { className: styles.bottomControlIcon, icon: "mediaShuffle", iconProps: {
                        fill: shuffle === PlayerShuffle.NONE ? 'default' : 'primary',
                        size: 'xl',
                    }, onClick: toggleShuffle, variant: "transparent" }), _jsx(ActionIcon, { className: styles.bottomControlIcon, icon: repeat === PlayerRepeat.ONE ? 'mediaRepeatOne' : 'mediaRepeat', iconProps: {
                        fill: repeat === PlayerRepeat.NONE ? 'default' : 'primary',
                        size: 'xl',
                    }, onClick: toggleRepeat, variant: "transparent" }), _jsx(ActionIcon, { className: styles.bottomControlIcon, icon: "queue", iconProps: {
                        fill: isQueueActive ? 'primary' : undefined,
                        size: 'xl',
                    }, onClick: onToggleQueue, variant: "transparent" }), _jsx(ActionIcon, { className: styles.bottomControlIcon, icon: "metadata", iconProps: {
                        fill: isLyricsActive ? 'primary' : undefined,
                        size: 'xl',
                    }, onClick: onToggleLyrics, variant: "transparent" }), _jsx(ActionIcon, { className: styles.bottomControlIcon, icon: "ellipsisVertical", iconProps: {
                        size: 'xl',
                    }, onClick: onToggleContextMenu, variant: "transparent" })] }) }));
});
MobileFullscreenPlayerBottomControls.displayName = 'MobileFullscreenPlayerBottomControls';
