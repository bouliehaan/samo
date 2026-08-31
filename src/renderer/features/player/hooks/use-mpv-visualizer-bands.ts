import isElectron from 'is-electron';
import { useEffect, useRef } from 'react';

const mpvPlayer = isElectron() ? window.api.mpvPlayer : null;
const mpvPlayerListener = isElectron() ? window.api.mpvPlayerListener : null;

/**
 * Live per-band levels (dB) from mpv, for as long as this hook is mounted.
 *
 * mpv plays outside the renderer, so there is no Web Audio graph to analyse.
 * The main process attaches a libavfilter branch to mpv that measures band
 * energy and streams it back — see main/features/core/player/visualizer-tap.ts
 * for why that beats capturing the screen.
 *
 * Values arrive ~47×/sec, well above React's useful update rate, so they land
 * in a ref for a rAF renderer to read rather than in state. The tap costs real
 * CPU in mpv, so it is switched off the moment nothing is rendering it.
 */
export function useMpvVisualizerBands(): {
    bandsRef: React.RefObject<Float32Array>;
    lastFrameAtRef: React.RefObject<number>;
} {
    const bandsRef = useRef<Float32Array>(new Float32Array(0));
    const lastFrameAtRef = useRef<number>(0);

    useEffect(() => {
        if (!mpvPlayer || !mpvPlayerListener) return;

        let disposed = false;

        const unsubscribe = mpvPlayerListener.rendererVisualizerBands((_event, data) => {
            if (disposed) return;

            if (bandsRef.current.length !== data.length) {
                bandsRef.current = new Float32Array(data.length);
            }
            bandsRef.current.set(data);
            lastFrameAtRef.current = performance.now();
        });

        void mpvPlayer.setVisualizerTap(true);

        return () => {
            disposed = true;
            unsubscribe();
            void mpvPlayer.setVisualizerTap(false);
        };
    }, []);

    return { bandsRef, lastFrameAtRef };
}
