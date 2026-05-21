import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { formatPartialIsoDateUTC } from '/@/renderer/utils/format';
import { SEPARATOR_STRING } from '/@/shared/api/utils';
export const ReleaseDateColumn = ({ song }) => {
    const row = song;
    const releaseDate = row.releaseDate;
    if (!releaseDate) {
        return _jsx(_Fragment, { children: "\u00A0" });
    }
    const originalDate = row.originalDate && row.originalDate !== releaseDate ? row.originalDate : null;
    if (originalDate) {
        return `${formatPartialIsoDateUTC(originalDate)}${SEPARATOR_STRING}${formatPartialIsoDateUTC(releaseDate)}`;
    }
    return formatPartialIsoDateUTC(releaseDate);
};
