import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import formatDuration from 'format-duration';
import { motion } from 'motion/react';
import { lazy, Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './full-screen-player-queue.module.css';
import { Lyrics } from '/@/renderer/features/lyrics/lyrics';
import { PlayQueue } from '/@/renderer/features/now-playing/components/play-queue';
import { FullScreenSimilarSongs } from '/@/renderer/features/player/components/full-screen-similar-songs';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { usePlaybackSettings, useSettingsStore } from '/@/renderer/store';
import { getOrderedAudiobookChapters, useAudiobookActions, useAudiobookChapters, useAudiobookDuration, useAudiobookPosition, } from '/@/renderer/store/audiobook.store';
import { useFullScreenPlayerStore, useFullScreenPlayerStoreActions, } from '/@/renderer/store/full-screen-player.store';
import { usePlaybackSource } from '/@/renderer/store/playback-owner.store';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { ItemListKey } from '/@/shared/types/types';
const AudioMotionAnalyzerVisualizer = lazy(() => import('../../visualizer/components/audiomotionanalyzer/visualizer').then((module) => ({
    default: module.Visualizer,
})));
const ButterchurnVisualizer = lazy(() => import('../../visualizer/components/butternchurn/visualizer').then((module) => ({
    default: module.Visualizer,
})));
const formatChapterTime = (seconds) => formatDuration(Math.max(0, seconds) * 1000 || 0);
const FullScreenVisualizerPane = ({ visualizerType, webAudio, }) => {
    if (!webAudio)
        return null;
    return (_jsx(Suspense, { fallback: _jsx(_Fragment, {}), children: visualizerType === 'butterchurn' ? (_jsx(ButterchurnVisualizer, {})) : (_jsx(AudioMotionAnalyzerVisualizer, {})) }));
};
const FullScreenAudiobookChapters = () => {
    const audiobookChapters = useAudiobookChapters();
    const audiobookDuration = useAudiobookDuration();
    const audiobookPosition = useAudiobookPosition();
    const audiobookActions = useAudiobookActions();
    const { mediaSeekToTimestamp } = usePlayer();
    const chapters = useMemo(() => getOrderedAudiobookChapters(audiobookChapters, audiobookDuration), [audiobookChapters, audiobookDuration]);
    const activeChapterIndex = chapters.findIndex((chapter, index) => {
        const isLastChapter = index === chapters.length - 1;
        return (audiobookPosition >= chapter.start &&
            (audiobookPosition < chapter.end ||
                (isLastChapter && audiobookPosition <= audiobookDuration)));
    });
    return (_jsx("div", { className: styles.longFormPanel, children: _jsx(ScrollArea, { className: styles.chapterList, children: chapters.map((chapter, index) => {
                const isActive = index === activeChapterIndex;
                const title = chapter.chapter.title?.trim() || `Chapter ${index + 1}`;
                return (_jsxs("button", { "aria-current": isActive ? 'true' : undefined, className: styles.chapterRow, onClick: () => {
                        audiobookActions.seekTo(chapter.start);
                        mediaSeekToTimestamp(chapter.start);
                    }, type: "button", children: [_jsx("span", { className: styles.chapterIndicator }), _jsxs("span", { className: styles.chapterText, children: [_jsx("span", { className: styles.chapterTitle, children: title }), _jsxs("span", { className: styles.chapterMeta, children: [formatChapterTime(chapter.start), _jsx("span", { "aria-hidden": true, children: " \u00B7 " }), formatChapterTime(chapter.duration)] })] })] }, `${chapter.originalIndex}-${chapter.start}`));
            }) }) }));
};
export const FullScreenPlayerQueue = () => {
    const { t } = useTranslation();
    const { activeTab } = useFullScreenPlayerStore();
    const { setStore } = useFullScreenPlayerStoreActions();
    const { webAudio } = usePlaybackSettings();
    const visualizerType = useSettingsStore((store) => store.visualizer.type);
    const playbackSource = usePlaybackSource();
    const isMusicMode = playbackSource == null || playbackSource === 'music';
    const isAudiobookMode = playbackSource === 'audiobook';
    const isPodcastMode = playbackSource === 'podcast';
    const isRadioMode = playbackSource === 'radio';
    const headerItems = useMemo(() => {
        const items = [
            {
                active: activeTab === 'queue',
                label: t('page.fullscreenPlayer.upNext'),
                onClick: () => setStore({ activeTab: 'queue' }),
            },
            {
                active: activeTab === 'related',
                label: t('page.fullscreenPlayer.related'),
                onClick: () => setStore({ activeTab: 'related' }),
            },
            {
                active: activeTab === 'lyrics',
                label: t('page.fullscreenPlayer.lyrics'),
                onClick: () => setStore({ activeTab: 'lyrics' }),
            },
        ];
        if (webAudio) {
            items.push({
                active: activeTab === 'visualizer',
                label: t('page.fullscreenPlayer.visualizer', { postProcess: 'titleCase' }),
                onClick: () => setStore({ activeTab: 'visualizer' }),
            });
        }
        return items;
    }, [activeTab, setStore, t, webAudio]);
    const renderContent = () => {
        if (isAudiobookMode) {
            return _jsx(FullScreenAudiobookChapters, {});
        }
        if (isPodcastMode || isRadioMode) {
            return _jsx(FullScreenVisualizerPane, { visualizerType: visualizerType, webAudio: webAudio });
        }
        return activeTab === 'queue' ? (_jsx("div", { className: styles.queueContainer, children: _jsx(PlayQueue, { enableScrollShadow: false, listKey: ItemListKey.FULL_SCREEN, searchTerm: undefined }) })) : activeTab === 'related' ? (_jsx("div", { className: styles.queueContainer, children: _jsx(FullScreenSimilarSongs, {}) })) : activeTab === 'lyrics' ? (_jsx(Lyrics, {})) : activeTab === 'visualizer' && webAudio ? (_jsx(FullScreenVisualizerPane, { visualizerType: visualizerType, webAudio: webAudio })) : null;
    };
    return (_jsxs("div", { className: clsx(styles.gridContainer, !isMusicMode && styles.noHeader, 'full-screen-player-queue-container'), style: {
            '--opacity': 0,
        }, children: [isMusicMode && (_jsx(Group, { align: "center", className: "full-screen-player-queue-header", gap: 0, grow: true, justify: "center", pb: "md", children: headerItems.map((item) => (_jsxs("div", { className: styles.headerItemWrapper, children: [_jsx(Button, { flex: 1, fw: "600", onClick: item.onClick, pos: "relative", size: "lg", uppercase: true, variant: "transparent", children: item.label }), item.active ? (_jsx(motion.div, { className: styles.activeTabIndicator, layoutId: "underline" })) : null] }, `tab-${item.label}`))) })), renderContent()] }));
};
