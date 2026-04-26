import clsx from 'clsx';
import isElectron from 'is-electron';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RiCheckboxBlankLine, RiCloseLine, RiSubtractLine } from 'react-icons/ri';

import appIcon from '../../../assets/icons/32x32.png';
import styles from './window-bar.module.css';

import { useRadioPlayer } from '/@/renderer/features/radio/hooks/use-radio-player';
import { useAppStore, usePlayerData, usePlayerStatus, useWindowSettings } from '/@/renderer/store';
import { Text } from '/@/shared/components/text/text';
import { Platform, PlayerStatus } from '/@/shared/types/types';

const localSettings = isElectron() ? window.api.localSettings : null;

const browser = isElectron() ? window.api.browser : null;
const close = () => browser?.exit();
const minimize = () => browser?.minimize();
const maximize = () => browser?.maximize();
const unmaximize = () => browser?.unmaximize();

interface WindowBarControlsProps {
    controls: {
        handleClose: () => void;
        handleMaximize: () => void;
        handleMinimize: () => void;
    };
    title: string;
}

const WindowsControls = ({ controls, title }: WindowBarControlsProps) => {
    const { handleClose, handleMaximize, handleMinimize } = controls;

    return (
        <div className={styles.windowsContainer}>
            <div className={styles.playerStatusContainer}>
                <img alt="" height={16} src={appIcon} style={{ flexShrink: 0 }} width={16} />
                <Text className={styles.playerStatusText} overflow="hidden" size="sm">
                    {title}
                </Text>
            </div>
            <div className={styles.windowsButtonGroup}>
                <div className={styles.windowsButton} onClick={handleMinimize} role="button">
                    <RiSubtractLine size={19} />
                </div>
                <div className={styles.windowsButton} onClick={handleMaximize} role="button">
                    <RiCheckboxBlankLine size={13} />
                </div>
                <div
                    className={clsx(styles.windowsButton, styles.exit)}
                    onClick={handleClose}
                    role="button"
                >
                    <RiCloseLine size={19} />
                </div>
            </div>
        </div>
    );
};

const MacOsControls = ({ controls, title }: WindowBarControlsProps) => {
    const { handleClose, handleMaximize, handleMinimize } = controls;

    return (
        <div className={styles.macosContainer}>
            <div
                    className={styles.macosButtonGroup}
                    onMouseEnter={() => browser?.setIgnoreMouseEvents(false)}
                    onMouseLeave={() => browser?.setIgnoreMouseEvents(true)}
                >
                <div
                    className={clsx(styles.macosButton, styles.closeButton)}
                    id="close-button"
                    onClick={handleClose}
                    role="button"
                >
                    <svg className={styles.macosIcon} viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 2L8 8M8 2L2 8" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                </div>
                <div
                    className={clsx(styles.macosButton, styles.minButton)}
                    id="min-button"
                    onClick={handleMinimize}
                    role="button"
                >
                    <svg className={styles.macosIcon} viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 5H8" stroke="rgba(0,0,0,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                </div>
                <div
                    className={clsx(styles.macosButton, styles.maxButton)}
                    id="max-button"
                    onClick={handleMaximize}
                    role="button"
                >
                    <svg className={styles.macosIcon} viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 2H2V7M3 8H8V3" fill="rgba(0,0,0,0.5)" stroke="none"/>
                    </svg>
                </div>
            </div>
            <div className={styles.playerStatusContainer}>
                <Text className={styles.playerStatusText} overflow="hidden" size="sm">
                    {title}
                </Text>
            </div>
        </div>
    );
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
        } else {
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
                } else if (metadata.title) {
                    radioMetadata = ` — ${metadata.title}`;
                } else if (metadata.artist) {
                    radioMetadata = ` — ${metadata.artist}`;
                }
            }

            return `${radioStatusString}${radioTitle}${radioMetadata} — samo${privateMode ? ` ${privateModeString}` : ''}`;
        }

        const statusString = playerStatus === PlayerStatus.PAUSED ? t('page.windowBar.paused') : '';
        const queueString = queueLength ? `(${index + 1} / ${queueLength}) ` : '';
        const title = `${
            queueLength
                ? `${statusString}${queueString}${currentSong?.name}${currentSong?.artistName ? ` — ${currentSong?.artistName} — samo` : ''}`
                : 'samo'
        }${privateMode ? ` ${privateModeString}` : ''}`;
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

    return (
        <div className={styles.windowBar}>
            {windowBarStyle === Platform.WINDOWS && (
                <WindowsControls
                    controls={{ handleClose, handleMaximize, handleMinimize }}
                    title={title}
                />
            )}
            {windowBarStyle === Platform.MACOS && (
                <div className={styles.macosContainer}>
                    <div className={styles.playerStatusContainer}>
                        <Text className={styles.playerStatusText} overflow="hidden" size="sm">
                            {title}
                        </Text>
                    </div>
                </div>
            )}
        </div>
    );
};
