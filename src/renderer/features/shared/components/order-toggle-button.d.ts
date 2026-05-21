import { ActionIconProps } from '/@/shared/components/action-icon/action-icon';
import { SortOrder } from '/@/shared/types/domain-types';
interface OrderToggleButtonProps {
    buttonProps?: Partial<ActionIconProps>;
    disabled?: boolean;
    onToggle: () => void;
    sortOrder: SortOrder;
}
export declare const OrderToggleButton: ({ buttonProps, disabled, onToggle, sortOrder, }: OrderToggleButtonProps) => import("react/jsx-runtime").JSX.Element;
export {};
