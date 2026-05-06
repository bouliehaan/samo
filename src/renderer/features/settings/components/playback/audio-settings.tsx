import { t } from 'i18next';
import isElectron from 'is-electron';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
    SettingOption,
    SettingsSection,
} from '/@/renderer/features/settings/components/settings-section';
import { usePlayerStatus } from '/@/renderer/store/player.store';
import { usePlaybackSettings, useSettingsStoreActions } from '/@/renderer/store/settings.store';
import { Select } from '/@/shared/components/select/select';
import { Switch } from '/@/shared/components/switch/switch';
import { toast } from '/@/shared/components/toast/toast';
import { Tooltip } from '/@/shared/components/tooltip/tooltip';
import { PlayerStatus, PlayerType } from '/@/shared/types/types';

const mpvPlayer = isElectron() ? window.api.mpvPlayer : null;

const getAudioDevices = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return (devices || []).filter((dev: MediaDeviceInfo) => dev.kind === 'audiooutput');
};

export type AudioDeviceOption = { label: string; value: string };

export const useAudioDevices = (playbackType = PlayerType.WEB) => {
    const [audioDevices, setAudioDevices] = useState<AudioDeviceOption[]>([]);

    useEffect(() => {
        if (!isElectron()) {
            return;
        }

        if (playbackType === PlayerType.LOCAL) {
            mpvPlayer
                ?.getAudioDevices()
                .then(setAudioDevices)
                .catch(() =>
                    toast.error({
                        message: t('error.audioDeviceFetchError', {
                            postProcess: 'sentenceCase',
                        }),
                    }),
                );
            return;
        }

        getAudioDevices()
            .then((dev) => {
                const uniqueDevices = dev.filter(
                    (d, index, self) => index === self.findIndex((t) => t.deviceId === d.deviceId),
                );
                setAudioDevices(uniqueDevices.map((d) => ({ label: d.label, value: d.deviceId })));
            })
            .catch(() =>
                toast.error({
                    message: t('error.audioDeviceFetchError', {
                        postProcess: 'sentenceCase',
                    }),
                }),
            );
    }, [playbackType]);

    return audioDevices;
};

export const AudioSettings = memo(() => {
    const { t } = useTranslation();
    const settings = usePlaybackSettings();
    const playerStatus = usePlayerStatus();
    const { setSettings } = useSettingsStoreActions();

    const audioDevices = useAudioDevices(settings.type);
    const isPlaying = playerStatus === PlayerStatus.PLAYING;

    const playerTypeSelect = (
        <Select
            data={[
                {
                    label: 'Native (MPV, original quality)',
                    value: PlayerType.LOCAL,
                },
                {
                    label: 'Web compatibility',
                    value: PlayerType.WEB,
                },
            ]}
            defaultValue={settings.type}
            disabled={!isElectron() || isPlaying}
            onChange={(value) => {
                if (!value) {
                    return;
                }

                setSettings({
                    playback: { type: value as PlayerType },
                });
            }}
        />
    );

    const audioOptions: SettingOption[] = [
        {
            control: isPlaying ? (
                <Tooltip
                    label={t('player.pausePlaybackToChangeSetting', {
                        postProcess: 'titleCase',
                    })}
                >
                    <div>{playerTypeSelect}</div>
                </Tooltip>
            ) : (
                playerTypeSelect
            ),
            description: t('setting.audioPlayer', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: !isElectron(),
            title: t('setting.audioPlayer', { postProcess: 'sentenceCase' }),
        },
        {
            control: (
                <Select
                    clearable
                    data={audioDevices}
                    defaultValue={
                        settings.type === PlayerType.LOCAL
                            ? settings.mpvAudioDeviceId
                            : settings.audioDeviceId
                    }
                    disabled={!isElectron() || isPlaying}
                    onChange={(e) =>
                        setSettings({
                            playback:
                                settings.type === PlayerType.LOCAL
                                    ? { mpvAudioDeviceId: e }
                                    : { audioDeviceId: e },
                        })
                    }
                />
            ),
            description: t('setting.audioDevice', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: !isElectron(),
            title: t('setting.audioDevice', { postProcess: 'sentenceCase' }),
        },
        {
            control: (
                <Switch
                    defaultChecked={settings.preservePitch}
                    onChange={(e) => {
                        setSettings({
                            playback: { preservePitch: e.currentTarget.checked },
                        });
                    }}
                />
            ),
            description: t('setting.preservePitch', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            title: t('setting.preservePitch', {
                postProcess: 'sentenceCase',
            }),
        },
        {
            control: (
                <Switch
                    defaultChecked={settings.audioFadeOnStatusChange}
                    onChange={(e) => {
                        setSettings({
                            playback: {
                                audioFadeOnStatusChange: e.currentTarget.checked,
                            },
                        });
                    }}
                />
            ),
            description: t('setting.audioFadeOnStatusChange', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            title: t('setting.audioFadeOnStatusChange', {
                postProcess: 'sentenceCase',
            }),
        },
    ];

    return <SettingsSection options={audioOptions} />;
});
