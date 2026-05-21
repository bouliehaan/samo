import { ReactNode } from 'react';
export interface LyricsContextMenuProps {
    canExport: boolean;
    canSearch: boolean;
    canTranslate: boolean;
    children: ReactNode;
    hasOffset: boolean;
    hasOverride: boolean;
    isShowingTranslation: boolean;
    languages?: null | {
        label: string;
        value: string;
    }[];
    onAdjustOffset: (deltaMs: number) => void;
    onClearOverride: () => void;
    onExport: () => void;
    onPickLanguage?: (index: number) => void;
    onResetOffset: () => void;
    onSearchOverride: () => void;
    onSuppress: () => void;
    onToggleTranslation: () => void;
    selectedLanguage?: number;
}
export declare const LyricsContextMenu: ({ canExport, canSearch, canTranslate, children, hasOffset, hasOverride, isShowingTranslation, languages, onAdjustOffset, onClearOverride, onExport, onPickLanguage, onResetOffset, onSearchOverride, onSuppress, onToggleTranslation, selectedLanguage, }: LyricsContextMenuProps) => import("react/jsx-runtime").JSX.Element;
