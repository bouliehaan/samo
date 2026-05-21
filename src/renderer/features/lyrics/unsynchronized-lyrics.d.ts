import { FullLyricsMetadata } from '/@/shared/types/domain-types';
export interface UnsynchronizedLyricsProps extends Omit<FullLyricsMetadata, 'lyrics'> {
    lyrics: string;
    settingsKey?: string;
    translatedLyrics?: null | string;
}
export declare const UnsynchronizedLyrics: ({ lyrics, settingsKey, translatedLyrics, }: UnsynchronizedLyricsProps) => import("react/jsx-runtime").JSX.Element;
