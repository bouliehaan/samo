import { lazy, Suspense } from 'react';

import { useIsMpvVisualizer } from '/@/renderer/features/player/hooks/use-is-visualizer-available';
import { useSettingsStore } from '/@/renderer/store';

const AudioMotionAnalyzerVisualizer = lazy(() =>
    import('./audiomotionanalyzer/visualizer').then((module) => ({ default: module.Visualizer })),
);

const ButterchurnVisualizer = lazy(() =>
    import('./butternchurn/visualizer').then((module) => ({ default: module.Visualizer })),
);

const MpvSpectrumVisualizer = lazy(() =>
    import('./mpv-spectrum/visualizer').then((module) => ({ default: module.Visualizer })),
);

/**
 * The one place that decides which visualizer renders.
 *
 * This used to be the same `visualizerType === 'butterchurn' ? … : …` ternary
 * copied into four call sites, which is why adding the mpv case needed a
 * single edit here rather than four that could drift apart.
 *
 * Under mpv the audio never reaches the renderer, so audioMotion and
 * Butterchurn have no `AnalyserNode` to read. mpv measures the spectrum itself
 * instead. Butterchurn additionally wants time-domain samples, which the mpv
 * feed cannot carry — so it renders only on the web player, and mpv falls back
 * to the spectrum rather than to a fabricated waveform.
 */
export const VisualizerSurface = () => {
    const visualizerType = useSettingsStore((store) => store.visualizer.type);
    const isMpv = useIsMpvVisualizer();

    return (
        <Suspense fallback={<></>}>
            {isMpv ? (
                <MpvSpectrumVisualizer />
            ) : visualizerType === 'butterchurn' ? (
                <ButterchurnVisualizer />
            ) : (
                <AudioMotionAnalyzerVisualizer />
            )}
        </Suspense>
    );
};
