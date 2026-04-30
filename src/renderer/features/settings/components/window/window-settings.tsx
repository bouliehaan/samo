import isElectron from 'is-electron';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import {
    SettingOption,
    SettingsSection,
} from '/@/renderer/features/settings/components/settings-section';
import { useSettingsStoreActions, useWindowSettings } from '/@/renderer/store';
import { Switch } from '/@/shared/components/switch/switch';

const localSettings = isElectron() ? window.api.localSettings : null;

export const WindowSettings = memo(() => {
    const { t } = useTranslation();
    const settings = useWindowSettings();
    const { setSettings } = useSettingsStoreActions();

    const windowOptions: SettingOption[] = [
        {
            control: (
                <Switch
                    aria-label="toggle hiding tray"
                    defaultChecked={settings.tray}
                    disabled={!isElectron()}
                    onChange={(e) => {
                        if (!e) return;
                        localSettings?.set('window_enable_tray', e.currentTarget.checked);
                        if (e.currentTarget.checked) {
                            setSettings({
                                window: {
                                    tray: true,
                                },
                            });
                        } else {
                            localSettings?.set('window_start_minimized', false);
                            localSettings?.set('window_exit_to_tray', false);
                            localSettings?.set('window_minimize_to_tray', false);

                            setSettings({
                                window: {
                                    exitToTray: false,
                                    minimizeToTray: false,
                                    startMinimized: false,
                                    tray: false,
                                },
                            });
                        }
                    }}
                />
            ),
            description: t('setting.trayEnabled', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: !isElectron(),
            note: t('common.restartRequired', {
                postProcess: 'sentenceCase',
            }),
            title: t('setting.trayEnabled', { postProcess: 'sentenceCase' }),
        },
        {
            control: (
                <Switch
                    aria-label="Toggle minimize to tray"
                    defaultChecked={settings.tray}
                    disabled={!isElectron()}
                    onChange={(e) => {
                        if (!e) return;
                        localSettings?.set('window_minimize_to_tray', e.currentTarget.checked);
                        setSettings({
                            window: {
                                minimizeToTray: e.currentTarget.checked,
                            },
                        });
                    }}
                />
            ),
            description: t('setting.minimizeToTray', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: !isElectron() || !settings.tray,
            title: t('setting.minimizeToTray', { postProcess: 'sentenceCase' }),
        },
        {
            control: (
                <Switch
                    aria-label="Toggle exit to tray"
                    defaultChecked={settings.exitToTray}
                    disabled={!isElectron()}
                    onChange={(e) => {
                        if (!e) return;
                        localSettings?.set('window_exit_to_tray', e.currentTarget.checked);
                        setSettings({
                            window: {
                                exitToTray: e.currentTarget.checked,
                            },
                        });
                    }}
                />
            ),
            description: t('setting.exitToTray', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: !isElectron() || !settings.tray,
            title: t('setting.exitToTray', { postProcess: 'sentenceCase' }),
        },
        {
            control: (
                <Switch
                    aria-label="Toggle start in tray"
                    defaultChecked={settings.startMinimized}
                    disabled={!isElectron()}
                    onChange={(e) => {
                        if (!e) return;
                        localSettings?.set('window_start_minimized', e.currentTarget.checked);
                        setSettings({
                            window: {
                                startMinimized: e.currentTarget.checked,
                            },
                        });
                    }}
                />
            ),
            description: t('setting.startMinimized', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: !isElectron() || !settings.tray,
            title: t('setting.startMinimized', { postProcess: 'sentenceCase' }),
        },
        {
            control: (
                <Switch
                    aria-label="Toggle prevent sleep on playback"
                    defaultChecked={settings.preventSleepOnPlayback}
                    disabled={!isElectron()}
                    onChange={(e) => {
                        if (!e) return;
                        localSettings?.set(
                            'window_prevent_sleep_on_playback',
                            e.currentTarget.checked,
                        );
                        setSettings({
                            window: {
                                preventSleepOnPlayback: e.currentTarget.checked,
                            },
                        });
                    }}
                />
            ),
            description: t('setting.preventSleepOnPlayback', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: !isElectron(),
            title: t('setting.preventSleepOnPlayback', { postProcess: 'sentenceCase' }),
        },
    ];

    return (
        <SettingsSection
            options={windowOptions}
            title={t('page.setting.application', { postProcess: 'sentenceCase' })}
        />
    );
});
