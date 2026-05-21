import { jsx as _jsx } from "react/jsx-runtime";
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
export const MoreButton = ({ ...props }) => {
    return (_jsx(ActionIcon, { icon: "ellipsisHorizontal", iconProps: {
            size: 'lg',
            ...props.iconProps,
        }, variant: "subtle", ...props }));
};
