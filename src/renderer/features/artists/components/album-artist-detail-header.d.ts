import { UseSuspenseQueryResult } from '@tanstack/react-query';
import { AlbumListResponse } from '/@/shared/types/domain-types';
interface AlbumArtistDetailHeaderProps {
    albumsQuery: UseSuspenseQueryResult<AlbumListResponse, Error>;
}
export declare const AlbumArtistDetailHeader: import("react").ForwardRefExoticComponent<AlbumArtistDetailHeaderProps & import("react").RefAttributes<HTMLDivElement>>;
export {};
