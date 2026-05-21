import type { UseSuspenseQueryResult } from '@tanstack/react-query';
import { PlaylistQueryBuilderRef } from '/@/renderer/features/playlists/components/playlist-query-builder';
import { useUpdatePlaylist } from '/@/renderer/features/playlists/mutations/update-playlist-mutation';
export interface PlaylistQueryEditorProps {
    detailQuery: UseSuspenseQueryResult<any, Error>;
    handleSave: (filter: Record<string, any>, extraFilters: {
        limit?: number;
        limitPercent?: number;
        sortBy?: string[];
        sortOrder?: string;
    }) => void;
    handleSaveAs: (filter: Record<string, any>, extraFilters: {
        limit?: number;
        limitPercent?: number;
        sortBy?: string[];
        sortOrder?: string;
    }) => void;
    isQueryBuilderExpanded: boolean;
    onToggleExpand: () => void;
    playlistId: string;
    queryBuilderRef: React.RefObject<null | PlaylistQueryBuilderRef>;
    updatePlaylistMutation: ReturnType<typeof useUpdatePlaylist>;
}
export declare const PlaylistQueryEditor: ({ detailQuery, handleSave, handleSaveAs, isQueryBuilderExpanded, onToggleExpand, playlistId, queryBuilderRef, updatePlaylistMutation, }: PlaylistQueryEditorProps) => import("react/jsx-runtime").JSX.Element;
