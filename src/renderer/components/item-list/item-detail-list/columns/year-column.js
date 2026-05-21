import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
export const YearColumn = ({ song }) => song.releaseYear ? String(song.releaseYear) : _jsx(_Fragment, { children: "\u00A0" });
