import { ItemListStateActions } from '/@/renderer/components/item-list/helpers/item-list-state';
import { ItemControls } from '/@/renderer/components/item-list/types';
import { Album, AlbumArtist, Artist, Genre, LibraryItem, Playlist, Song } from '/@/shared/types/domain-types';
interface ItemCardControlsProps {
    controls?: ItemControls;
    enableExpansion?: boolean;
    internalState?: ItemListStateActions;
    item: Album | AlbumArtist | Artist | Genre | Playlist | Song | undefined;
    itemType: LibraryItem;
    showRating?: boolean;
    type?: 'compact' | 'default' | 'poster';
}
export declare const ItemCardControls: ({ controls, enableExpansion, internalState, item, itemType, type, }: ItemCardControlsProps) => import("react/jsx-runtime").JSX.Element;
export {};
