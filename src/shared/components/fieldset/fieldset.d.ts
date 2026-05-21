import { FieldsetProps as MantineFieldsetProps } from '@mantine/core';
import { CSSProperties } from 'react';
export interface FieldsetProps extends MantineFieldsetProps {
    maxWidth?: CSSProperties['maxWidth'];
    width?: CSSProperties['width'];
}
export declare const Fieldset: import("react").ForwardRefExoticComponent<FieldsetProps & import("react").RefAttributes<HTMLFieldSetElement>>;
