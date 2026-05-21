import type { HTMLAttributes, ReactNode } from 'react';
import { AppIcon } from '/@/shared/components/icon/icon';
export interface DragDropZoneFileProps extends DivProps {
    accept?: string;
    children: ReactNode;
    mode: 'file';
    onFileSelected: (file: File) => Promise<void> | void;
}
export type DragDropZoneProps = DragDropZoneFileProps | DragDropZoneTextProps;
type DivProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onDragEnter' | 'onDragLeave' | 'onDragOver' | 'onDrop'>;
interface DragDropZoneTextProps {
    icon: keyof typeof AppIcon;
    mode?: 'text';
    onItemSelected: (contents: string) => void;
    validateItem?: (contents: string) => {
        error?: string;
        isValid: boolean;
    };
}
export declare const DragDropZone: (props: DragDropZoneProps) => import("react/jsx-runtime").JSX.Element;
export {};
