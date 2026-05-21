import { ServerListItem } from '/@/shared/types/domain-types';
interface EditServerFormProps {
    isUpdate?: boolean;
    onCancel: () => void;
    password: null | string;
    server: ServerListItem;
}
export declare const EditServerForm: ({ isUpdate, onCancel, password, server }: EditServerFormProps) => import("react/jsx-runtime").JSX.Element;
export {};
