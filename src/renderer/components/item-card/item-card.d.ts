import { ReactNode } from 'react';
import { ItemListStateActions } from '/@/renderer/components/item-list/helpers/item-list-state';
import { ItemControls } from '/@/renderer/components/item-list/types';
import { Album, AlbumArtist, Artist, Genre, LibraryItem, Playlist, Song } from '/@/shared/types/domain-types';
export type DataRow = {
    align?: 'center' | 'end' | 'start';
    format: (data: Album | AlbumArtist | Artist | Genre | Playlist | Song) => null | ReactNode | string;
    id: string;
    isMuted?: boolean;
};
export interface ItemCardProps {
    controls?: ItemControls;
    data: Album | AlbumArtist | Artist | Genre | Playlist | Song | undefined;
    enableDrag?: boolean;
    enableExpansion?: boolean;
    enableMultiSelect?: boolean;
    enableNavigation?: boolean;
    imageAsLink?: boolean;
    imageFetchPriority?: 'auto' | 'high' | 'low';
    internalState?: ItemListStateActions;
    isRound?: boolean;
    itemType: LibraryItem;
    rows?: DataRow[];
    type?: 'compact' | 'default' | 'poster';
    withControls?: boolean;
}
export declare const ItemCard: ({ controls, data, enableDrag, enableExpansion, enableMultiSelect, enableNavigation, imageAsLink, imageFetchPriority, internalState, isRound, itemType, rows: providedRows, type, withControls, }: ItemCardProps) => import("react/jsx-runtime").JSX.Element;
export interface ItemCardDerivativeProps extends Omit<ItemCardProps, 'type'> {
    controls?: ItemControls;
    enableExpansion?: boolean;
    enableNavigation?: boolean;
    imageAsLink?: boolean;
    imageFetchPriority?: 'auto' | 'high' | 'low';
    imageUrl: string | undefined;
    internalState?: ItemListStateActions;
    rows: DataRow[];
    showRating: boolean;
}
export declare const getDataRows: (type?: "compact" | "default" | "poster") => DataRow[];
export declare const getDataRowsCount: () => number;
export declare const MemoizedItemCard: import("react").MemoExoticComponent<({ controls, data, enableDrag, enableExpansion, enableMultiSelect, enableNavigation, imageAsLink, imageFetchPriority, internalState, isRound, itemType, rows: providedRows, type, withControls, }: ItemCardProps) => import("react/jsx-runtime").JSX.Element>;
