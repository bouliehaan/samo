import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
export const ComposerColumn = ({ song }) => {
    const composers = song.participants?.composer;
    if (!composers?.length)
        return _jsx(_Fragment, { children: "\u00A0" });
    return composers.map((a) => a.name).join(', ');
};
