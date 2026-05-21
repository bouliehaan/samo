import { RowComponentProps } from 'react-window-v2';
import { VirtualMultiSelectOption } from '/@/shared/components/multi-select/virtual-multi-select';
export declare function ArtistMultiSelectRow({ disabled, displayCountType, focusedIndex, index, onToggle, options, style, }: RowComponentProps<{
    disabled?: boolean;
    displayCountType?: 'album' | 'song';
    focusedIndex: null | number;
    onToggle: (value: string) => void;
    options: VirtualMultiSelectOption<{
        albumCount: null | number;
        imageUrl: string | undefined;
        songCount: null | number;
    }>[];
    value: string[];
}>): import("react/jsx-runtime").JSX.Element;
export declare function GenreMultiSelectRow({ disabled, displayCountType, focusedIndex, index, onToggle, options, style, }: RowComponentProps<{
    disabled?: boolean;
    displayCountType?: 'album' | 'song';
    focusedIndex: null | number;
    onToggle: (value: string) => void;
    options: VirtualMultiSelectOption<{
        albumCount: null | number;
        songCount: null | number;
    }>[];
    value: string[];
}>): import("react/jsx-runtime").JSX.Element;
