import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { formatSizeString } from '/@/renderer/utils/format';
export const SizeColumn = ({ song }) => song.size ? formatSizeString(song.size) : _jsx(_Fragment, { children: "\u00A0" });
