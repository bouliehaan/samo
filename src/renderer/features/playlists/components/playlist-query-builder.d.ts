import { SongListSort } from '/@/shared/types/domain-types';
import { QueryBuilderGroup } from '/@/shared/types/types';
interface PlaylistQueryBuilderProps {
    limit?: number;
    limitPercent?: number;
    playlistId?: string;
    query: any;
    sortBy: SongListSort | SongListSort[];
    sortOrder: 'asc' | 'desc';
}
export type PlaylistQueryBuilderRef = {
    getFilters: () => {
        extraFilters: {
            limit?: number;
            limitPercent?: number;
            sortBy?: string[];
            sortOrder?: string;
        };
        filters: QueryBuilderGroup;
    };
};
export declare const PlaylistQueryBuilder: import("react").ForwardRefExoticComponent<PlaylistQueryBuilderProps & import("react").RefAttributes<PlaylistQueryBuilderRef>>;
export {};
