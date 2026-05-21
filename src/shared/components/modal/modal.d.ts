import { ModalProps as MantineModalProps } from '@mantine/core';
import { ContextModalProps, ModalsProviderProps as MantineModalsProviderProps } from '@mantine/modals';
import React, { ReactNode } from 'react';
export declare const openModal: (payload: import("node_modules/@mantine/modals/lib/context").ModalSettings) => string;
export declare const closeAllModals: (payload_0?: undefined) => void;
export interface ModalProps extends Omit<MantineModalProps, 'onClose'> {
    children?: ReactNode;
    handlers: {
        close: () => void;
        open: () => void;
        toggle: () => void;
    };
}
export declare const Modal: ({ children, classNames, handlers, ...rest }: ModalProps) => import("react/jsx-runtime").JSX.Element;
export type ContextModalVars = {
    context: ContextModalProps['context'];
    id: ContextModalProps['id'];
};
export declare const BaseContextModal: ({ context, id, innerProps, }: ContextModalProps<{
    modalBody: (vars: ContextModalVars) => React.ReactNode;
}>) => import("react/jsx-runtime").JSX.Element;
interface ConfirmModalProps {
    children: ReactNode;
    disabled?: boolean;
    labels?: {
        cancel?: string;
        confirm?: string;
    };
    loading?: boolean;
    onCancel?: () => void;
    onConfirm: () => void;
}
export declare const ConfirmModal: ({ children, disabled, labels, loading, onCancel, onConfirm, }: ConfirmModalProps) => import("react/jsx-runtime").JSX.Element;
export interface ModalsProviderProps extends MantineModalsProviderProps {
}
export declare const ModalsProvider: ({ children, ...rest }: ModalsProviderProps) => import("react/jsx-runtime").JSX.Element;
export {};
