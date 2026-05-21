import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { formatDateRelative } from '/@/renderer/utils/format';
export const LastPlayedColumn = ({ song }) => song.lastPlayedAt ? formatDateRelative(song.lastPlayedAt) : _jsx(_Fragment, { children: "\u00A0" });
