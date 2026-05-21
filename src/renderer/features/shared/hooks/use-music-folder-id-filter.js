import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { useListFilterPersistence } from '/@/renderer/features/shared/hooks/use-list-filter-persistence';
import { FILTER_KEYS } from '/@/renderer/features/shared/utils';
import { useCurrentServer } from '/@/renderer/store';
import { parseStringParam, setSearchParam } from '/@/renderer/utils/query-params';
export const useMusicFolderIdFilter = (defaultValue, listKey) => {
    const server = useCurrentServer();
    const { getFilter, setFilter } = useListFilterPersistence(server.id, listKey);
    const [searchParams, setSearchParams] = useSearchParams();
    const persisted = getFilter(FILTER_KEYS.SHARED.MUSIC_FOLDER_ID);
    const musicFolderId = useMemo(() => {
        const value = parseStringParam(searchParams, FILTER_KEYS.SHARED.MUSIC_FOLDER_ID);
        return value ?? persisted ?? defaultValue ?? undefined;
    }, [searchParams, persisted, defaultValue]);
    const handleSetMusicFolderId = (musicFolderId) => {
        setSearchParams((prev) => {
            const newParams = setSearchParam(prev, FILTER_KEYS.SHARED.MUSIC_FOLDER_ID, musicFolderId);
            return newParams;
        }, { replace: true });
        setFilter(FILTER_KEYS.SHARED.MUSIC_FOLDER_ID, musicFolderId);
    };
    return {
        musicFolderId,
        setMusicFolderId: handleSetMusicFolderId,
    };
};
