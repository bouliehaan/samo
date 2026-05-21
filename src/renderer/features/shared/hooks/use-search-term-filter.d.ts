export declare const useSearchTermFilter: (defaultValue?: string) => {
    searchTerm: string | undefined;
    setSearchTerm: ((value: string | null) => void) & {
        flush: () => void;
        cancel: () => void;
        _isFirstCall: boolean;
    };
};
