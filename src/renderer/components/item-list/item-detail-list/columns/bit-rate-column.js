import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
export const BitRateColumn = ({ song }) => song.bitRate != null ? `${song.bitRate} kbps` : _jsx(_Fragment, { children: "\u00A0" });
