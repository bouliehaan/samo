import { useEffect, useRef } from 'react';

import styles from '../audiomotionanalyzer/visualizer.module.css';

import { useMpvVisualizerBands } from '/@/renderer/features/player/hooks/use-mpv-visualizer-bands';
import { openVisualizerSettingsModal } from '/@/renderer/features/player/utils/open-visualizer-settings-modal';
import { ComponentErrorBoundary } from '/@/renderer/features/shared/components/component-error-boundary';
import { useSettingsStore } from '/@/renderer/store';
import {
    useFullScreenPlayerStore,
    useFullScreenPlayerStoreActions,
} from '/@/renderer/store/full-screen-player.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Group } from '/@/shared/components/group/group';
import { VISUALIZER_CEILING_DB, VISUALIZER_FLOOR_DB } from '/@/shared/constants/visualizer';

/**
 * The visualizer for mpv playback.
 *
 * audioMotion and Butterchurn both analyse a Web Audio `AnalyserNode`, which
 * only exists when the web player is doing the playing. Under mpv the audio
 * never enters the renderer at all, so the levels come from mpv itself as
 * per-band dB values (see use-mpv-visualizer-bands / visualizer-tap.ts).
 *
 * Drawn as a filled curve rather than 17 hard steps: the bands are real
 * measurements, but they are band *energies*, and drawing them as a stepped
 * bar chart would imply more frequency precision than 17 crossovers carry.
 */

/** After this long with no frame, mpv is paused or stopped — settle to zero. */
const IDLE_MS = 400;

/**
 * Fraction of the panel left empty above a full-scale band.
 *
 * Even with a sensible ceiling a loud passage can saturate, and a curve drawn
 * hard against the top edge reads as clipped rather than loud.
 */
const HEADROOM = 0.08;

/** Re-reading the theme colour every frame is wasteful; it changes rarely. */
const THEME_REFRESH_MS = 500;

/**
 * The app's own foreground colour, as `[r, g, b]`.
 *
 * Taken from `--theme-colors-foreground` rather than hardcoded so the
 * visualizer follows the theme instead of imposing its own palette. The canvas
 * is used to normalise whatever form the variable is in (hex, `rgb()`, a named
 * colour) into something parseable — assigning to `fillStyle` and reading it
 * back returns a canonical string.
 */
const readForeground = (
    element: Element,
    ctx: CanvasRenderingContext2D,
): [number, number, number] => {
    const raw = getComputedStyle(element).getPropertyValue('--theme-colors-foreground').trim();

    if (raw) {
        const previous = ctx.fillStyle;
        try {
            ctx.fillStyle = raw;
            const normalised = ctx.fillStyle;
            if (typeof normalised === 'string') {
                const hex = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(normalised);
                if (hex) {
                    return [
                        Number.parseInt(hex[1], 16),
                        Number.parseInt(hex[2], 16),
                        Number.parseInt(hex[3], 16),
                    ];
                }
                const rgb = /rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(normalised);
                if (rgb) {
                    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
                }
            }
        } catch {
            // An unparseable variable leaves fillStyle untouched; fall through.
        } finally {
            ctx.fillStyle = previous;
        }
    }

    // Neutral light grey: readable on the dark surface this panel sits on.
    return [225, 225, 225];
};

const SpectrumInner = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { bandsRef, lastFrameAtRef } = useMpvVisualizerBands();

    // Read through refs inside the rAF loop: these change from settings, and
    // restarting the loop on every keystroke in the settings modal would stutter.
    const settings = useSettingsStore((store) => store.visualizer.audiomotionanalyzer);
    const settingsRef = useRef(settings);
    settingsRef.current = settings;

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let frame = 0;
        let smoothed: Float32Array = new Float32Array(0);
        let foreground: [number, number, number] = readForeground(container, ctx);
        let foregroundReadAt = 0;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            const { height, width } = container.getBoundingClientRect();
            canvas.width = Math.max(1, Math.round(width * dpr));
            canvas.height = Math.max(1, Math.round(height * dpr));
        };

        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(container);

        const draw = () => {
            frame = requestAnimationFrame(draw);

            const { smoothing } = settingsRef.current;
            const bands = bandsRef.current;
            const { height, width } = canvas;

            ctx.clearRect(0, 0, width, height);
            if (bands.length === 0) return;

            if (smoothed.length !== bands.length) {
                smoothed = new Float32Array(bands.length);
            }

            // No new frame means playback stopped; fall to the floor rather
            // than freezing the last shape on screen.
            const idle = performance.now() - lastFrameAtRef.current > IDLE_MS;
            // Scaled against the tap's own floor and ceiling, NOT audioMotion's
            // minDecibels/maxDecibels. Those describe FFT bin magnitudes from an
            // AnalyserNode; these are per-band RMS. Using them put silence a
            // quarter of the way up the panel (floor -85 vs the tap's -70) and
            // flattened anything above -25dB against the top edge.
            const range = Math.max(1, VISUALIZER_CEILING_DB - VISUALIZER_FLOOR_DB);
            // audioMotion's `smoothing` is a hold factor, same sense as
            // AnalyserNode.smoothingTimeConstant.
            const hold = Math.min(0.95, Math.max(0, smoothing));

            for (let i = 0; i < bands.length; i += 1) {
                const target = idle
                    ? 0
                    : Math.min(1, Math.max(0, (bands[i] - VISUALIZER_FLOOR_DB) / range));
                smoothed[i] = smoothed[i] * hold + target * (1 - hold);
            }

            // Sample the band curve across the canvas. Catmull-Rom through the
            // band centres, so 17 measurements read as a spectrum rather than
            // a staircase.
            const value = (index: number) =>
                smoothed[Math.min(smoothed.length - 1, Math.max(0, index))];
            const points: number[] = new Array(Math.ceil(width));

            for (let x = 0; x < points.length; x += 1) {
                const t = (x / Math.max(1, points.length - 1)) * (smoothed.length - 1);
                const i = Math.floor(t);
                const f = t - i;
                const p0 = value(i - 1);
                const p1 = value(i);
                const p2 = value(i + 1);
                const p3 = value(i + 2);
                points[x] =
                    0.5 *
                    (2 * p1 +
                        (-p0 + p2) * f +
                        (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f +
                        (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
            }

            const now = performance.now();
            if (now - foregroundReadAt > THEME_REFRESH_MS) {
                foreground = readForeground(container, ctx);
                foregroundReadAt = now;
            }

            const [r, g, b] = foreground;
            // Vertical fade rather than a colour ramp: the app is monochrome,
            // so the shape carries the information and the colour stays out of it.
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.55)`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.03)`);

            const drawable = height * (1 - HEADROOM);
            const yFor = (value: number) => height - Math.min(1, Math.max(0, value)) * drawable;

            ctx.beginPath();
            ctx.moveTo(0, height);
            for (let x = 0; x < points.length; x += 1) {
                ctx.lineTo(x, yFor(points[x]));
            }
            ctx.lineTo(width, height);
            ctx.closePath();

            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.lineWidth = Math.max(1, (window.devicePixelRatio || 1) * 1.9);
            ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.beginPath();
            for (let x = 0; x < points.length; x += 1) {
                const y = yFor(points[x]);
                if (x === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        };

        frame = requestAnimationFrame(draw);

        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, [bandsRef, lastFrameAtRef]);

    return (
        <div className={styles.visualizer} ref={containerRef} style={{ opacity: settings.opacity }}>
            {/*
             * Display size is forced here rather than left to the shared
             * stylesheet, which sets a canvas width but no height — a canvas
             * with only a width keeps its intrinsic aspect ratio and would not
             * fill the panel. The backing-store resolution is set separately,
             * in device pixels, by the resize observer above.
             */}
            <canvas ref={canvasRef} style={{ display: 'block', height: '100%', width: '100%' }} />
        </div>
    );
};

export const Visualizer = () => {
    const { visualizerExpanded } = useFullScreenPlayerStore();
    const { setStore } = useFullScreenPlayerStoreActions();

    const handleToggleFullscreen = () => {
        setStore({ expanded: false, visualizerExpanded: !visualizerExpanded });
    };

    return (
        <div className={styles.container}>
            <Group
                className={styles.iconGroup}
                gap="xs"
                pos="absolute"
                right="var(--theme-spacing-sm)"
                top="var(--theme-spacing-sm)"
            >
                <ActionIcon
                    icon="expand"
                    iconProps={{ size: 'lg' }}
                    onClick={handleToggleFullscreen}
                    variant="subtle"
                />
                <ActionIcon
                    icon="settings2"
                    iconProps={{ size: 'lg' }}
                    onClick={openVisualizerSettingsModal}
                    variant="subtle"
                />
            </Group>
            <ComponentErrorBoundary>
                <SpectrumInner />
            </ComponentErrorBoundary>
        </div>
    );
};
