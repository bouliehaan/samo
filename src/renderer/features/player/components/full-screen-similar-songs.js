import { jsx as _jsx } from "react/jsx-runtime";
import { SimilarSongsList } from '/@/renderer/features/similar-songs/components/similar-songs-list';
import { usePlayerSong } from '/@/renderer/store';
export const FullScreenSimilarSongs = () => {
    const currentSong = usePlayerSong();
    return currentSong?.id ? (_jsx("div", { style: { height: '100%', width: '100%' }, children: _jsx(SimilarSongsList, { fullScreen: true, song: currentSong }) })) : null;
};
