import { AnimatePresence } from 'motion/react';

import { FullScreenVisualizer } from '/@/renderer/features/player/components/full-screen-visualizer';
import { useIsVisualizerAvailable } from '/@/renderer/features/player/hooks/use-is-visualizer-available';
import { useFullScreenPlayerStore } from '/@/renderer/store/full-screen-player.store';

export const FullScreenVisualizerOverlay = () => {
    const { visualizerExpanded: isFullScreenVisualizerExpanded } = useFullScreenPlayerStore();
    const isVisualizerAvailable = useIsVisualizerAvailable();

    return (
        <AnimatePresence initial={false}>
            {isFullScreenVisualizerExpanded && isVisualizerAvailable && <FullScreenVisualizer />}
        </AnimatePresence>
    );
};
