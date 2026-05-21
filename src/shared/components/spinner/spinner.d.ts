import { IconBaseProps } from 'react-icons';
interface SpinnerProps extends IconBaseProps {
    color?: string;
    container?: boolean;
    size?: number;
}
export declare const SpinnerIcon: import("react-icons").IconType;
export declare const Spinner: import("react").MemoExoticComponent<{
    ({ ...props }: SpinnerProps): import("react/jsx-runtime").JSX.Element;
    displayName: string;
}>;
export {};
