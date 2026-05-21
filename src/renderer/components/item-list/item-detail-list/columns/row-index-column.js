import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import styles from './row-index-column.module.css';
import { useIsCurrentSong } from '/@/renderer/features/player/hooks/use-is-current-song';
import { usePlayerStatus } from '/@/renderer/store';
import { Icon } from '/@/shared/components/icon/icon';
import { PlayerStatus } from '/@/shared/types/types';
export const RowIndexColumn = ({ rowIndex, song }) => {
    const status = usePlayerStatus();
    const { isActive } = useIsCurrentSong(song);
    const isPlaying = isActive && status === PlayerStatus.PLAYING;
    if (isActive) {
        return (_jsx("div", { className: styles.iconWrapper, children: _jsx(Icon, { fill: "primary", icon: isPlaying ? 'mediaPlay' : 'mediaPause' }) }));
    }
    return _jsx(_Fragment, { children: String((rowIndex ?? 0) + 1) });
};
