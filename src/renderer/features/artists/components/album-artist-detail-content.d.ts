import { UseSuspenseQueryResult } from '@tanstack/react-query';
import { AlbumArtistDetailResponse, AlbumListResponse } from '/@/shared/types/domain-types';
interface AlbumArtistDetailContentProps {
    albumsQuery: UseSuspenseQueryResult<AlbumListResponse, Error>;
    detailQuery: UseSuspenseQueryResult<AlbumArtistDetailResponse, Error>;
}
export declare const AlbumArtistDetailContent: ({ albumsQuery, detailQuery, }: AlbumArtistDetailContentProps) => import("react/jsx-runtime").JSX.Element;
export {};
