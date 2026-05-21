interface PopoverPlayQueueProps {
    onClose?: () => void;
    onToggle?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    opened?: boolean;
}
export declare const PopoverPlayQueue: ({ onClose, onToggle, opened: controlledOpened, }?: PopoverPlayQueueProps) => import("react/jsx-runtime").JSX.Element;
export {};
