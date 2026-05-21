import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
export const PlayCountColumn = ({ song }) => song.playCount ? String(song.playCount) : _jsx(_Fragment, { children: "\u00A0" });
