import { useMemo } from 'react';
import { usePlayerSong } from '/@/renderer/store';
export const useIsCurrentSong = (song) => {
    const currentSong = usePlayerSong();
    const isActive = useMemo(() => {
        const queueSong = song;
        if (queueSong._uniqueId != null && queueSong._uniqueId !== '') {
            return queueSong._uniqueId === currentSong?._uniqueId;
        }
        return song.id === currentSong?.id;
    }, [song, currentSong?.id, currentSong?._uniqueId]);
    return { isActive };
};
