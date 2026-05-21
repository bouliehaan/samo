interface SearchAlbumsSectionProps {
    debouncedQuery: string;
    expanded: boolean;
    isHome: boolean;
    onSelectResult: () => void;
    onToggle: () => void;
    query: string;
}
export declare function SearchAlbumsSection({ debouncedQuery, expanded, isHome, onSelectResult, onToggle, query, }: SearchAlbumsSectionProps): import("react/jsx-runtime").JSX.Element | null;
export {};
