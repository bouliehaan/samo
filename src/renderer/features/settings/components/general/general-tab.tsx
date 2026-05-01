import { memo } from 'react';

import { ApplicationSettings } from '/@/renderer/features/settings/components/general/application-settings';
import { Stack } from '/@/shared/components/stack/stack';

export const GeneralTab = memo(() => {
    return (
        <Stack gap="md">
            <ApplicationSettings />
        </Stack>
    );
});
