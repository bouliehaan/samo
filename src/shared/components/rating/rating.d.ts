import { RatingProps as MantineRatingProps } from '@mantine/core';
interface RatingProps extends MantineRatingProps {
    preventDefault?: boolean;
    stopPropagation?: boolean;
}
export declare const Rating: ({ classNames, onChange, preventDefault, size, stopPropagation, style, ...props }: RatingProps) => import("react/jsx-runtime").JSX.Element;
export {};
