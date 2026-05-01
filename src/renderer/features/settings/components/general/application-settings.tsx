import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { languages } from '/@/i18n/i18n';
import {
    SettingOption,
    SettingsSection,
} from '/@/renderer/features/settings/components/settings-section';
import { useGeneralSettings, useSettingsStoreActions } from '/@/renderer/store/settings.store';
import { Select } from '/@/shared/components/select/select';

export const ApplicationSettings = memo(() => {
    const { t } = useTranslation();
    const settings = useGeneralSettings();
    const { setSettings } = useSettingsStoreActions();

    const handleChangeLanguage = (e: null | string) => {
        if (!e) return;
        setSettings({
            general: {
                ...settings,
                language: e,
            },
        });
    };

    const options: SettingOption[] = [
        {
            control: (
                <Select
                    data={languages.map((language) => ({
                        label: `${language.label} (${language.value})`,
                        value: language.value,
                    }))}
                    onChange={handleChangeLanguage}
                    value={settings.language}
                />
            ),
            description: t('setting.language', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: false,
            title: t('setting.language', { postProcess: 'sentenceCase' }),
        },
    ];

    return <SettingsSection options={options} />;
});
