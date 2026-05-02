import { useQuery } from '@tanstack/react-query';
import isElectron from 'is-electron';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './sidebar-play-queue.module.css';

import { ItemListHandle } from '/@/renderer/components/item-list/types';
import { lyricsQueries } from '/@/renderer/features/lyrics/api/lyrics-api';
import { Lyrics } from '/@/renderer/features/lyrics/lyrics';
import { PlayQueue } from '/@/renderer/features/now-playing/components/play-queue';
import { PlayQueueListControls } from '/@/renderer/features/now-playing/components/play-queue-list-controls';
import {
    useCombinedLyricsAndVisualizer,
    useFullScreenPlayerStore,
    usePlaybackSettings,
    usePlayerSong,
    useSettingsStore,
    useSettingsStoreActions,
    useShowLyricsInSidebar,
    useShowVisualizerInSidebar,
    useSidebarPanelOrder,
    useWindowSettings,
} from '/@/renderer/store';
import { ActionIcon, ActionIconGroup } from '/@/shared/components/action-icon/action-icon';
import { Flex } from '/@/shared/components/flex/flex';
import { Stack } from '/@/shared/components/stack/stack';
import { ItemListKey, Platform } from '/@/shared/types/types';

type SidebarPanelType = 'lyrics' | 'queue' | 'visualizer';

const AudioMotionAnalyzerVisualizer = lazy(() =>
    import('../../visualizer/components/audiomotionanalyzer/visualizer').then((module) => ({
        default: module.Visualizer,
    })),
);

const ButterchurnVisualizer = lazy(() =>
    import('../../visualizer/components/butternchurn/visualizer').then((module) => ({
        default: module.Visualizer,
    })),
);

const SIDEBAR_QUEUE_ITEM_SIZE = 'default' as const;

const LYRICS_PREFERRED_HEIGHT = 240;
const QUEUE_VIZ_OFFSET = 25;
const LYRICS_MIN_HEIGHT = 190;
const QUEUE_MIN_HEIGHT = 120;
const VISUALIZER_MIN_HEIGHT = 90;

function calcSidebarHeights(
    totalHeight: number,
    panels: SidebarPanelType[],
): Record<SidebarPanelType, number> {
    const hasLyrics = panels.includes('lyrics');
    const hasVisualizer = panels.includes('visualizer');

    if (!hasLyrics && !hasVisualizer) {
        return { lyrics: 0, queue: totalHeight, visualizer: 0 };
    }

    if (!hasLyrics) {
        const queue = Math.max(QUEUE_MIN_HEIGHT, totalHeight / 2);
        return { lyrics: 0, queue, visualizer: Math.max(VISUALIZER_MIN_HEIGHT, totalHeight - queue) };
    }

    if (!hasVisualizer) {
        const lyrics = Math.min(
            LYRICS_PREFERRED_HEIGHT,
            Math.max(LYRICS_MIN_HEIGHT, totalHeight - QUEUE_MIN_HEIGHT),
        );
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
    const lyrics = Math.max(
        LYRICS_MIN_HEIGHT,
        totalHeight - QUEUE_MIN_HEIGHT - VISUALIZER_MIN_HEIGHT,
    );
    return {
        lyrics,
        queue: QUEUE_MIN_HEIGHT,
        visualizer: Math.max(0, totalHeight - QUEUE_MIN_HEIGHT - lyrics),
    };
}

export const SidebarPlayQueue = () => {
    const tableRef = useRef<ItemListHandle | null>(null);
    const [search, setSearch] = useState<string | undefined>(undefined);
    const {
        expanded: isFullScreenPlayerExpanded,
        visualizerExpanded: isFullScreenVisualizerExpanded,
    } = useFullScreenPlayerStore();
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
        } else {
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
                if (panel === 'queue') return true;
                if (panel === 'lyrics') return showLyricsInSidebar || showVisualizer;
                return false;
            });
            return visiblePanels;
        }

        const visiblePanels = sidebarPanelOrder.filter((panel) => {
            if (panel === 'queue') return true;
            if (panel === 'lyrics') return showLyricsInSidebar;
            if (panel === 'visualizer') return showVisualizer;
            return false;
        });

        return visiblePanels;
    }, [combinedLyricsAndVisualizer, showLyricsInSidebar, showVisualizer, sidebarPanelOrder]);

    const [panelContainer, setPanelContainer] = useState<HTMLDivElement | null>(null);
    const [containerHeight, setContainerHeight] = useState(800);

    useEffect(() => {
        if (!panelContainer) return;
        const ro = new ResizeObserver(([entry]) => {
            setContainerHeight(entry.contentRect.height);
        });
        ro.observe(panelContainer);
        return () => ro.disconnect();
    }, [panelContainer]);

    const paneHeights = useMemo(
        () => calcSidebarHeights(containerHeight, orderedPanels as SidebarPanelType[]),
        [containerHeight, orderedPanels],
    );

    const renderPanel = (panelType: SidebarPanelType) => {
        if (panelType === 'queue') {
            return (
                <Stack gap={0} h="100%" w="100%">
                    <PlayQueueListControls
                        handleSearch={setSearch}
                        searchTerm={search}
                        tableRef={tableRef}
                        type={ItemListKey.SIDE_QUEUE}
                    />
                    <div className={styles.playQueueSection}>
                        <PlayQueue
                            listKey={ItemListKey.SIDE_QUEUE}
                            ref={tableRef}
                            searchTerm={search}
                            tableSize={SIDEBAR_QUEUE_ITEM_SIZE}
                        />
                    </div>
                </Stack>
            );
        }

        if (combinedLyricsAndVisualizer && (panelType === 'lyrics' || panelType === 'visualizer')) {
            return <CombinedLyricsAndVisualizerPanel />;
        }

        if (panelType === 'lyrics') {
            return <LyricsPanel />;
        }

        if (panelType === 'visualizer') {
            return <VisualizerPanel />;
        }

        return null;
    };

    // Unmount when fullscreen player is open
    if (!shouldRender) {
        return null;
    }

    return (
        <Stack gap={0} h="100%" id="sidebar-play-queue-container" pos="relative" w="100%">
            {shouldAddTopMargin && <div className={styles.draggableRegion} />}
            {showPanel ? (
                <div
                    ref={setPanelContainer}
                    style={{
                        display: 'flex',
                        flex: 1,
                        flexDirection: 'column',
                        minHeight: 0,
                        overflow: 'hidden',
                    }}
                >
                    {orderedPanels.map((panel) => (
                        <div
                            key={panel}
                            style={{
                                flexShrink: 0,
                                height: paneHeights[panel as SidebarPanelType],
                                overflow: 'hidden',
                            }}
                        >
                            {renderPanel(panel as SidebarPanelType)}
                        </div>
                    ))}
                </div>
            ) : (
                <Stack gap={0} h="100%" w="100%">
                    <PlayQueueListControls
                        handleSearch={setSearch}
                        searchTerm={search}
                        tableRef={tableRef}
                        type={ItemListKey.SIDE_QUEUE}
                    />
                    <Flex direction="column" style={{ flex: 1, minHeight: 0 }}>
                        <div className={styles.playQueueSection}>
                            <PlayQueue
                                listKey={ItemListKey.SIDE_QUEUE}
                                ref={tableRef}
                                searchTerm={search}
                                tableSize={SIDEBAR_QUEUE_ITEM_SIZE}
                            />
                        </div>
                    </Flex>
                </Stack>
            )}
        </Stack>
    );
};

const PanelReorderControls = ({ panelType }: { panelType: 'lyrics' | 'visualizer' }) => {
    const { t } = useTranslation();
    const { setSettings } = useSettingsStoreActions();
    const sidebarPanelOrder = useSidebarPanelOrder();
    const combinedLyricsAndVisualizer = useCombinedLyricsAndVisualizer();

    const currentIndex = sidebarPanelOrder.indexOf(panelType);
    const canMoveUp = currentIndex > 0;
    const canMoveDown = currentIndex < sidebarPanelOrder.length - 1;

    const handleMoveUp = useCallback(() => {
        if (!canMoveUp) return;

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
        if (!canMoveDown) return;

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
        } else if (panelType === 'lyrics') {
            setSettings({
                general: {
                    showLyricsInSidebar: false,
                },
            });
        } else if (panelType === 'visualizer') {
            setSettings({
                general: {
                    showVisualizerInSidebar: false,
                },
            });
        }
    }, [combinedLyricsAndVisualizer, panelType, setSettings]);

    return (
        <div className={styles.panelReorderControls}>
            <ActionIconGroup>
                <ActionIcon
                    disabled={!canMoveUp}
                    icon="arrowUp"
                    iconProps={{ size: 'sm' }}
                    onClick={handleMoveUp}
                    size="xs"
                    tooltip={{
                        label: t('action.moveUp', { postProcess: 'sentenceCase' }),
                    }}
                    variant="subtle"
                />
                <ActionIcon
                    disabled={!canMoveDown}
                    icon="arrowDown"
                    iconProps={{ size: 'sm' }}
                    onClick={handleMoveDown}
                    size="xs"
                    tooltip={{
                        label: t('action.moveDown', { postProcess: 'sentenceCase' }),
                    }}
                    variant="subtle"
                />
                <ActionIcon
                    icon="x"
                    iconProps={{ size: 'sm' }}
                    onClick={handleClose}
                    size="xs"
                    tooltip={{
                        label: t('common.close', { postProcess: 'sentenceCase' }),
                    }}
                    variant="subtle"
                />
            </ActionIconGroup>
        </div>
    );
};

const LyricsPanel = () => {
    return (
        <div className={styles.lyricsSection}>
            <PanelReorderControls panelType="lyrics" />
            <Lyrics fadeOutNoLyricsMessage={false} settingsKey="sidebar" />
        </div>
    );
};

const VisualizerPanel = () => {
    const visualizerType = useSettingsStore((store) => store.visualizer.type);

    return (
        <div className={styles.visualizerSection}>
            <PanelReorderControls panelType="visualizer" />
            <Suspense fallback={<></>}>
                {visualizerType === 'butterchurn' ? (
                    <ButterchurnVisualizer />
                ) : (
                    <AudioMotionAnalyzerVisualizer />
                )}
            </Suspense>
        </div>
    );
};

const CombinedLyricsAndVisualizerPanel = () => {
    const currentSong = usePlayerSong();
    const visualizerType = useSettingsStore((store) => store.visualizer.type);
    const showLyricsInSidebar = useShowLyricsInSidebar();
    const showVisualizerInSidebar = useShowVisualizerInSidebar();
    const { webAudio } = usePlaybackSettings();
    const showVisualizer = showVisualizerInSidebar && webAudio;

    const { data: lyricsData } = useQuery(
        lyricsQueries.songLyrics(
            {
                options: {
                    enabled: !!currentSong?.id && showLyricsInSidebar,
                },
                query: { songId: currentSong?.id || '' },
                serverId: currentSong?._serverId || '',
            },
            currentSong,
        ),
    );

    const hasLyrics = useMemo(() => {
        if (!lyricsData) return false;

        if (Array.isArray(lyricsData)) {
            return lyricsData.length > 0 && !!lyricsData[0]?.lyrics;
        }

        const lyrics = lyricsData.selected?.lyrics;

        if (Array.isArray(lyrics)) {
            return lyrics.length > 0;
        }

        if (typeof lyrics === 'string') {
            return lyrics.trim().length > 0;
        }

        return false;
    }, [lyricsData]);

    return (
        <div className={styles.lyricsSection}>
            <PanelReorderControls panelType="lyrics" />
            {showLyricsInSidebar && <Lyrics fadeOutNoLyricsMessage={true} settingsKey="sidebar" />}
        </div>
    );
};
