import { ArtistReleaseTypeItem } from '/@/renderer/store';
import { Album } from '/@/shared/types/domain-types';
export type GroupingType = 'all' | 'primary';
export declare const groupAlbumsByReleaseType: (albums: Album[], routeId: string, groupingType?: GroupingType) => Record<string, Album[]>;
export declare const releaseTypeToEnumMap: Record<string, ArtistReleaseTypeItem>;
export declare const getArtistAlbumsGrouped: (albums: Album[], routeId: string, groupingType: GroupingType, artistReleaseTypeItems: {
    disabled: boolean;
    id: string;
}[], t: (key: string, options?: any) => string) => {
    flatSortedAlbums: Album[];
    releaseTypeEntries: {
        albums: Album[];
        displayName: string | Iterable<import("react").ReactNode>;
        releaseType: string;
    }[];
};
export declare const useArtistAlbumsGrouped: (albums: Album[], routeId: string) => {
    flatSortedAlbums: Album[];
    releaseTypeEntries: {
        albums: Album[];
        displayName: string | Iterable<import("react").ReactNode>;
        releaseType: string;
    }[];
};
