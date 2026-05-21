export const TrackNumberColumn = ({ song }) => {
    const disc = song.discNumber ?? 1;
    const track = song.trackNumber.toString().padStart(2, '0');
    return `${disc}-${track}`;
};
