import { ActionIconProps } from '/@/shared/components/action-icon/action-icon';
interface FilterButtonProps extends ActionIconProps {
    isActive?: boolean;
}
export declare const FilterButton: ({ isActive, onClick, ...props }: FilterButtonProps) => import("react/jsx-runtime").JSX.Element;
export {};
