import { useCallback } from 'react';
import { useSessionStorage } from '/@/shared/hooks/use-session-storage';
const RECENT_PLAYLISTS_KEY = 'recent-playlists';
const DEFAULT_VALUE = {};
export const useRecentPlaylists = (serverId) => {
    const [recentPlaylists, setRecentPlaylists] = useSessionStorage({
        defaultValue: DEFAULT_VALUE,
        key: RECENT_PLAYLISTS_KEY,
    });
    const getRecentPlaylistId = useCallback(() => {
        if (!serverId)
            return null;
        return recentPlaylists[serverId] || null;
    }, [recentPlaylists, serverId]);
    const addRecentPlaylist = useCallback((playlistId) => {
        if (!serverId || !playlistId)
            return;
        setRecentPlaylists({
            ...recentPlaylists,
            [serverId]: playlistId,
        });
    }, [recentPlaylists, serverId, setRecentPlaylists]);
    return {
        addRecentPlaylist,
        recentPlaylistId: getRecentPlaylistId(),
    };
};
