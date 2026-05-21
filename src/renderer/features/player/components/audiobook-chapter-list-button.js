import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import formatDuration from 'format-duration';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './audiobook-chapter-list-button.module.css';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { getOrderedAudiobookChapters, useAudiobookActions, useAudiobookChapters, useAudiobookDuration, useAudiobookPosition, } from '/@/renderer/store/audiobook.store';
import { usePlaybackSource } from '/@/renderer/store/playback-owner.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Popover } from '/@/shared/components/popover/popover';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
const formatChapterTime = (seconds) => formatDuration(Math.max(0, seconds) * 1000 || 0);
export const AudiobookChapterListButton = () => {
    const { t } = useTranslation();
    const [opened, setOpened] = useState(false);
    const source = usePlaybackSource();
    const audiobookChapters = useAudiobookChapters();
    const audiobookDuration = useAudiobookDuration();
    const audiobookPosition = useAudiobookPosition();
    const audiobookActions = useAudiobookActions();
    const { mediaSeekToTimestamp } = usePlayer();
    const chapters = useMemo(() => getOrderedAudiobookChapters(audiobookChapters, audiobookDuration), [audiobookChapters, audiobookDuration]);
    if (source !== 'audiobook' || chapters.length <= 1) {
        return null;
    }
    const activeChapterIndex = chapters.findIndex((chapter, index) => {
        const isLastChapter = index === chapters.length - 1;
        return (audiobookPosition >= chapter.start &&
            (audiobookPosition < chapter.end ||
                (isLastChapter && audiobookPosition <= audiobookDuration)));
    });
    const handleChapterSelect = (start) => {
        audiobookActions.seekTo(start);
        mediaSeekToTimestamp(start);
        setOpened(false);
    };
    return (_jsxs(Popover, { onChange: setOpened, opened: opened, position: "top-end", width: 360, children: [_jsx(Popover.Target, { children: _jsx(ActionIcon, { icon: "metadata", iconProps: {
                        color: opened ? 'primary' : undefined,
                        size: 'lg',
                    }, onClick: (event) => {
                        event.stopPropagation();
                        setOpened((prev) => !prev);
                    }, size: "sm", tooltip: {
                        label: t('player.chapters', {
                            defaultValue: 'Chapters',
                            postProcess: 'titleCase',
                        }),
                        openDelay: 0,
                    }, variant: "subtle" }) }), _jsxs(Popover.Dropdown, { onClick: (event) => {
                    event.stopPropagation();
                }, p: "xs", children: [_jsx("div", { className: styles.header, children: t('player.chapters', {
                            defaultValue: 'Chapters',
                            postProcess: 'titleCase',
                        }) }), _jsx(ScrollArea, { className: styles.chapterList, children: chapters.map((chapter, index) => {
                            const isActive = index === activeChapterIndex;
                            const title = chapter.chapter.title?.trim() || `Chapter ${index + 1}`;
                            return (_jsxs("button", { "aria-current": isActive ? 'true' : undefined, className: styles.chapterRow, onClick: (event) => {
                                    event.stopPropagation();
                                    handleChapterSelect(chapter.start);
                                }, type: "button", children: [_jsx("span", { className: styles.chapterIndicator }), _jsxs("span", { className: styles.chapterText, children: [_jsx("span", { className: styles.chapterTitle, children: title }), _jsxs("span", { className: styles.chapterMeta, children: [formatChapterTime(chapter.start), _jsx("span", { "aria-hidden": true, children: " \u00B7 " }), formatChapterTime(chapter.duration)] })] })] }, `${chapter.originalIndex}-${chapter.start}`));
                        }) })] })] }));
};
