import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
export const SampleRateColumn = ({ song }) => song.sampleRate ? `${song.sampleRate} Hz` : _jsx(_Fragment, { children: "\u00A0" });
