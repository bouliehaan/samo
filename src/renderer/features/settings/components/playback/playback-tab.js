import { jsx as _jsx } from "react/jsx-runtime";
import { memo } from 'react';
import { AudioSettings } from '/@/renderer/features/settings/components/playback/audio-settings';
import { Stack } from '/@/shared/components/stack/stack';
export const PlaybackTab = memo(() => {
    return (_jsx(Stack, { gap: "md", children: _jsx(AudioSettings, {}) }));
});
