import { Button } from '/@/shared/components/button/button';
export const ModalButton = ({ children, ...props }) => {
    return (<Button px="2xl" uppercase variant="subtle" {...props}>
            {children}
        </Button>);
};
