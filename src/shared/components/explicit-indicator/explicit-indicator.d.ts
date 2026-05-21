import { ComponentPropsWithoutRef } from 'react';
import { ExplicitStatus } from '/@/shared/types/domain-types';
export interface ExplicitIndicatorProps extends ComponentPropsWithoutRef<'span'> {
    explicitStatus: ExplicitStatus | null | undefined;
    size?: ExplicitIndicatorSize;
    withSpace?: boolean;
}
export type ExplicitIndicatorSize = '2xl' | '3xl' | '4xl' | 'lg' | 'md' | 'sm' | 'xl' | 'xs';
export declare const ExplicitIndicator: ({ className, explicitStatus, size, withSpace, ...rest }: ExplicitIndicatorProps) => import("react/jsx-runtime").JSX.Element | null;
