interface SearchAlbumArtistsSectionProps {
    debouncedQuery: string;
    expanded: boolean;
    isHome: boolean;
    onSelectResult: () => void;
    onToggle: () => void;
    query: string;
}
export declare function SearchAlbumArtistsSection({ debouncedQuery, expanded, isHome, onSelectResult, onToggle, query, }: SearchAlbumArtistsSectionProps): import("react/jsx-runtime").JSX.Element | null;
export {};
