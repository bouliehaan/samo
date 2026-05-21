import { Playlist } from '/@/shared/types/domain-types';
interface EditPlaylistActionProps {
    disabled?: boolean;
    items: Playlist[];
}
export declare const EditPlaylistAction: ({ disabled, items }: EditPlaylistActionProps) => import("react/jsx-runtime").JSX.Element | null;
export {};
