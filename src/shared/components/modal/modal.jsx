import { Modal as MantineModal } from '@mantine/core';
import { closeAllModals as closeAllModalsMantine, ModalsProvider as MantineModalsProvider, openModal as openModalMantine, } from '@mantine/modals';
import React from 'react';
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
    return (<MantineModal {...rest} centered={true} classNames={{
            body: styles.body,
            close: styles.close,
            content: styles.content,
            header: styles.header,
            inner: styles.inner,
            overlay: styles.overlay,
            root: styles.root,
            title: styles.title,
            ...classNames,
        }} closeButtonProps={{
            icon: <Icon icon="x" size="xl"/>,
        }} onClose={handlers.close} overlayProps={{
            backgroundOpacity: 0.5,
            blur: 1,
        }} radius="md" scrollAreaComponent={ScrollArea} transitionProps={{
            duration: 300,
            exitDuration: 300,
            transition: 'fade',
        }}>
            {children}
        </MantineModal>);
};
export const BaseContextModal = ({ context, id, innerProps, }) => <>{innerProps.modalBody({ context, id })}</>;
export const ConfirmModal = ({ children, disabled, labels, loading, onCancel, onConfirm, }) => {
    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        }
        else {
            closeAllModals();
        }
    };
    return (<Stack>
            <Flex>{children}</Flex>
            <Group justify="flex-end">
                <Button disabled={loading} onClick={handleCancel} variant="default">
                    {labels?.cancel ? labels.cancel : 'Cancel'}
                </Button>
                <Button data-autofocus disabled={disabled} loading={loading} onClick={onConfirm} variant="filled">
                    {labels?.confirm ? labels.confirm : 'Confirm'}
                </Button>
            </Group>
        </Stack>);
};
export const ModalsProvider = ({ children, ...rest }) => {
    return (<MantineModalsProvider modalProps={{
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
                icon: <Icon icon="x" size="xl"/>,
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
        }} {...rest}>
            {children}
        </MantineModalsProvider>);
};
