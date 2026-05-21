import { ItemListStateActions, ItemListStateItemWithRequiredProperties } from '/@/renderer/components/item-list/helpers/item-list-state';
import { Album, AlbumArtist, Artist, Folder, Genre, Playlist, Song } from '/@/shared/types/domain-types';
/**
 * Gets the items that should be dragged based on the current data and selection state.
 * If the current item is already selected, drag all selected items.
 * Otherwise, select and drag only the current item.
 * If internalState is not provided, returns the single item wrapped in an array.
 *
 * @param data - The item data to drag (Album, AlbumArtist, Artist, Folder, Playlist, or Song)
 * @param internalState - The item list state actions (optional)
 * @param updateSelection - Whether to update the selection state (default: true)
 * @returns Array of items that should be dragged (with original values, asserting id, itemType, and _serverId)
 */
export declare const getDraggedItems: (data: Album | AlbumArtist | Artist | Folder | Genre | Playlist | Song | undefined, internalState?: ItemListStateActions, updateSelection?: boolean) => ItemListStateItemWithRequiredProperties[];
