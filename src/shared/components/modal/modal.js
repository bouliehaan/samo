import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Modal as MantineModal } from '@mantine/core';
import { closeAllModals as closeAllModalsMantine, ModalsProvider as MantineModalsProvider, openModal as openModalMantine, } from '@mantine/modals';
import styles from './modal.module.css';
import { Button } from '/@/shared/components/button/button';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Stack } from '/@/shared/components/stack/stack';
export const openModal = openModalMantine;
export const closeAllModals = closeAllModalsMantine;
export const Modal = ({ children, classNames, handlers, ...rest }) => {
    return (_jsx(MantineModal, { ...rest, centered: true, classNames: {
            body: styles.body,
            close: styles.close,
            content: styles.content,
            header: styles.header,
            inner: styles.inner,
            overlay: styles.overlay,
            root: styles.root,
            title: styles.title,
            ...classNames,
        }, closeButtonProps: {
            icon: _jsx(Icon, { icon: "x", size: "xl" }),
        }, onClose: handlers.close, overlayProps: {
            backgroundOpacity: 0.5,
            blur: 1,
        }, radius: "md", scrollAreaComponent: ScrollArea, transitionProps: {
            duration: 300,
            exitDuration: 300,
            transition: 'fade',
        }, children: children }));
};
export const BaseContextModal = ({ context, id, innerProps, }) => _jsx(_Fragment, { children: innerProps.modalBody({ context, id }) });
export const ConfirmModal = ({ children, disabled, labels, loading, onCancel, onConfirm, }) => {
    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        }
        else {
            closeAllModals();
        }
    };
    return (_jsxs(Stack, { children: [_jsx(Flex, { children: children }), _jsxs(Group, { justify: "flex-end", children: [_jsx(Button, { disabled: loading, onClick: handleCancel, variant: "default", children: labels?.cancel ? labels.cancel : 'Cancel' }), _jsx(Button, { "data-autofocus": true, disabled: disabled, loading: loading, onClick: onConfirm, variant: "filled", children: labels?.confirm ? labels.confirm : 'Confirm' })] })] }));
};
export const ModalsProvider = ({ children, ...rest }) => {
    return (_jsx(MantineModalsProvider, { modalProps: {
            centered: true,
            classNames: {
                body: styles.body,
                close: styles.close,
                content: styles.content,
                header: styles.header,
                inner: styles.inner,
                overlay: styles.overlay,
                root: styles.root,
                title: styles.title,
            },
            closeButtonProps: {
                icon: _jsx(Icon, { icon: "x", size: "xl" }),
            },
            overlayProps: {
                backgroundOpacity: 0.5,
                blur: 1,
            },
            radius: 'xl',
            scrollAreaComponent: ScrollArea,
            transitionProps: {
                duration: 300,
                exitDuration: 300,
                transition: 'fade',
            },
        }, ...rest, children: children }));
};
