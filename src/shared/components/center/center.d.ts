import { CenterProps as MantineCenterProps } from '@mantine/core';
import { MouseEvent } from 'react';
export interface CenterProps extends MantineCenterProps {
    onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}
export declare const Center: import("react").NamedExoticComponent<CenterProps & import("react").RefAttributes<HTMLDivElement>>;
