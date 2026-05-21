import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
export const ChannelsColumn = ({ song }) => song.channels != null ? String(song.channels) : _jsx(_Fragment, { children: "\u00A0" });
