import { LibraryItem } from '/@/shared/types/domain-types';
interface SetFavoriteActionProps {
    ids: string[];
    items?: Array<{
        id: string;
        userFavorite?: boolean;
    }>;
    itemType: LibraryItem;
}
export declare const SetFavoriteAction: ({ ids, items, itemType }: SetFavoriteActionProps) => import("react/jsx-runtime").JSX.Element;
export {};
