import { jsx as _jsx } from "react/jsx-runtime";
import { Button } from '/@/shared/components/button/button';
export const ModalButton = ({ children, ...props }) => {
    return (_jsx(Button, { px: "2xl", uppercase: true, variant: "subtle", ...props, children: children }));
};
