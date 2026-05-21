import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePlayerEvents } from '/@/renderer/features/player/audio-player/hooks/use-player-events';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { usePlayerStatus, usePlayerStoreBase } from '/@/renderer/store/player.store';
import { useSleepTimerActions, useSleepTimerActive, useSleepTimerMode, useSleepTimerRemaining, useSleepTimerStore, } from '/@/renderer/store/sleep-timer.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Button } from '/@/shared/components/button/button';
import { Divider } from '/@/shared/components/divider/divider';
import { Flex } from '/@/shared/components/flex/flex';
import { Grid } from '/@/shared/components/grid/grid';
import { Group } from '/@/shared/components/group/group';
import { NumberInput } from '/@/shared/components/number-input/number-input';
import { Popover } from '/@/shared/components/popover/popover';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { PlayerStatus } from '/@/shared/types/types';
const PRESET_OPTIONS = [
    { minutes: 0, mode: 'endOfSong' },
    { minutes: 5, mode: 'timed' },
    { minutes: 10, mode: 'timed' },
    { minutes: 15, mode: 'timed' },
    { minutes: 30, mode: 'timed' },
    { minutes: 45, mode: 'timed' },
    { minutes: 60, mode: 'timed' },
    { minutes: 120, mode: 'timed' },
    { minutes: 180, mode: 'timed' },
    { minutes: 240, mode: 'timed' },
];
function formatRemaining(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = Math.floor(totalSeconds % 60);
    if (h > 0) {
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
}
const useSleepTimer = () => {
    const active = useSleepTimerActive();
    const mode = useSleepTimerMode();
    const { cancelTimer, setRemaining } = useSleepTimerActions();
    const { mediaPause } = usePlayer();
    const mediaPauseRef = useRef(mediaPause);
    mediaPauseRef.current = mediaPause;
    const handleOnCurrentSongChange = useCallback(() => {
        if (!active) {
            return;
        }
        // Cancel and pause on song change in end-of-song mode
        if (mode === 'endOfSong') {
            cancelTimer();
            mediaPauseRef.current();
        }
    }, [active, mode, cancelTimer, mediaPauseRef]);
    const status = usePlayerStatus();
    const handleOnPlayerProgress = useCallback(() => {
        if (!active) {
            return;
        }
        if (status !== PlayerStatus.PLAYING) {
            return;
        }
        // Count down in timed mode
        if (mode === 'timed') {
            const remaining = useSleepTimerStore.getState().remaining;
            if (remaining <= 0) {
                cancelTimer();
                mediaPauseRef.current();
            }
            else {
                setRemaining(Math.max(0, remaining - 1));
            }
        }
    }, [active, cancelTimer, mode, setRemaining, status]);
    usePlayerEvents({
        onCurrentSongChange: handleOnCurrentSongChange,
        onPlayerProgress: handleOnPlayerProgress,
    }, [handleOnCurrentSongChange, handleOnPlayerProgress]);
    // End-of-song mode: set the pauseOnNextSongEnd flag so that
    // mediaAutoNext returns PAUSED status when the current song ends.
    // This is a generic player mechanism — the web player handles it
    // without needing to know about the sleep timer.
    useEffect(() => {
        if (!active || mode !== 'endOfSong')
            return;
        usePlayerStoreBase.getState().setPauseOnNextSongEnd(true);
        return () => {
            usePlayerStoreBase.getState().setPauseOnNextSongEnd(false);
        };
    }, [active, mode]);
};
export const SleepTimerHookInner = () => {
    useSleepTimer();
    return null;
};
export const SleepTimerHook = () => {
    const active = useSleepTimerActive();
    if (!active) {
        return null;
    }
    return React.createElement(SleepTimerHookInner);
};
export const SleepTimerButton = () => {
    const { t } = useTranslation();
    const active = useSleepTimerActive();
    const mode = useSleepTimerMode();
    const remaining = useSleepTimerRemaining();
    const { cancelTimer, startEndOfSongTimer, startTimedTimer } = useSleepTimerActions();
    const { mediaPause } = usePlayer();
    const [showCustom, setShowCustom] = useState(false);
    const [customHours, setCustomHours] = useState(0);
    const [customMinutes, setCustomMinutes] = useState(20);
    const [customSeconds, setCustomSeconds] = useState(0);
    const [opened, setOpened] = useState(false);
    const mediaPauseRef = useRef(mediaPause);
    mediaPauseRef.current = mediaPause;
    const handlePreset = useCallback((option) => {
        if (option.mode === 'endOfSong') {
            startEndOfSongTimer();
        }
        else {
            startTimedTimer(option.minutes * 60);
        }
        setShowCustom(false);
        setOpened(false);
    }, [startEndOfSongTimer, startTimedTimer]);
    const handleCustomStart = useCallback(() => {
        const totalSeconds = customHours * 3600 + customMinutes * 60 + customSeconds;
        if (totalSeconds > 0) {
            startTimedTimer(totalSeconds);
            setShowCustom(false);
            setOpened(false);
        }
    }, [customHours, customMinutes, customSeconds, startTimedTimer]);
    const handleCancel = useCallback(() => {
        cancelTimer();
        setShowCustom(false);
    }, [cancelTimer]);
    const getPresetLabel = (option) => {
        if (option.mode === 'endOfSong') {
            return t('player.sleepTimer_endOfSong', { postProcess: 'sentenceCase' });
        }
        if (option.minutes >= 60) {
            return t('player.sleepTimer_hours', {
                count: option.minutes / 60,
                postProcess: 'sentenceCase',
            });
        }
        return t('player.sleepTimer_minutes', {
            count: option.minutes,
            postProcess: 'sentenceCase',
        });
    };
    return (_jsxs(Popover, { onChange: setOpened, opened: opened, position: "top", width: 260, children: [_jsx(Popover.Target, { children: _jsx(ActionIcon, { icon: active ? 'sleepTimer' : 'sleepTimerOff', iconProps: {
                        color: active ? 'primary' : undefined,
                        size: 'lg',
                    }, onClick: (e) => {
                        e.stopPropagation();
                        setOpened((prev) => !prev);
                    }, size: "sm", tooltip: {
                        label: t('player.sleepTimer', { postProcess: 'titleCase' }),
                        openDelay: 0,
                    }, variant: "subtle" }) }), _jsx(Popover.Dropdown, { children: _jsxs(Stack, { gap: "xs", p: "xs", children: [_jsx(Text, { fw: "600", pb: "md", size: "sm", ta: "center", children: t('player.sleepTimer', { postProcess: 'titleCase' }) }), active && (_jsxs(Flex, { align: "center", direction: "column", gap: 4, mb: "xs", style: {
                                background: 'var(--theme-colors-surface)',
                                borderRadius: 'var(--theme-radius-md)',
                                padding: 'var(--theme-spacing-sm) var(--theme-spacing-md)',
                            }, children: [mode === 'endOfSong' ? (_jsx(Text, { c: "primary", size: "sm", children: t('player.sleepTimer_endOfSong', {
                                        postProcess: 'sentenceCase',
                                    }) })) : (_jsx(Text, { c: "primary", fw: "600", size: "lg", children: formatRemaining(remaining) })), _jsx(Button, { onClick: (e) => {
                                        e.stopPropagation();
                                        handleCancel();
                                    }, size: "compact-xs", variant: "subtle", children: t('player.sleepTimer_cancel', { postProcess: 'titleCase' }) })] })), PRESET_OPTIONS.filter((option) => option.mode === 'endOfSong').map((option, index) => (_jsx(Button, { fullWidth: true, justify: "flex-start", onClick: (e) => {
                                e.stopPropagation();
                                handlePreset(option);
                            }, size: "xs", variant: "outline", children: getPresetLabel(option) }, index))), _jsx(Divider, { my: "md" }), _jsx(Grid, { gutter: "xs", children: PRESET_OPTIONS.filter((option) => option.mode === 'timed').map((option, index) => (_jsx(Grid.Col, { span: 4, children: _jsx(Button, { fullWidth: true, justify: "flex-start", onClick: (e) => {
                                        e.stopPropagation();
                                        handlePreset(option);
                                    }, size: "xs", variant: "outline", children: getPresetLabel(option) }, index) }, index))) }), _jsx(Divider, { my: "md" }), !showCustom ? (_jsx(Button, { fullWidth: true, justify: "flex-start", onClick: (e) => {
                                e.stopPropagation();
                                setShowCustom(true);
                            }, size: "xs", ta: "center", variant: "outline", children: t('player.sleepTimer_custom', { postProcess: 'sentenceCase' }) })) : (_jsxs(Stack, { gap: "xs", children: [_jsxs(Group, { gap: 4, wrap: "nowrap", children: [_jsx(NumberInput, { max: 23, min: 0, onChange: (val) => setCustomHours(Number(val) || 0), placeholder: "hr", size: "xs", value: customHours }), _jsx(Text, { children: ":" }), _jsx(NumberInput, { max: 59, min: 0, onChange: (val) => setCustomMinutes(Number(val) || 0), placeholder: "min", size: "xs", value: customMinutes }), _jsx(Text, { children: ":" }), _jsx(NumberInput, { max: 59, min: 0, onChange: (val) => setCustomSeconds(Number(val) || 0), placeholder: "sec", size: "xs", value: customSeconds })] }), _jsxs(Group, { gap: "xs", grow: true, children: [_jsx(Button, { onClick: (e) => {
                                                e.stopPropagation();
                                                handleCustomStart();
                                            }, size: "xs", variant: "filled", children: t('player.sleepTimer_setCustom', { postProcess: 'titleCase' }) }), _jsx(Button, { onClick: (e) => {
                                                e.stopPropagation();
                                                setShowCustom(false);
                                            }, size: "xs", variant: "default", children: t('common.cancel', { postProcess: 'titleCase' }) })] })] }))] }) })] }));
};
