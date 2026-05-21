interface UseItemListScrollPersistProps {
    enabled: boolean;
}
export declare const useItemListScrollPersist: ({ enabled }: UseItemListScrollPersistProps) => {
    handleOnScrollEnd: (offset: number) => void;
    scrollOffset: number | undefined;
};
export {};
