import { CreatePlaylistBody, CreatePlaylistResponse } from '/@/shared/types/domain-types';
interface SaveAsPlaylistFormProps {
    body: Partial<CreatePlaylistBody>;
    onCancel: () => void;
    onSuccess: (data: CreatePlaylistResponse) => void;
    serverId?: string;
}
export declare const SaveAsPlaylistForm: ({ body, onCancel, onSuccess, serverId, }: SaveAsPlaylistFormProps) => import("react/jsx-runtime").JSX.Element;
export {};
