import { FullLyricsMetadata } from '/@/shared/types/domain-types';
interface LyricsExportFormProps {
    lyrics: FullLyricsMetadata;
    offsetMs: number;
    synced: boolean;
}
export declare const LyricsExportForm: ({ lyrics, offsetMs, synced }: LyricsExportFormProps) => import("react/jsx-runtime").JSX.Element;
export declare const openLyricsExportModal: ({ lyrics, offsetMs, synced }: LyricsExportFormProps) => void;
export {};
