import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { JOINED_ARTISTS_MUTED_PROPS, JoinedArtists, } from '/@/renderer/features/albums/components/joined-artists';
export const ArtistColumn = ({ isRowHovered, song }) => {
    const name = song.artistName?.trim() ?? '';
    const hasArtists = name.length > 0 || (song.artists?.length ?? 0) > 0;
    if (!hasArtists)
        return _jsx(_Fragment, { children: "\u00A0" });
    return (_jsx(JoinedArtists, { artistName: song.artistName ?? '', artists: song.artists ?? [], linkProps: JOINED_ARTISTS_MUTED_PROPS.linkProps, readOnly: !isRowHovered, rootTextProps: JOINED_ARTISTS_MUTED_PROPS.rootTextProps }));
};
