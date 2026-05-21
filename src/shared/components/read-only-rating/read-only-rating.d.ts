interface ReadOnlyRatingProps {
    className?: string;
    onChange?: (value: number) => void;
    size?: 'md' | 'sm' | 'xs';
    value?: null | number;
}
declare function ReadOnlyRatingComponent({ className, onChange, size, value }: ReadOnlyRatingProps): import("react/jsx-runtime").JSX.Element;
export declare const ReadOnlyRating: import("react").MemoExoticComponent<typeof ReadOnlyRatingComponent>;
export {};
