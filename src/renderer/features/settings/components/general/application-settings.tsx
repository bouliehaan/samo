import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { languages } from '/@/i18n/i18n';
import {
    SettingOption,
    SettingsSection,
} from '/@/renderer/features/settings/components/settings-section';
import { useGeneralSettings, useSettingsStoreActions } from '/@/renderer/store/settings.store';
import { Select } from '/@/shared/components/select/select';
import { Switch } from '/@/shared/components/switch/switch';

const localSettings = window.api?.localSettings;

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
        {
            control: (
                <Switch
                    aria-label={t('setting.offlineMode', { postProcess: 'sentenceCase' })}
                    checked={settings.offlineMode}
                    onChange={(e) => {
                        const offlineMode = e.currentTarget.checked;
                        localSettings?.set('offline_mode', offlineMode);
                        setSettings({
                            general: {
                                ...settings,
                                offlineMode,
                            },
                        });
                    }}
                />
            ),
            description: t('setting.offlineMode', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: false,
            title: t('setting.offlineMode', { postProcess: 'sentenceCase' }),
        },
    ];

    return <SettingsSection options={options} />;
});
