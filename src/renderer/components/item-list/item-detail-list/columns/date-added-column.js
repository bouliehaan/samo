import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { formatDateAbsolute } from '/@/renderer/utils/format';
export const DateAddedColumn = ({ song }) => song.createdAt ? formatDateAbsolute(song.createdAt) : _jsx(_Fragment, { children: "\u00A0" });
