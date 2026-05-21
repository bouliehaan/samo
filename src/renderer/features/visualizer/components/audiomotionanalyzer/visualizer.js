import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './visualizer.module.css';
import { useWebAudio } from '/@/renderer/features/player/hooks/use-webaudio';
import { getVisualizerAudioNodes } from '/@/renderer/features/player/utils/get-visualizer-audio-nodes';
import { openVisualizerSettingsModal } from '/@/renderer/features/player/utils/open-visualizer-settings-modal';
import { ComponentErrorBoundary } from '/@/renderer/features/shared/components/component-error-boundary';
import { usePlaybackType, useSettingsStore } from '/@/renderer/store';
import { useFullScreenPlayerStore, useFullScreenPlayerStoreActions, } from '/@/renderer/store/full-screen-player.store';
import { logFn } from '/@/renderer/utils/logger';
import { usePlayerStatus } from '/@/renderer/store/player.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Group } from '/@/shared/components/group/group';
import { PlayerStatus, PlayerType } from '/@/shared/types/types';
const VisualizerInner = () => {
    const { webAudio } = useWebAudio();
    const canvasRef = useRef(null);
    const visualizer = useSettingsStore((store) => store.visualizer);
    const playbackType = usePlaybackType();
    const opacity = useSettingsStore((store) => store.visualizer.audiomotionanalyzer.opacity);
    const motionRef = useRef(undefined);
    const resizeObserverRef = useRef(undefined);
    const resizeFrameRef = useRef(undefined);
    const [containerSize, setContainerSize] = useState({ height: 0, width: 0 });
    const [hasMotion, setHasMotion] = useState(false);
    const [libraryLoaded, setLibraryLoaded] = useState(false);
    const AudioMotionAnalyzerRef = useRef(null);
    const pauseTimerRef = useRef(undefined);
    const playerStatus = usePlayerStatus();
    const isPlaying = playerStatus === PlayerStatus.PLAYING;
    useEffect(() => {
        let isMounted = true;
        const loadLibrary = async () => {
            try {
                const module = await import('audiomotion-analyzer');
                if (isMounted) {
                    AudioMotionAnalyzerRef.current = module.default;
                    setLibraryLoaded(true);
                }
            }
            catch (error) {
                logFn.error('Failed to load AudioMotionAnalyzer library', { meta: { error: error } });
            }
        };
        loadLibrary();
        return () => {
            isMounted = false;
        };
    }, []);
    // Check if a gradient name is a custom gradient
    const isCustomGradient = useCallback((gradientName) => {
        if (!gradientName || visualizer.type !== 'audiomotionanalyzer') {
            return false;
        }
        const customGradients = visualizer.audiomotionanalyzer.customGradients || [];
        return customGradients.some((gradient) => gradient.name === gradientName);
    }, [visualizer]);
    const [gradientsRegistered, setGradientsRegistered] = useState(false);
    const options = useMemo(() => {
        if (visualizer.type !== 'audiomotionanalyzer') {
            return {};
        }
        const ama = visualizer.audiomotionanalyzer;
        const defaults = {
            bgAlpha: 0,
            showBgColor: false,
        };
        const gradients = {};
        // Use default gradient if custom gradient is selected but not yet registered
        const getSafeGradient = (gradientName) => {
            if (!gradientName)
                return 'classic';
            if (isCustomGradient(gradientName)) {
                // Use default until custom gradients are registered
                return gradientsRegistered ? gradientName : 'classic';
            }
            return gradientName;
        };
        if (ama.channelLayout === 'single') {
            gradients.gradient = getSafeGradient(ama.gradient);
        }
        else {
            gradients.gradientLeft = getSafeGradient(ama.gradientLeft);
            gradients.gradientRight = getSafeGradient(ama.gradientRight);
        }
        return {
            ...defaults,
            ...gradients,
            alphaBars: ama.alphaBars,
            ansiBands: ama.ansiBands,
            barSpace: ama.barSpace,
            channelLayout: ama.channelLayout,
            colorMode: ama.colorMode,
            connectSpeakers: false,
            fadePeaks: ama.fadePeaks,
            fftSize: ama.fftSize,
            fillAlpha: ama.fillAlpha,
            frequencyScale: ama.frequencyScale,
            gravity: ama.gravity,
            ledBars: ama.ledBars,
            linearAmplitude: ama.linearAmplitude,
            linearBoost: ama.linearBoost,
            lineWidth: ama.lineWidth,
            loRes: ama.loRes,
            lumiBars: ama.lumiBars,
            maxDecibels: ama.maxDecibels,
            maxFPS: ama.maxFPS,
            maxFreq: ama.maxFreq,
            minDecibels: ama.minDecibels,
            minFreq: ama.minFreq,
            mirror: ama.mirror,
            mode: ama.mode,
            noteLabels: ama.noteLabels,
            outlineBars: ama.outlineBars,
            overlay: true,
            peakFadeTime: ama.peakFadeTime,
            peakHoldTime: ama.peakHoldTime,
            peakLine: ama.peakLine,
            radial: ama.radial,
            radialInvert: ama.radialInvert,
            radius: ama.radius,
            reflexAlpha: ama.reflexAlpha,
            reflexBright: ama.reflexBright,
            reflexFit: ama.reflexFit,
            reflexRatio: ama.reflexRatio,
            roundBars: ama.roundBars,
            showFPS: ama.showFPS,
            showPeaks: ama.showPeaks,
            showScaleX: ama.showScaleX,
            showScaleY: ama.showScaleY,
            smoothing: ama.smoothing,
            spinSpeed: ama.spinSpeed,
            splitGradient: ama.splitGradient,
            trueLeds: ama.trueLeds,
            volume: ama.volume,
            weightingFilter: (ama.weightingFilter || ''),
        };
    }, [visualizer, gradientsRegistered, isCustomGradient]);
    const transformGradientForVisualizer = useCallback((gradient) => {
        const transformedColorStops = gradient.colorStops.map((stop) => {
            // If neither position nor level is enabled, return just the color string
            if (!stop.positionEnabled && !stop.levelEnabled) {
                return stop.color;
            }
            // Otherwise, return an object with only enabled properties
            const transformedStop = {
                color: stop.color,
            };
            if (stop.positionEnabled && stop.pos !== undefined) {
                transformedStop.pos = stop.pos;
            }
            if (stop.levelEnabled && stop.level !== undefined) {
                transformedStop.level = stop.level;
            }
            return transformedStop;
        });
        return {
            colorStops: transformedColorStops,
            ...(gradient.dir ? { dir: gradient.dir } : {}),
        };
    }, []);
    const registerCustomGradients = useCallback((audioMotionInstance) => {
        if (visualizer.type !== 'audiomotionanalyzer') {
            return;
        }
        const customGradients = visualizer.audiomotionanalyzer.customGradients || [];
        customGradients.forEach((gradient) => {
            try {
                const gradientConfig = transformGradientForVisualizer(gradient);
                audioMotionInstance.registerGradient(gradient.name, gradientConfig);
            }
            catch (error) {
                logFn.error(`Failed to register gradient "${gradient.name}"`, { meta: { error: error } });
            }
        });
        // Mark gradients as registered
        setGradientsRegistered(true);
    }, [visualizer, transformGradientForVisualizer]);
    const clearPauseTimer = useCallback(() => {
        if (pauseTimerRef.current) {
            clearTimeout(pauseTimerRef.current);
            pauseTimerRef.current = undefined;
        }
    }, []);
    const resizeMotion = useCallback(() => {
        const motion = motionRef.current;
        const container = canvasRef.current;
        if (!motion || !container) {
            return;
        }
        const width = Math.floor(container.clientWidth);
        const height = Math.floor(container.clientHeight);
        if (width <= 0 || height <= 0) {
            return;
        }
        motion.setCanvasSize(width, height);
    }, []);
    const destroyMotion = useCallback(() => {
        clearPauseTimer();
        const motion = motionRef.current;
        motionRef.current = undefined;
        if (motion) {
            try {
                motion.destroy();
            }
            catch {
                // ignore
            }
        }
        canvasRef.current?.querySelectorAll('canvas').forEach((canvas) => canvas.remove());
        setHasMotion(false);
    }, [clearPauseTimer]);
    useEffect(() => {
        const container = canvasRef.current;
        if (!container) {
            return;
        }
        const updateSize = () => {
            if (resizeFrameRef.current !== undefined) {
                cancelAnimationFrame(resizeFrameRef.current);
            }
            resizeFrameRef.current = requestAnimationFrame(() => {
                resizeFrameRef.current = undefined;
                setContainerSize({
                    height: Math.floor(container.clientHeight),
                    width: Math.floor(container.clientWidth),
                });
                resizeMotion();
            });
        };
        updateSize();
        resizeObserverRef.current = new ResizeObserver(updateSize);
        resizeObserverRef.current.observe(container);
        window.addEventListener('resize', updateSize);
        return () => {
            window.removeEventListener('resize', updateSize);
            resizeObserverRef.current?.disconnect();
            resizeObserverRef.current = undefined;
            if (resizeFrameRef.current !== undefined) {
                cancelAnimationFrame(resizeFrameRef.current);
                resizeFrameRef.current = undefined;
            }
        };
    }, [resizeMotion]);
    useEffect(() => {
        const { context } = webAudio || {};
        const inputNodes = getVisualizerAudioNodes(webAudio, playbackType);
        const shouldRunForWebPlayback = playbackType === PlayerType.WEB && isPlaying;
        const shouldRunForMpvLoopback = playbackType === PlayerType.LOCAL && isPlaying && inputNodes.length > 0;
        const shouldRun = shouldRunForWebPlayback || shouldRunForMpvLoopback;
        if (!shouldRun || !context || inputNodes.length === 0) {
            if (motionRef.current) {
                destroyMotion();
            }
            return;
        }
        if (motionRef.current ||
            !canvasRef.current ||
            !libraryLoaded ||
            containerSize.width <= 0 ||
            containerSize.height <= 0) {
            return;
        }
        const AudioMotionAnalyzer = AudioMotionAnalyzerRef.current;
        if (!AudioMotionAnalyzer)
            return;
        setGradientsRegistered(false);
        const initOptions = { ...options };
        if (visualizer.type === 'audiomotionanalyzer') {
            const ama = visualizer.audiomotionanalyzer;
            if (isCustomGradient(ama.gradient)) {
                initOptions.gradient = 'classic';
            }
            if (isCustomGradient(ama.gradientLeft)) {
                initOptions.gradientLeft = 'classic';
            }
            if (isCustomGradient(ama.gradientRight)) {
                initOptions.gradientRight = 'classic';
            }
        }
        const audioMotion = new AudioMotionAnalyzer(canvasRef.current, {
            ...initOptions,
            audioCtx: context,
        });
        motionRef.current = audioMotion;
        setHasMotion(true);
        registerCustomGradients(audioMotion);
        for (const node of inputNodes)
            audioMotion.connectInput(node);
        requestAnimationFrame(resizeMotion);
    }, [
        containerSize.height,
        containerSize.width,
        destroyMotion,
        isCustomGradient,
        isPlaying,
        libraryLoaded,
        options,
        playbackType,
        registerCustomGradients,
        resizeMotion,
        webAudio,
        visualizer,
    ]);
    // Kill visualizer after 5 seconds of pause
    useEffect(() => {
        if (isPlaying) {
            clearPauseTimer();
            return;
        }
        if (!hasMotion)
            return;
        pauseTimerRef.current = setTimeout(() => {
            destroyMotion();
            pauseTimerRef.current = undefined;
        }, 5000);
        return () => {
            clearPauseTimer();
        };
    }, [clearPauseTimer, destroyMotion, hasMotion, isPlaying]);
    // Re-register custom gradients when they change
    useEffect(() => {
        if (motionRef.current && visualizer.type === 'audiomotionanalyzer') {
            setGradientsRegistered(false);
            registerCustomGradients(motionRef.current);
        }
    }, [
        hasMotion,
        registerCustomGradients,
        visualizer.audiomotionanalyzer.customGradients,
        visualizer.type,
    ]);
    // Update visualizer settings when they change
    useEffect(() => {
        if (motionRef.current) {
            motionRef.current.setOptions(options);
            resizeMotion();
        }
    }, [hasMotion, options, resizeMotion]);
    useEffect(() => {
        return () => {
            destroyMotion();
        };
    }, [destroyMotion]);
    return _jsx("div", { className: styles.visualizer, ref: canvasRef, style: { opacity } });
};
export const Visualizer = () => {
    const { visualizerExpanded } = useFullScreenPlayerStore();
    const { setStore } = useFullScreenPlayerStoreActions();
    const handleToggleFullscreen = () => {
        setStore({ expanded: false, visualizerExpanded: !visualizerExpanded });
    };
    return (_jsxs("div", { className: styles.container, children: [_jsxs(Group, { className: styles.iconGroup, gap: "xs", pos: "absolute", right: "var(--theme-spacing-sm)", top: "var(--theme-spacing-sm)", children: [_jsx(ActionIcon, { icon: "expand", iconProps: { size: 'lg' }, onClick: handleToggleFullscreen, variant: "subtle" }), _jsx(ActionIcon, { icon: "settings2", iconProps: { size: 'lg' }, onClick: openVisualizerSettingsModal, variant: "subtle" })] }), _jsx(ComponentErrorBoundary, { children: _jsx(VisualizerInner, {}) })] }));
};
