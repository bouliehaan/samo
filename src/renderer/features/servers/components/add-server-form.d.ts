import { ServerListItemWithCredential } from '/@/shared/types/domain-types';
import { ServerType } from '/@/shared/types/types';
interface AddServerFormProps {
    initialServerType?: ServerType;
    onCancel: (() => void) | null;
    onSubmitSuccess?: (server: ServerListItemWithCredential) => void;
}
export declare const AddServerForm: ({ initialServerType: preferredInitialServerType, onCancel, onSubmitSuccess, }: AddServerFormProps) => import("react/jsx-runtime").JSX.Element;
export {};
