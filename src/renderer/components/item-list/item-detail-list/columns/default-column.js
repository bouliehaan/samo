import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
export const DefaultColumn = ({ columnId, song }) => {
    const raw = song[columnId];
    if (raw === undefined || raw === null || typeof raw === 'object')
        return _jsx(_Fragment, { children: "\u00A0" });
    return String(raw);
};
