import { jsx as _jsx } from "react/jsx-runtime";
import isElectron from 'is-electron';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsSection, } from '/@/renderer/features/settings/components/settings-section';
import { useSettingsStoreActions, useWindowSettings } from '/@/renderer/store';
import { Switch } from '/@/shared/components/switch/switch';
const localSettings = isElectron() ? window.api.localSettings : null;
const utils = isElectron() ? window.api.utils : null;
function disableAutoUpdates() {
    return Boolean(!isElectron() || utils?.disableAutoUpdates());
}
export const UpdateSettings = memo(() => {
    const { t } = useTranslation();
    const settings = useWindowSettings();
    const { setSettings } = useSettingsStoreActions();
    const updateOptions = [
        {
            control: (_jsx(Switch, { "aria-label": t('setting.automaticUpdates', { postProcess: 'sentenceCase' }), defaultChecked: !settings.disableAutoUpdate, disabled: disableAutoUpdates(), onChange: (e) => {
                    if (!e)
                        return;
                    const enabled = e.currentTarget.checked;
                    localSettings?.set('disable_auto_updates', !enabled);
                    setSettings({
                        window: {
                            disableAutoUpdate: !enabled,
                        },
                    });
                } })),
            description: t('setting.automaticUpdates', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: disableAutoUpdates(),
            title: t('setting.automaticUpdates', { postProcess: 'sentenceCase' }),
        },
    ];
    return (_jsx(SettingsSection, { options: updateOptions, title: t('page.setting.updates', { postProcess: 'sentenceCase' }) }));
});
