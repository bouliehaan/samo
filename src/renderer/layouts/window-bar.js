import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import isElectron from 'is-electron';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RiCheckboxBlankLine, RiCloseLine, RiSubtractLine } from 'react-icons/ri';
import styles from './window-bar.module.css';
import { useRadioPlayer } from '/@/renderer/features/radio/hooks/use-radio-player';
import { useAppStore, usePlayerData, usePlayerStatus, useWindowSettings } from '/@/renderer/store';
import { Platform, PlayerStatus } from '/@/shared/types/types';
const localSettings = isElectron() ? window.api.localSettings : null;
const browser = isElectron() ? window.api.browser : null;
const close = () => browser?.exit();
const minimize = () => browser?.minimize();
const maximize = () => browser?.maximize();
const unmaximize = () => browser?.unmaximize();
const WindowsControls = ({ controls }) => {
    const { handleClose, handleMaximize, handleMinimize } = controls;
    return (_jsx("div", { className: styles.windowsContainer, children: _jsxs("div", { className: styles.windowsButtonGroup, children: [_jsx("div", { className: styles.windowsButton, onClick: handleMinimize, role: "button", children: _jsx(RiSubtractLine, { size: 19 }) }), _jsx("div", { className: styles.windowsButton, onClick: handleMaximize, role: "button", children: _jsx(RiCheckboxBlankLine, { size: 13 }) }), _jsx("div", { className: clsx(styles.windowsButton, styles.exit), onClick: handleClose, role: "button", children: _jsx(RiCloseLine, { size: 19 }) })] }) }));
};
export const WindowBar = () => {
    const { t } = useTranslation();
    const { windowBarStyle } = useWindowSettings();
    const playerStatus = usePlayerStatus();
    const privateMode = useAppStore((state) => state.privateMode);
    const handleMinimize = useCallback(() => minimize(), []);
    const { currentSong, index, queueLength } = usePlayerData();
    const { isPlaying: isRadioPlaying, metadata, stationName } = useRadioPlayer();
    const isRadioActive = Boolean(stationName || metadata);
    const [max, setMax] = useState(localSettings?.env.START_MAXIMIZED || false);
    const handleMaximize = useCallback(() => {
        if (max) {
            unmaximize();
        }
        else {
            maximize();
        }
        setMax(!max);
    }, [max]);
    const handleClose = useCallback(() => close(), []);
    const title = useMemo(() => {
        const privateModeString = privateMode ? t('page.windowBar.privateMode') : '';
        if (isRadioActive) {
            const radioStatusString = !isRadioPlaying ? t('page.windowBar.paused') : '';
            const radioTitle = stationName;
            let radioMetadata = '';
            if (metadata) {
                if (metadata.title && metadata.artist) {
                    radioMetadata = ` — ${metadata.artist} — ${metadata.title}`;
                }
                else if (metadata.title) {
                    radioMetadata = ` — ${metadata.title}`;
                }
                else if (metadata.artist) {
                    radioMetadata = ` — ${metadata.artist}`;
                }
            }
            return `${radioStatusString}${radioTitle}${radioMetadata} — samo${privateMode ? ` ${privateModeString}` : ''}`;
        }
        const statusString = playerStatus === PlayerStatus.PAUSED ? t('page.windowBar.paused') : '';
        const queueString = queueLength ? `(${index + 1} / ${queueLength}) ` : '';
        const title = `${queueLength
            ? `${statusString}${queueString}${currentSong?.name}${currentSong?.artistName ? ` — ${currentSong?.artistName} — samo` : ''}`
            : 'samo'}${privateMode ? ` ${privateModeString}` : ''}`;
        return title;
    }, [
        currentSong?.artistName,
        currentSong?.name,
        index,
        isRadioActive,
        isRadioPlaying,
        metadata,
        playerStatus,
        privateMode,
        queueLength,
        stationName,
        t,
    ]);
    useEffect(() => {
        document.title = title;
    }, [title]);
    if (windowBarStyle === Platform.WEB) {
        return null;
    }
    return (_jsx("div", { className: styles.windowBar, children: windowBarStyle === Platform.WINDOWS && (_jsx(WindowsControls, { controls: { handleClose, handleMaximize, handleMinimize } })) }));
};
