import { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';

import styles from './unsynchronized-lyrics.module.css';

import { LyricLine } from '/@/renderer/features/lyrics/lyric-line';
import { useLyricsDisplaySettings, useLyricsSettings } from '/@/renderer/store';
import { FullLyricsMetadata } from '/@/shared/types/domain-types';

export interface UnsynchronizedLyricsProps extends Omit<FullLyricsMetadata, 'lyrics'> {
    lyrics: string;
    settingsKey?: string;
    translatedLyrics?: null | string;
}

export const UnsynchronizedLyrics = ({
    lyrics,
    settingsKey = 'default',
    translatedLyrics,
}: UnsynchronizedLyricsProps) => {
    const lyricsSettings = useLyricsSettings();
    const displaySettings = useLyricsDisplaySettings(settingsKey);
    const settings = {
        ...lyricsSettings,
        fontSizeUnsync:
            displaySettings.fontSizeUnsync && displaySettings.fontSizeUnsync !== 0
                ? displaySettings.fontSizeUnsync
                : 24,
        gapUnsync:
            displaySettings.gapUnsync && displaySettings.gapUnsync !== 0
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

    const headerItems: { text: string; type: string }[] = [];

    const renderItem = ({
        index,
        style: itemStyle,
    }: {
        index: number;
        style: React.CSSProperties;
    }) => {
        if (index < headerItems.length) {
            const item = headerItems[index];
            return (
                <div style={itemStyle}>
                    <LyricLine
                        alignment={settings.alignment}
                        className="lyric-credit"
                        fontSize={settings.fontSizeUnsync}
                        text={item.text}
                    />
                </div>
            );
        }

        const lineIdx = index - headerItems.length;
        const text = lines[lineIdx];
        const translatedLine = translatedLines[lineIdx] || '';

        return (
            <div style={itemStyle}>
                <LyricLine
                    alignment={settings.alignment}
                    className="lyric-line unsynchronized"
                    fontSize={settings.fontSizeUnsync}
                    id={`lyric-${lineIdx}`}
                    text={text + (translatedLine ? `_BREAK_${translatedLine}` : '')}
                />
            </div>
        );
    };

    if (useVirtualization) {
        return (
            <div
                className={styles.container}
                style={{ gap: `${settings.gapUnsync}px`, height: '100%' }}
            >
                <List
                    height={600}
                    itemCount={lines.length + headerItems.length}
                    itemSize={itemHeight}
                    width="100%"
                >
                    {renderItem}
                </List>
            </div>
        );
    }

    return (
        <div className={styles.container} style={{ gap: `${settings.gapUnsync}px` }}>
            {lines.map((text, idx) => (
                <LyricLine
                    alignment={settings.alignment}
                    className="lyric-line unsynchronized"
                    fontSize={settings.fontSizeUnsync}
                    id={`lyric-${idx}`}
                    key={idx}
                    text={text + (translatedLines[idx] ? `_BREAK_${translatedLines[idx]}` : '')}
                />
            ))}
        </div>
    );
};
