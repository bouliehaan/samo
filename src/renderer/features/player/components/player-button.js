import { jsx as _jsx } from "react/jsx-runtime";
import clsx from 'clsx';
import { t } from 'i18next';
import { forwardRef } from 'react';
import styles from './player-button.module.css';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Tooltip } from '/@/shared/components/tooltip/tooltip';
import { PlaybackSelectors } from '/@/shared/constants/playback-selectors';
export const PlayerButton = forwardRef(({ icon, isActive, tooltip, variant, ...rest }, ref) => {
    if (tooltip) {
        return (_jsx(Tooltip, { ...tooltip, children: _jsx(ActionIcon, { className: clsx({
                    [styles.active]: isActive,
                }), ref: ref, ...rest, onClick: (e) => {
                    e.stopPropagation();
                    rest.onClick?.(e);
                }, variant: "subtle", children: icon }) }));
    }
    return (_jsx(ActionIcon, { className: clsx(styles.playerButton, styles[variant], {
            [styles.active]: isActive,
        }), ref: ref, ...rest, onClick: (e) => {
            e.stopPropagation();
            rest.onClick?.(e);
        }, variant: "subtle", children: icon }));
});
export const MainPlayButton = forwardRef(({ isPaused, onClick, ...props }, ref) => {
    const playerStateClass = isPaused
        ? PlaybackSelectors.playerStatePaused
        : PlaybackSelectors.playerStatePlaying;
    return (_jsx(ActionIcon, { className: clsx(styles.main, playerStateClass), icon: isPaused ? 'mediaPlay' : 'mediaPause', iconProps: {
            size: 'lg',
        }, onClick: (e) => {
            e.stopPropagation();
            onClick?.(e);
        }, ref: ref, tooltip: {
            label: isPaused
                ? t('player.play', { postProcess: 'sentenceCase' })
                : t('player.pause', { postProcess: 'sentenceCase' }),
            openDelay: 0,
        }, ...props }));
});
