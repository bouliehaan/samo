import { ReactNode } from 'react';
import { ActionIconProps } from '/@/shared/components/action-icon/action-icon';
import { TooltipProps } from '/@/shared/components/tooltip/tooltip';
interface PlayerButtonProps extends Omit<ActionIconProps, 'icon' | 'variant'> {
    icon: ReactNode;
    isActive?: boolean;
    tooltip?: Omit<TooltipProps, 'children'>;
    variant: 'main' | 'secondary' | 'tertiary';
}
export declare const PlayerButton: import("react").ForwardRefExoticComponent<PlayerButtonProps & import("react").RefAttributes<HTMLButtonElement>>;
interface PlayButtonProps extends Omit<ActionIconProps, 'icon' | 'variant'> {
    isPaused?: boolean;
}
export declare const MainPlayButton: import("react").ForwardRefExoticComponent<PlayButtonProps & import("react").RefAttributes<HTMLButtonElement>>;
export {};
