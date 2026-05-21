import isElectron from 'is-electron';
const remote = isElectron() ? window.api.remote : null;
const mediaSession = navigator.mediaSession;
export const updateSong = (song, imageUrl) => {
    if (mediaSession) {
        let metadata;
        if (song?.id) {
            let artwork;
            if (imageUrl) {
                artwork = [{ sizes: '300x300', src: imageUrl, type: 'image/png' }];
            }
            else {
                artwork = [];
            }
            metadata = new MediaMetadata({
                album: song.album ?? '',
                artist: song.artistName,
                artwork,
                title: song.name,
            });
        }
        else {
            metadata = new MediaMetadata();
        }
        mediaSession.metadata = metadata;
    }
    remote?.updateSong(song, imageUrl);
};
