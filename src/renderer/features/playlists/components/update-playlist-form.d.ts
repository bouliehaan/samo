import { ContextModalProps } from '@mantine/modals';
import { UpdatePlaylistBody, UpdatePlaylistQuery } from '/@/shared/types/domain-types';
type PlaylistImageProps = {
    imageId: null | string;
    imageUrl: null | string;
    uploadedImage?: string;
};
export declare const UpdatePlaylistContextModal: ({ id, innerProps, }: ContextModalProps<{
    body: Partial<UpdatePlaylistBody>;
    playlistImage?: PlaylistImageProps;
    query: UpdatePlaylistQuery;
}>) => import("react/jsx-runtime").JSX.Element;
export {};
