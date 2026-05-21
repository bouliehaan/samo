import { jsx as _jsx } from "react/jsx-runtime";
import { LyricsSettingsForm } from './lyrics-settings-form';
export const LyricsSettingsContextModal = ({ innerProps, }) => {
    return _jsx(LyricsSettingsForm, { settingsKey: innerProps.settingsKey });
};
