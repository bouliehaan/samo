import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import isElectron from 'is-electron';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './sidebar-play-queue.module.css';
import { Lyrics } from '/@/renderer/features/lyrics/lyrics';
import { PlayQueue } from '/@/renderer/features/now-playing/components/play-queue';
import { PlayQueueListControls } from '/@/renderer/features/now-playing/components/play-queue-list-controls';
import { useCombinedLyricsAndVisualizer, useFullScreenPlayerStore, usePlaybackSettings, useSettingsStore, useSettingsStoreActions, useShowLyricsInSidebar, useShowVisualizerInSidebar, useSidebarPanelOrder, useWindowSettings, } from '/@/renderer/store';
import { ActionIcon, ActionIconGroup } from '/@/shared/components/action-icon/action-icon';
import { Flex } from '/@/shared/components/flex/flex';
import { Stack } from '/@/shared/components/stack/stack';
import { ItemListKey, Platform } from '/@/shared/types/types';
const AudioMotionAnalyzerVisualizer = lazy(() => import('../../visualizer/components/audiomotionanalyzer/visualizer').then((module) => ({
    default: module.Visualizer,
})));
const ButterchurnVisualizer = lazy(() => import('../../visualizer/components/butternchurn/visualizer').then((module) => ({
    default: module.Visualizer,
})));
const SIDEBAR_QUEUE_ITEM_SIZE = 'default';
const LYRICS_PREFERRED_HEIGHT = 240;
const QUEUE_VIZ_OFFSET = 25;
const LYRICS_MIN_HEIGHT = 190;
const QUEUE_MIN_HEIGHT = 120;
const VISUALIZER_MIN_HEIGHT = 90;
function calcSidebarHeights(totalHeight, panels) {
    const hasLyrics = panels.includes('lyrics');
    const hasVisualizer = panels.includes('visualizer');
    if (!hasLyrics && !hasVisualizer) {
        return { lyrics: 0, queue: totalHeight, visualizer: 0 };
    }
    if (!hasLyrics) {
        const queue = Math.max(QUEUE_MIN_HEIGHT, totalHeight / 2);
        return {
            lyrics: 0,
            queue,
            visualizer: Math.max(VISUALIZER_MIN_HEIGHT, totalHeight - queue),
        };
    }
    if (!hasVisualizer) {
        const lyrics = Math.min(LYRICS_PREFERRED_HEIGHT, Math.max(LYRICS_MIN_HEIGHT, totalHeight - QUEUE_MIN_HEIGHT));
        return { lyrics, queue: Math.max(QUEUE_MIN_HEIGHT, totalHeight - lyrics), visualizer: 0 };
    }
    // All three panels — staged shrinking
    const halfRemaining = (totalHeight - LYRICS_PREFERRED_HEIGHT) / 2;
    // Stage 1: tall sidebar — lyrics at preferred, queue slightly larger than visualizer
    if (halfRemaining - QUEUE_VIZ_OFFSET >= VISUALIZER_MIN_HEIGHT) {
        return {
            lyrics: LYRICS_PREFERRED_HEIGHT,
            queue: halfRemaining + QUEUE_VIZ_OFFSET,
            visualizer: halfRemaining - QUEUE_VIZ_OFFSET,
        };
    }
    // Stage 2: queue hits minimum, visualizer keeps absorbing; lyrics still at preferred
    if (totalHeight >= LYRICS_PREFERRED_HEIGHT + QUEUE_MIN_HEIGHT + VISUALIZER_MIN_HEIGHT) {
        return {
            lyrics: LYRICS_PREFERRED_HEIGHT,
            queue: QUEUE_MIN_HEIGHT,
            visualizer: totalHeight - LYRICS_PREFERRED_HEIGHT - QUEUE_MIN_HEIGHT,
        };
    }
    // Stage 3: both queue and visualizer at minimum; lyrics shrinks; visualizer collapses first
    const lyrics = Math.max(LYRICS_MIN_HEIGHT, totalHeight - QUEUE_MIN_HEIGHT - VISUALIZER_MIN_HEIGHT);
    return {
        lyrics,
        queue: QUEUE_MIN_HEIGHT,
        visualizer: Math.max(0, totalHeight - QUEUE_MIN_HEIGHT - lyrics),
    };
}
export const SidebarPlayQueue = () => {
    const tableRef = useRef(null);
    const [search, setSearch] = useState(undefined);
    const { expanded: isFullScreenPlayerExpanded, visualizerExpanded: isFullScreenVisualizerExpanded, } = useFullScreenPlayerStore();
    const [shouldRender, setShouldRender] = useState(!isFullScreenPlayerExpanded);
    const combinedLyricsAndVisualizer = useCombinedLyricsAndVisualizer();
    const showLyricsInSidebar = useShowLyricsInSidebar();
    const showVisualizerInSidebar = useShowVisualizerInSidebar();
    const sidebarPanelOrder = useSidebarPanelOrder();
    const { webAudio } = usePlaybackSettings();
    const { windowBarStyle } = useWindowSettings();
    const showVisualizer = showVisualizerInSidebar && webAudio;
    const showPanel = showLyricsInSidebar || showVisualizer;
    const shouldAddTopMargin = isElectron() && windowBarStyle === Platform.WEB;
    useEffect(() => {
        if (isFullScreenPlayerExpanded || isFullScreenVisualizerExpanded) {
            // Immediately hide when fullscreen player opens
            setShouldRender(false);
            return undefined;
        }
        else {
            // Wait 500ms before re-rendering when fullscreen player closes to avoid performance issues
            const timeoutId = setTimeout(() => {
                setShouldRender(true);
            }, 500);
            return () => {
                clearTimeout(timeoutId);
            };
        }
    }, [isFullScreenPlayerExpanded, isFullScreenVisualizerExpanded]);
    // Filter and order panels based on what's enabled
    const orderedPanels = useMemo(() => {
        if (combinedLyricsAndVisualizer) {
            // When combined, use the order from settings but filter to only show queue and lyrics (combined)
            const visiblePanels = sidebarPanelOrder.filter((panel) => {
                if (panel === 'queue')
                    return true;
                if (panel === 'lyrics')
                    return showLyricsInSidebar || showVisualizer;
                return false;
            });
            return visiblePanels;
        }
        const visiblePanels = sidebarPanelOrder.filter((panel) => {
            if (panel === 'queue')
                return true;
            if (panel === 'lyrics')
                return showLyricsInSidebar;
            if (panel === 'visualizer')
                return showVisualizer;
            return false;
        });
        return visiblePanels;
    }, [combinedLyricsAndVisualizer, showLyricsInSidebar, showVisualizer, sidebarPanelOrder]);
    const [panelContainer, setPanelContainer] = useState(null);
    const [containerHeight, setContainerHeight] = useState(800);
    useEffect(() => {
        if (!panelContainer)
            return;
        const ro = new ResizeObserver(([entry]) => {
            setContainerHeight(entry.contentRect.height);
        });
        ro.observe(panelContainer);
        return () => ro.disconnect();
    }, [panelContainer]);
    const paneHeights = useMemo(() => calcSidebarHeights(containerHeight, orderedPanels), [containerHeight, orderedPanels]);
    const renderPanel = (panelType) => {
        if (panelType === 'queue') {
            return (_jsxs(Stack, { gap: 0, h: "100%", w: "100%", children: [_jsx(PlayQueueListControls, { handleSearch: setSearch, searchTerm: search, tableRef: tableRef, type: ItemListKey.SIDE_QUEUE }), _jsx("div", { className: styles.playQueueSection, children: _jsx(PlayQueue, { listKey: ItemListKey.SIDE_QUEUE, ref: tableRef, searchTerm: search, tableSize: SIDEBAR_QUEUE_ITEM_SIZE }) })] }));
        }
        if (combinedLyricsAndVisualizer && (panelType === 'lyrics' || panelType === 'visualizer')) {
            return _jsx(CombinedLyricsAndVisualizerPanel, {});
        }
        if (panelType === 'lyrics') {
            return _jsx(LyricsPanel, {});
        }
        if (panelType === 'visualizer') {
            return _jsx(VisualizerPanel, {});
        }
        return null;
    };
    // Unmount when fullscreen player is open
    if (!shouldRender) {
        return null;
    }
    return (_jsxs(Stack, { gap: 0, h: "100%", id: "sidebar-play-queue-container", pos: "relative", w: "100%", children: [shouldAddTopMargin && _jsx("div", { className: styles.draggableRegion }), showPanel ? (_jsx("div", { ref: setPanelContainer, style: {
                    display: 'flex',
                    flex: 1,
                    flexDirection: 'column',
                    minHeight: 0,
                    overflow: 'hidden',
                }, children: orderedPanels.map((panel) => (_jsx("div", { style: {
                        flexShrink: 0,
                        height: paneHeights[panel],
                        overflow: 'hidden',
                    }, children: renderPanel(panel) }, panel))) })) : (_jsxs(Stack, { gap: 0, h: "100%", w: "100%", children: [_jsx(PlayQueueListControls, { handleSearch: setSearch, searchTerm: search, tableRef: tableRef, type: ItemListKey.SIDE_QUEUE }), _jsx(Flex, { direction: "column", style: { flex: 1, minHeight: 0 }, children: _jsx("div", { className: styles.playQueueSection, children: _jsx(PlayQueue, { listKey: ItemListKey.SIDE_QUEUE, ref: tableRef, searchTerm: search, tableSize: SIDEBAR_QUEUE_ITEM_SIZE }) }) })] }))] }));
};
const PanelReorderControls = ({ panelType }) => {
    const { t } = useTranslation();
    const { setSettings } = useSettingsStoreActions();
    const sidebarPanelOrder = useSidebarPanelOrder();
    const combinedLyricsAndVisualizer = useCombinedLyricsAndVisualizer();
    const currentIndex = sidebarPanelOrder.indexOf(panelType);
    const canMoveUp = currentIndex > 0;
    const canMoveDown = currentIndex < sidebarPanelOrder.length - 1;
    const handleMoveUp = useCallback(() => {
        if (!canMoveUp)
            return;
        const newOrder = [...sidebarPanelOrder];
        const targetIndex = currentIndex - 1;
        [newOrder[currentIndex], newOrder[targetIndex]] = [
            newOrder[targetIndex],
            newOrder[currentIndex],
        ];
        setSettings({
            general: {
                sidebarPanelOrder: newOrder,
            },
        });
    }, [canMoveUp, currentIndex, sidebarPanelOrder, setSettings]);
    const handleMoveDown = useCallback(() => {
        if (!canMoveDown)
            return;
        const newOrder = [...sidebarPanelOrder];
        [newOrder[currentIndex], newOrder[currentIndex + 1]] = [
            newOrder[currentIndex + 1],
            newOrder[currentIndex],
        ];
        setSettings({
            general: {
                sidebarPanelOrder: newOrder,
            },
        });
    }, [canMoveDown, currentIndex, sidebarPanelOrder, setSettings]);
    const handleClose = useCallback(() => {
        if (combinedLyricsAndVisualizer && panelType === 'lyrics') {
            setSettings({
                general: {
                    showLyricsInSidebar: false,
                    showVisualizerInSidebar: false,
                },
            });
        }
        else if (panelType === 'lyrics') {
            setSettings({
                general: {
                    showLyricsInSidebar: false,
                },
            });
        }
        else if (panelType === 'visualizer') {
            setSettings({
                general: {
                    showVisualizerInSidebar: false,
                },
            });
        }
    }, [combinedLyricsAndVisualizer, panelType, setSettings]);
    return (_jsx("div", { className: styles.panelReorderControls, children: _jsxs(ActionIconGroup, { children: [_jsx(ActionIcon, { disabled: !canMoveUp, icon: "arrowUp", iconProps: { size: 'sm' }, onClick: handleMoveUp, size: "xs", tooltip: {
                        label: t('action.moveUp', { postProcess: 'sentenceCase' }),
                    }, variant: "subtle" }), _jsx(ActionIcon, { disabled: !canMoveDown, icon: "arrowDown", iconProps: { size: 'sm' }, onClick: handleMoveDown, size: "xs", tooltip: {
                        label: t('action.moveDown', { postProcess: 'sentenceCase' }),
                    }, variant: "subtle" }), _jsx(ActionIcon, { icon: "x", iconProps: { size: 'sm' }, onClick: handleClose, size: "xs", tooltip: {
                        label: t('common.close', { postProcess: 'sentenceCase' }),
                    }, variant: "subtle" })] }) }));
};
const LyricsPanel = () => {
    return (_jsxs("div", { className: styles.lyricsSection, children: [_jsx(PanelReorderControls, { panelType: "lyrics" }), _jsx(Lyrics, { settingsKey: "sidebar" })] }));
};
const VisualizerPanel = () => {
    const visualizerType = useSettingsStore((store) => store.visualizer.type);
    return (_jsxs("div", { className: styles.visualizerSection, children: [_jsx(PanelReorderControls, { panelType: "visualizer" }), _jsx(Suspense, { fallback: _jsx(_Fragment, {}), children: visualizerType === 'butterchurn' ? (_jsx(ButterchurnVisualizer, {})) : (_jsx(AudioMotionAnalyzerVisualizer, {})) })] }));
};
const CombinedLyricsAndVisualizerPanel = () => {
    const showLyricsInSidebar = useShowLyricsInSidebar();
    return (_jsxs("div", { className: styles.lyricsSection, children: [_jsx(PanelReorderControls, { panelType: "lyrics" }), showLyricsInSidebar && _jsx(Lyrics, { settingsKey: "sidebar" })] }));
};
