import formatDuration from 'format-duration';
export const DurationColumn = ({ song }) => formatDuration(song.duration);
