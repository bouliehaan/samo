import { Playlist } from '/@/shared/types/domain-types';
interface DeletePlaylistActionProps {
    disabled?: boolean;
    items: Playlist[];
}
export declare const DeletePlaylistAction: ({ disabled, items }: DeletePlaylistActionProps) => import("react/jsx-runtime").JSX.Element | null;
export {};
