import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { ListConfigTable } from '/@/renderer/features/shared/components/list-config-menu';
import {
    usePlayerActions,
    usePlayerProperties,
    usePlayerSongProperties,
    usePlayerSpeed,
    usePlayerStatus,
} from '/@/renderer/store';
import {
    usePlaybackSettings,
    useSettingsStore,
    useSettingsStoreActions,
} from '/@/renderer/store/settings.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Popover } from '/@/shared/components/popover/popover';
import { SegmentedControl } from '/@/shared/components/segmented-control/segmented-control';
import { Slider } from '/@/shared/components/slider/slider';
import { Switch } from '/@/shared/components/switch/switch';
import { Tooltip } from '/@/shared/components/tooltip/tooltip';
import { PlayerStatus, PlayerStyle, PlayerType } from '/@/shared/types/types';

export const PlayerConfig = () => {
    const { t } = useTranslation();
    const preservePitch = useSettingsStore((state) => state.playback.preservePitch);
    const playbackSettings = usePlaybackSettings();
    const playbackType = playbackSettings.type;
    const { setSettings } = useSettingsStoreActions();

    const setPreservePitch = useCallback(
        (value: boolean) => {
            setSettings({
                playback: { ...playbackSettings, preservePitch: value },
            });
        },
        [playbackSettings, setSettings],
    );

    const options = useMemo(() => {
        const isWebPlayback = playbackType === PlayerType.WEB;

        const allOptions = [
            ...(isWebPlayback
                ? [
                      {
                          component: <TransitionTypeConfig />,
                          id: 'transitionType',
                          label: t('setting.playbackStyle', {
                              postProcess: 'titleCase',
                          }),
                      },
                      {
                          component: <CrossfadeDurationConfig />,
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
                component: <PlaybackSpeedSlider />,
                id: 'playbackSpeed',
                label: t('player.playbackSpeed', { postProcess: 'titleCase' }),
            },
            {
                component: (
                    <Switch
                        defaultChecked={preservePitch}
                        onChange={(e) => setPreservePitch(e.currentTarget.checked)}
                    />
                ),
                id: 'preservePitch',
                label: t('setting.preservePitch', { postProcess: 'titleCase' }),
            },
        ];

        return allOptions;
    }, [t, preservePitch, setPreservePitch, playbackType]);

    return (
        <Popover position="top" width={500}>
            <Popover.Target>
                <ActionIcon
                    icon="mediaSettings"
                    iconProps={{
                        size: 'lg',
                    }}
                    size="sm"
                    stopsPropagation
                    tooltip={{
                        label: t('common.setting', { count: 2, postProcess: 'titleCase' }),
                        openDelay: 0,
                    }}
                    variant="subtle"
                />
            </Popover.Target>
            <Popover.Dropdown>
                <ListConfigTable options={options} />
            </Popover.Dropdown>
        </Popover>
    );
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

    const control = (
        <SegmentedControl
            data={[
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
            ]}
            disabled={isDisabled}
            onChange={(value) => setTransitionType(value as PlayerStyle)}
            size="sm"
            value={displayedTransitionType}
            w="100%"
        />
    );

    if (isDisabledDueToPlayback) {
        return (
            <Tooltip label={t('player.pausePlaybackToChangeSetting', { postProcess: 'titleCase' })}>
                <div>{control}</div>
            </Tooltip>
        );
    }

    if (isUnsupportedByEngine) {
        return (
            <Tooltip label="Crossfade requires Web compatibility playback. Native MPV playback stays gapless/normal.">
                <div>{control}</div>
            </Tooltip>
        );
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
    const isDisabled =
        isUnsupportedByEngine ||
        transitionType !== PlayerStyle.CROSSFADE ||
        isDisabledDueToPlayback;

    const slider = (
        <Slider
            defaultValue={crossfadeDuration}
            disabled={isDisabled}
            marks={[
                { label: '3', value: 3 },
                { label: '6', value: 6 },
                { label: '9', value: 9 },
                { label: '12', value: 12 },
                { label: '15', value: 15 },
            ]}
            max={15}
            min={3}
            onChangeEnd={setCrossfadeDuration}
            styles={{
                root: {},
            }}
            w="100%"
        />
    );

    if (isDisabledDueToPlayback) {
        return (
            <Tooltip label={t('player.pausePlaybackToChangeSetting', { postProcess: 'titleCase' })}>
                <div>{slider}</div>
            </Tooltip>
        );
    }

    if (isUnsupportedByEngine) {
        return (
            <Tooltip label="Crossfade duration only applies to Web compatibility playback.">
                <div>{slider}</div>
            </Tooltip>
        );
    }

    return slider;
};

export const PlaybackSpeedSlider = () => {
    const speed = usePlayerSpeed();
    const { setSpeed } = usePlayerActions();
    const { bpm } = usePlayerSongProperties(['bpm']) ?? {};

    const formatPlaybackSpeedSliderLabel = useMemo(
        () => (value: number) => {
            const bpmValue = Number(bpm);
            if (bpmValue > 0) {
                return `${value} x / ${(bpmValue * value).toFixed(1)} BPM`;
            }
            return `${value} x`;
        },
        [bpm],
    );

    return (
        <Slider
            defaultValue={speed}
            label={formatPlaybackSpeedSliderLabel}
            marks={[
                { label: '0.5', value: 0.5 },
                { label: '0.75', value: 0.75 },
                { label: '1', value: 1 },
                { label: '1.25', value: 1.25 },
                { label: '1.5', value: 1.5 },
                { label: '1.75', value: 1.75 },
                { label: '2', value: 2 },
            ]}
            max={2}
            min={0.5}
            onChangeEnd={setSpeed}
            onDoubleClick={() => setSpeed(1)}
            step={0.01}
            styles={{
                markLabel: {},
                root: {},
            }}
            w="100%"
        />
    );
};
