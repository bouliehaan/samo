interface SearchSongsSectionProps {
    debouncedQuery: string;
    expanded: boolean;
    isHome: boolean;
    onSelectResult: () => void;
    onToggle: () => void;
    query: string;
}
export declare function SearchSongsSection({ debouncedQuery, expanded, isHome, onSelectResult, onToggle, query, }: SearchSongsSectionProps): import("react/jsx-runtime").JSX.Element | null;
export {};
