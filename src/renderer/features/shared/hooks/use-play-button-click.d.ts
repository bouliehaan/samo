interface UsePlayButtonClickOptions {
    disabled?: boolean;
    loading?: boolean;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onLongPress?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}
interface UsePlayButtonClickReturn {
    handlers: {
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
        onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => void;
        onMouseLeave: (e: React.MouseEvent) => void;
        onMouseUp: (e: React.MouseEvent) => void;
        onTouchCancel: (e: React.TouchEvent) => void;
        onTouchEnd: (e: React.TouchEvent) => void;
        onTouchStart: (e: React.TouchEvent) => void;
    };
    props: {
        'data-pressing'?: string;
        disabled: boolean;
        style: React.CSSProperties;
    };
}
export declare const usePlayButtonClick: ({ loading, onClick, onLongPress, }: UsePlayButtonClickOptions) => UsePlayButtonClickReturn;
export {};
