import { memo } from 'react';

import { AudioSettings } from '/@/renderer/features/settings/components/playback/audio-settings';
import { Stack } from '/@/shared/components/stack/stack';

export const PlaybackTab = memo(() => {
    return (
        <Stack gap="md">
            <AudioSettings />
        </Stack>
    );
});
