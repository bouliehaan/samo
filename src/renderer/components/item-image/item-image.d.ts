import z from 'zod';
import { GeneralSettingsSchema } from '/@/renderer/store';
import { ImageProps } from '/@/shared/components/image/image';
import { ExplicitStatus, ImageRequest, LibraryItem } from '/@/shared/types/domain-types';
export declare const ItemImage: import("react").MemoExoticComponent<(props: Omit<ImageProps, "id" | "src"> & {
    explicitStatus?: ExplicitStatus | null;
    id?: null | string;
    itemType: LibraryItem;
    serverId?: null | string;
    src?: null | string;
    type?: keyof z.infer<typeof GeneralSettingsSchema>["imageRes"];
}) => import("react/jsx-runtime").JSX.Element>;
interface UseItemImageUrlProps {
    id?: null | string;
    imageUrl?: null | string;
    itemType: LibraryItem;
    serverId?: string;
    size?: number;
    type?: keyof z.infer<typeof GeneralSettingsSchema>['imageRes'];
    useRemoteUrl?: boolean;
}
export declare const useItemImageUrl: (args: UseItemImageUrlProps) => string | undefined;
export declare const useItemImageRequest: (args: UseItemImageUrlProps) => ImageRequest | undefined;
export declare function getItemImageRequest(args: UseItemImageUrlProps): ImageRequest | undefined;
export declare function getItemImageUrl(args: UseItemImageUrlProps): string | undefined;
export {};
