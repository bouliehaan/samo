import { LibraryItem } from '/@/shared/types/domain-types';
interface TagFiltersProps {
    query: Record<string, any | undefined>;
    setCustom: (value: null | Record<string, any>) => void;
    type: LibraryItem.ALBUM | LibraryItem.SONG;
}
export declare const TagFilters: ({ query, setCustom, type }: TagFiltersProps) => import("react/jsx-runtime").JSX.Element;
export {};
