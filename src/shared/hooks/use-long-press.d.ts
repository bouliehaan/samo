interface UseLongPressOptions<T extends HTMLElement = HTMLElement> {
    delay?: number;
    onClick?: (event: React.MouseEvent<T> | React.TouchEvent<T>) => void;
    onFinish?: (event: null | React.MouseEvent<T> | React.TouchEvent<T>) => void;
    onLongPress?: (event: React.MouseEvent<T> | React.TouchEvent<T>) => void;
    onStart?: (event: React.MouseEvent<T> | React.TouchEvent<T>) => void;
}
interface UseLongPressReturn {
    onMouseDown: (event: React.MouseEvent) => void;
    onMouseLeave: (event: React.MouseEvent) => void;
    onMouseUp: (event: React.MouseEvent) => void;
    onTouchCancel: (event: React.TouchEvent) => void;
    onTouchEnd: (event: React.TouchEvent) => void;
    onTouchStart: (event: React.TouchEvent) => void;
}
export declare const useLongPress: <T extends HTMLElement = HTMLElement>({ delay, onClick, onFinish, onLongPress, onStart, }: UseLongPressOptions<T>) => UseLongPressReturn;
export {};
