import { FullLyricsMetadata, SynchronizedLyricsArray } from '/@/shared/types/domain-types';
export interface SynchronizedLyricsProps extends Omit<FullLyricsMetadata, 'lyrics'> {
    lyrics: SynchronizedLyricsArray;
    offsetMs?: number;
    settingsKey?: string;
    style?: React.CSSProperties;
    translatedLyrics?: null | string;
}
export declare const SynchronizedLyrics: ({ lyrics, offsetMs, settingsKey, style, translatedLyrics, }: SynchronizedLyricsProps) => import("react/jsx-runtime").JSX.Element;
