import isElectron from 'is-electron';

import { isMpvEngineActive } from '/@/renderer/features/player/utils/resolve-playback-engine';
import { usePlaybackSession } from '/@/renderer/store/playback-owner.store';
import { usePlaybackSettings, usePlaybackType } from '/@/renderer/store/settings.store';

/**
 * True when the visualizer must read its levels from mpv rather than from the
 * renderer's Web Audio graph.
 *
 * This asks what is *actually playing*, not what the playback setting says.
 * Radio, podcasts and audiobooks run through a web audio element even when the
 * setting is mpv — an earlier version keyed off the setting alone, decided
 * radio was mpv playback, and had the main process attach a spectrum tap to an
 * idle mpv. See resolve-playback-engine.ts.
 */
export function useIsMpvVisualizer(): boolean {
    const { engine, source } = usePlaybackSession();
    const playbackType = usePlaybackType();

    return isMpvEngineActive({ engine, isDesktop: isElectron(), playbackType, source });
}

/**
 * Whether a visualizer can be shown at all.
 *
 * Under the web player the audio flows through the renderer's Web Audio graph
 * and any visualizer can analyse it directly. Under mpv the audio never
 * reaches the renderer, so the levels come from a libavfilter branch inside
 * mpv (see main/features/core/player/visualizer-tap.ts) — which needs a fifo,
 * and so is not available on Windows.
 *
 * samo used to bridge that gap with `getDisplayMedia`. On macOS Electron has
 * no audio-only loopback, so system audio only arrives attached to a live
 * ScreenCaptureKit capture of the whole display: the visualizer cost a Screen
 * Recording permission and a running screen capture. Asking mpv for the
 * numbers costs neither.
 */
export function useIsVisualizerAvailable(): boolean {
    const { webAudio } = usePlaybackSettings();
    const isMpv = useIsMpvVisualizer();

    if (!webAudio) return false;
    if (!isMpv) return true;

    // No mkfifo on Windows, so mpv has no way to hand the spectrum back.
    return !window.api?.utils?.isWindows?.();
}
