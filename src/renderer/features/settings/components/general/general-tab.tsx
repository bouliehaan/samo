import { memo } from 'react';
import { Fragment } from 'react/jsx-runtime';

import { ApplicationSettings } from '/@/renderer/features/settings/components/general/application-settings';
import { ThemeSettings } from '/@/renderer/features/settings/components/general/theme-settings';
import { Divider } from '/@/shared/components/divider/divider';
import { Stack } from '/@/shared/components/stack/stack';

const sections = [
    { component: ThemeSettings, key: 'theme' },
    { component: ApplicationSettings, key: 'application' },
];

export const GeneralTab = memo(() => {
    return (
        <Stack gap="md">
            {sections.map(({ component: Section, key }, index) => (
                <Fragment key={key}>
                    <Section />
                    {index < sections.length - 1 && <Divider />}
                </Fragment>
            ))}
        </Stack>
    );
});
