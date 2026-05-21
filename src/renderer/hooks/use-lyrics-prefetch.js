import { useEffect, useRef } from 'react';
import { lyricsQueries } from '/@/renderer/features/lyrics/api/lyrics-api';
import { useIsRadioActive } from '/@/renderer/features/radio/hooks/use-radio-player';
import { queryClient } from '/@/renderer/lib/react-query';
import { usePlayerData, usePlayerSong } from '/@/renderer/store';
import { usePlaybackSource } from '/@/renderer/store/playback-owner.store';
export const useLyricsPrefetch = () => {
    const currentSong = usePlayerSong();
    const { nextSong } = usePlayerData();
    const isRadioActive = useIsRadioActive();
    const playbackSource = usePlaybackSource();
    const previousSongKeysRef = useRef({});
    const isLyricsDisabled = isRadioActive || playbackSource === 'audiobook' || playbackSource === 'podcast';
    useEffect(() => {
        const prefetchSong = (song, slot) => {
            const songKey = song?._serverId && song?.id ? `${song._serverId}:${song.id}` : undefined;
            if (songKey === previousSongKeysRef.current[slot])
                return;
            previousSongKeysRef.current[slot] = songKey;
            if (!song?._serverId || !song.id || isLyricsDisabled)
                return;
            queryClient.prefetchQuery(lyricsQueries.songLyrics({
                query: { songId: song.id },
                serverId: song._serverId,
            }, song));
        };
        prefetchSong(currentSong, 'current');
        prefetchSong(nextSong, 'next');
    }, [currentSong, isLyricsDisabled, nextSong]);
};
