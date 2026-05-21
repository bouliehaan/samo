import { useFullScreenPlayerStore, useSettingsStore } from '/@/renderer/store';
export function closeLocalVisualizerSurfaces() {
    const fullScreen = useFullScreenPlayerStore.getState();
    fullScreen.actions.setStore({
        ...(fullScreen.expanded && fullScreen.activeTab === 'visualizer'
            ? { activeTab: 'queue' }
            : {}),
        visualizerExpanded: false,
    });
    useSettingsStore.getState().actions.setSettings({
        general: { showVisualizerInSidebar: false },
    });
}
