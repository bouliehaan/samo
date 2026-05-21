import { MouseEvent } from 'react';
import { ServerListItem } from '/@/shared/types/domain-types';
interface CreatePlaylistFormProps {
    onCancel: () => void;
}
export declare const CreatePlaylistForm: ({ onCancel }: CreatePlaylistFormProps) => import("react/jsx-runtime").JSX.Element;
export declare const openCreatePlaylistModal: (server?: ServerListItem, e?: MouseEvent<HTMLButtonElement>) => void;
export {};
