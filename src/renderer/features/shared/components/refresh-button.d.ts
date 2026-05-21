import { ActionIconProps } from '/@/shared/components/action-icon/action-icon';
interface RefreshButtonProps extends ActionIconProps {
    loading?: boolean;
}
export declare const RefreshButton: ({ loading, onClick, ...props }: RefreshButtonProps) => import("react/jsx-runtime").JSX.Element;
export {};
