/**
 * System-audio capture bridge for the local MPV visualizer surface. Now a no-op
 * because MPV mode has been removed from samo — the renderer always uses the
 * web player engine, which already exposes its own audio nodes.
 */
export function VisualizerSystemAudioBridgeHook() {
    return null;
}
