import { ActionIconProps } from '/@/shared/components/action-icon/action-icon';
import { ListDisplayType } from '/@/shared/types/types';
interface DisplayTypeToggleButtonProps {
    buttonProps?: Partial<ActionIconProps>;
    displayType: ListDisplayType;
    onToggle: () => void;
}
export declare const DisplayTypeToggleButton: ({ buttonProps, displayType, onToggle, }: DisplayTypeToggleButtonProps) => import("react/jsx-runtime").JSX.Element;
export {};
