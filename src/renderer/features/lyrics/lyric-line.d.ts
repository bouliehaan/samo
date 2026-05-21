import { ComponentPropsWithoutRef } from 'react';
interface LyricLineProps extends ComponentPropsWithoutRef<'div'> {
    alignment: 'center' | 'left' | 'right';
    fontSize: number;
    text: string;
}
export declare const LyricLine: import("react").MemoExoticComponent<({ alignment, className, fontSize, text, ...props }: LyricLineProps) => import("react/jsx-runtime").JSX.Element>;
export {};
