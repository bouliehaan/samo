import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { JOINED_ARTISTS_MUTED_PROPS, JoinedArtists, } from '/@/renderer/features/albums/components/joined-artists';
export const AlbumArtistColumn = ({ isRowHovered, song }) => {
    const name = song.albumArtistName?.trim() ?? '';
    const hasArtists = name.length > 0 || (song.albumArtists?.length ?? 0) > 0;
    if (!hasArtists)
        return _jsx(_Fragment, { children: "\u00A0" });
    return (_jsx(JoinedArtists, { artistName: song.albumArtistName ?? '', artists: song.albumArtists ?? [], linkProps: JOINED_ARTISTS_MUTED_PROPS.linkProps, readOnly: !isRowHovered, rootTextProps: JOINED_ARTISTS_MUTED_PROPS.rootTextProps }));
};
