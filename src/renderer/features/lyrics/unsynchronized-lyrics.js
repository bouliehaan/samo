import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import styles from './unsynchronized-lyrics.module.css';
import { LyricLine } from '/@/renderer/features/lyrics/lyric-line';
import { useLyricsDisplaySettings, useLyricsSettings } from '/@/renderer/store';
export const UnsynchronizedLyrics = ({ lyrics, settingsKey = 'default', translatedLyrics, }) => {
    const lyricsSettings = useLyricsSettings();
    const displaySettings = useLyricsDisplaySettings(settingsKey);
    const settings = {
        ...lyricsSettings,
        fontSizeUnsync: displaySettings.fontSizeUnsync && displaySettings.fontSizeUnsync !== 0
            ? displaySettings.fontSizeUnsync
            : 24,
        gapUnsync: displaySettings.gapUnsync && displaySettings.gapUnsync !== 0
            ? displaySettings.gapUnsync
            : 24,
    };
    const lines = useMemo(() => {
        return lyrics.split('\n');
    }, [lyrics]);
    const translatedLines = useMemo(() => {
        return translatedLyrics ? translatedLyrics.split('\n') : [];
    }, [translatedLyrics]);
    const useVirtualization = lines.length > 100;
    const itemHeight = settings.gapUnsync + settings.fontSizeUnsync + 4;
    const headerItems = [];
    const renderItem = ({ index, style: itemStyle, }) => {
        if (index < headerItems.length) {
            const item = headerItems[index];
            return (_jsx("div", { style: itemStyle, children: _jsx(LyricLine, { alignment: settings.alignment, className: "lyric-credit", fontSize: settings.fontSizeUnsync, text: item.text }) }));
        }
        const lineIdx = index - headerItems.length;
        const text = lines[lineIdx];
        const translatedLine = translatedLines[lineIdx] || '';
        return (_jsx("div", { style: itemStyle, children: _jsx(LyricLine, { alignment: settings.alignment, className: "lyric-line unsynchronized", fontSize: settings.fontSizeUnsync, id: `lyric-${lineIdx}`, text: text + (translatedLine ? `_BREAK_${translatedLine}` : '') }) }));
    };
    if (useVirtualization) {
        return (_jsx("div", { className: styles.container, style: { gap: `${settings.gapUnsync}px`, height: '100%' }, children: _jsx(List, { height: 600, itemCount: lines.length + headerItems.length, itemSize: itemHeight, width: "100%", children: renderItem }) }));
    }
    return (_jsx("div", { className: styles.container, style: { gap: `${settings.gapUnsync}px` }, children: lines.map((text, idx) => (_jsx(LyricLine, { alignment: settings.alignment, className: "lyric-line unsynchronized", fontSize: settings.fontSizeUnsync, id: `lyric-${idx}`, text: text + (translatedLines[idx] ? `_BREAK_${translatedLines[idx]}` : '') }, idx))) }));
};
