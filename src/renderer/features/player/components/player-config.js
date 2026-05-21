import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAudioDevices } from '/@/renderer/features/settings/components/playback/audio-settings';
import { ListConfigTable } from '/@/renderer/features/shared/components/list-config-menu';
import { usePlaybackType, usePlayerActions, usePlayerProperties, usePlayerSongProperties, usePlayerSpeed, usePlayerStatus, } from '/@/renderer/store';
import { usePlaybackSettings, useSettingsStore, useSettingsStoreActions, } from '/@/renderer/store/settings.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Popover } from '/@/shared/components/popover/popover';
import { SegmentedControl } from '/@/shared/components/segmented-control/segmented-control';
import { Select } from '/@/shared/components/select/select';
import { Slider } from '/@/shared/components/slider/slider';
import { Switch } from '/@/shared/components/switch/switch';
import { Tooltip } from '/@/shared/components/tooltip/tooltip';
import { PlayerStatus, PlayerStyle, PlayerType } from '/@/shared/types/types';
export const PlayerConfig = () => {
    const { t } = useTranslation();
    const preservePitch = useSettingsStore((state) => state.playback.preservePitch);
    const playbackType = usePlaybackType();
    const playbackSettings = usePlaybackSettings();
    const { setSettings } = useSettingsStoreActions();
    const setPreservePitch = useCallback((value) => {
        setSettings({
            playback: { ...playbackSettings, preservePitch: value },
        });
    }, [playbackSettings, setSettings]);
    const options = useMemo(() => {
        const isWebPlayback = playbackType === PlayerType.WEB;
        const allOptions = [
            {
                component: _jsx(AudioDeviceConfig, {}),
                id: 'audioDevice',
                label: t('setting.audioDevice', { postProcess: 'titleCase' }),
            },
            {
                component: null,
                id: 'divider-1',
                isDivider: true,
                label: '',
            },
            ...(isWebPlayback
                ? [
                    {
                        component: _jsx(TransitionTypeConfig, {}),
                        id: 'transitionType',
                        label: t('setting.playbackStyle', {
                            postProcess: 'titleCase',
                        }),
                    },
                    {
                        component: _jsx(CrossfadeDurationConfig, {}),
                        id: 'crossfadeDuration',
                        label: t('setting.crossfadeDuration', {
                            postProcess: 'titleCase',
                        }),
                    },
                    {
                        component: null,
                        id: 'divider-2',
                        isDivider: true,
                        label: '',
                    },
                ]
                : []),
            {
                component: _jsx(PlaybackSpeedSlider, {}),
                id: 'playbackSpeed',
                label: t('player.playbackSpeed', { postProcess: 'titleCase' }),
            },
            {
                component: (_jsx(Switch, { defaultChecked: preservePitch, onChange: (e) => setPreservePitch(e.currentTarget.checked) })),
                id: 'preservePitch',
                label: t('setting.preservePitch', { postProcess: 'titleCase' }),
            },
        ];
        return allOptions;
    }, [t, preservePitch, setPreservePitch, playbackType]);
    return (_jsxs(Popover, { position: "top", width: 500, children: [_jsx(Popover.Target, { children: _jsx(ActionIcon, { icon: "mediaSettings", iconProps: {
                        size: 'lg',
                    }, size: "sm", stopsPropagation: true, tooltip: {
                        label: t('common.setting', { count: 2, postProcess: 'titleCase' }),
                        openDelay: 0,
                    }, variant: "subtle" }) }), _jsx(Popover.Dropdown, { children: _jsx(ListConfigTable, { options: options }) })] }));
};
const AudioDeviceConfig = () => {
    const { t } = useTranslation();
    const status = usePlayerStatus();
    const playbackType = usePlaybackType();
    const playbackSettings = usePlaybackSettings();
    const { setSettings } = useSettingsStoreActions();
    const audioDevices = useAudioDevices(playbackType);
    const audioDeviceId = playbackType === PlayerType.LOCAL
        ? playbackSettings.mpvAudioDeviceId
        : playbackSettings.audioDeviceId;
    const isDisabledDueToPlayback = status === PlayerStatus.PLAYING;
    const select = (_jsx(Select, { clearable: true, comboboxProps: { withinPortal: false }, data: audioDevices, defaultValue: audioDeviceId, disabled: isDisabledDueToPlayback, onChange: (e) => {
            setSettings({
                playback: {
                    ...playbackSettings,
                    ...(playbackType === PlayerType.LOCAL
                        ? { mpvAudioDeviceId: e }
                        : { audioDeviceId: e }),
                },
            });
        }, width: "100%" }));
    if (isDisabledDueToPlayback) {
        return (_jsx(Tooltip, { label: t('player.pausePlaybackToChangeSetting', { postProcess: 'titleCase' }), children: _jsx("div", { children: select }) }));
    }
    return select;
};
const TransitionTypeConfig = () => {
    const { t } = useTranslation();
    const status = usePlayerStatus();
    const playbackSettings = usePlaybackSettings();
    const { transitionType } = usePlayerProperties();
    const { setTransitionType } = usePlayerActions();
    const isDisabledDueToPlayback = status === PlayerStatus.PLAYING;
    const isUnsupportedByEngine = playbackSettings.type !== PlayerType.WEB;
    const isDisabled = isUnsupportedByEngine || isDisabledDueToPlayback;
    const displayedTransitionType = isUnsupportedByEngine ? PlayerStyle.GAPLESS : transitionType;
    const control = (_jsx(SegmentedControl, { data: [
            {
                label: t('setting.playbackStyle', {
                    context: 'optionNormal',
                    postProcess: 'titleCase',
                }),
                value: PlayerStyle.GAPLESS,
            },
            {
                label: t('setting.playbackStyle', {
                    context: 'optionCrossFade',
                    postProcess: 'titleCase',
                }),
                value: PlayerStyle.CROSSFADE,
            },
        ], disabled: isDisabled, onChange: (value) => setTransitionType(value), size: "sm", value: displayedTransitionType, w: "100%" }));
    if (isDisabledDueToPlayback) {
        return (_jsx(Tooltip, { label: t('player.pausePlaybackToChangeSetting', { postProcess: 'titleCase' }), children: _jsx("div", { children: control }) }));
    }
    if (isUnsupportedByEngine) {
        return (_jsx(Tooltip, { label: "Crossfade requires Web compatibility playback. Native MPV playback stays gapless/normal.", children: _jsx("div", { children: control }) }));
    }
    return control;
};
const CrossfadeDurationConfig = () => {
    const { t } = useTranslation();
    const status = usePlayerStatus();
    const playbackSettings = usePlaybackSettings();
    const { crossfadeDuration, transitionType } = usePlayerProperties();
    const { setCrossfadeDuration } = usePlayerActions();
    const isDisabledDueToPlayback = status === PlayerStatus.PLAYING;
    const isUnsupportedByEngine = playbackSettings.type !== PlayerType.WEB;
    const isDisabled = isUnsupportedByEngine ||
        transitionType !== PlayerStyle.CROSSFADE ||
        isDisabledDueToPlayback;
    const slider = (_jsx(Slider, { defaultValue: crossfadeDuration, disabled: isDisabled, marks: [
            { label: '3', value: 3 },
            { label: '6', value: 6 },
            { label: '9', value: 9 },
            { label: '12', value: 12 },
            { label: '15', value: 15 },
        ], max: 15, min: 3, onChangeEnd: setCrossfadeDuration, styles: {
            root: {},
        }, w: "100%" }));
    if (isDisabledDueToPlayback) {
        return (_jsx(Tooltip, { label: t('player.pausePlaybackToChangeSetting', { postProcess: 'titleCase' }), children: _jsx("div", { children: slider }) }));
    }
    if (isUnsupportedByEngine) {
        return (_jsx(Tooltip, { label: "Crossfade duration only applies to Web compatibility playback.", children: _jsx("div", { children: slider }) }));
    }
    return slider;
};
export const PlaybackSpeedSlider = () => {
    const speed = usePlayerSpeed();
    const { setSpeed } = usePlayerActions();
    const { bpm } = usePlayerSongProperties(['bpm']) ?? {};
    const formatPlaybackSpeedSliderLabel = useMemo(() => (value) => {
        const bpmValue = Number(bpm);
        if (bpmValue > 0) {
            return `${value} x / ${(bpmValue * value).toFixed(1)} BPM`;
        }
        return `${value} x`;
    }, [bpm]);
    return (_jsx(Slider, { defaultValue: speed, label: formatPlaybackSpeedSliderLabel, marks: [
            { label: '0.5', value: 0.5 },
            { label: '0.75', value: 0.75 },
            { label: '1', value: 1 },
            { label: '1.25', value: 1.25 },
            { label: '1.5', value: 1.5 },
            { label: '1.75', value: 1.75 },
            { label: '2', value: 2 },
        ], max: 2, min: 0.5, onChangeEnd: setSpeed, onDoubleClick: () => setSpeed(1), step: 0.01, styles: {
            markLabel: {},
            root: {},
        }, w: "100%" }));
};
