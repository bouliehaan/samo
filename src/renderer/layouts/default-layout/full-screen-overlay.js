import { jsx as _jsx } from "react/jsx-runtime";
import { AnimatePresence } from 'motion/react';
import { FullScreenPlayer } from '/@/renderer/features/player/components/full-screen-player';
import { useFullScreenPlayerStore } from '/@/renderer/store';
export const FullScreenOverlay = () => {
    const { expanded: isFullScreenPlayerExpanded } = useFullScreenPlayerStore();
    return (_jsx(AnimatePresence, { initial: false, children: isFullScreenPlayerExpanded && _jsx(FullScreenPlayer, {}) }));
};
