import { ActionIconProps } from '/@/shared/components/action-icon/action-icon';
import { ButtonProps } from '/@/shared/components/button/button';
import { AppIcon } from '/@/shared/components/icon/icon';
export interface DefaultPlayButtonProps extends ActionIconProps {
    size?: number | string;
}
export declare const DefaultPlayButton: import("react").ForwardRefExoticComponent<DefaultPlayButtonProps & import("react").RefAttributes<HTMLButtonElement>>;
interface TextPlayButtonProps extends ButtonProps {
    onLongPress?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    showTooltip?: boolean;
}
export declare const PlayTextButton: ({ className, showTooltip, variant, ...props }: TextPlayButtonProps) => import("react/jsx-runtime").JSX.Element;
export declare const PlayNextTextButton: ({ ...props }: TextPlayButtonProps) => import("react/jsx-runtime").JSX.Element;
export declare const PlayLastTextButton: ({ ...props }: TextPlayButtonProps) => import("react/jsx-runtime").JSX.Element;
export declare const WideShuffleButton: ({ ...props }: TextPlayButtonProps) => import("react/jsx-runtime").JSX.Element;
interface PlayButtonProps {
    classNames?: string;
    fill?: boolean;
    icon?: keyof typeof AppIcon;
    isSecondary?: boolean;
    loading?: boolean;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onLongPress?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}
export declare const PlayButton: import("react").NamedExoticComponent<PlayButtonProps & import("react").RefAttributes<HTMLButtonElement>>;
export {};
