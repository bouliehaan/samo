import { LyricsOverride } from '/@/shared/types/domain-types';
interface LyricSearchFormProps {
    artist?: string;
    name?: string;
    onSearchOverride?: (params: LyricsOverride) => void;
}
export declare const LyricsSearchForm: ({ artist, name, onSearchOverride }: LyricSearchFormProps) => import("react/jsx-runtime").JSX.Element;
export declare const openLyricSearchModal: ({ artist, name, onSearchOverride }: LyricSearchFormProps) => void;
export {};
