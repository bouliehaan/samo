import { useMemo } from 'react';
import { List, RowComponentProps } from 'react-window-v2';

import styles from './unsynchronized-lyrics.module.css';

import { LyricLine } from '/@/renderer/features/lyrics/lyric-line';
import { useLyricsDisplaySettings, useLyricsSettings } from '/@/renderer/store';
import { FullLyricsMetadata } from '/@/shared/types/domain-types';

export interface UnsynchronizedLyricsProps extends Omit<FullLyricsMetadata, 'lyrics'> {
    lyrics: string;
    settingsKey?: string;
    translatedLyrics?: null | string;
}

type LyricRowProps = {
    alignment: 'center' | 'left' | 'right';
    fontSize: number;
    lines: string[];
    translatedLines: string[];
};

const LyricRow = ({
    alignment,
    fontSize,
    index,
    lines,
    style,
    translatedLines,
}: RowComponentProps<LyricRowProps>) => {
    const translatedLine = translatedLines[index] || '';

    return (
        <div style={style}>
            <LyricLine
                alignment={alignment}
                className="lyric-line unsynchronized"
                fontSize={fontSize}
                id={`lyric-${index}`}
                text={lines[index] + (translatedLine ? `_BREAK_${translatedLine}` : '')}
            />
        </div>
    );
};

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

    const rowProps: LyricRowProps = useMemo(
        () => ({
            alignment: settings.alignment,
            fontSize: settings.fontSizeUnsync,
            lines,
            translatedLines,
        }),
        [settings.alignment, settings.fontSizeUnsync, lines, translatedLines],
    );

    if (useVirtualization) {
        return (
            <div
                className={styles.container}
                style={{ gap: `${settings.gapUnsync}px`, height: '100%' }}
            >
                {/*
                 * v2 sizes itself to its container, which also fixes a latent
                 * bug: under v1 this passed a hardcoded `height={600}`, so long
                 * lyrics were clipped to 600px regardless of how tall the pane
                 * actually was.
                 */}
                <List
                    rowComponent={LyricRow}
                    rowCount={lines.length}
                    rowHeight={itemHeight}
                    rowProps={rowProps}
                />
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
