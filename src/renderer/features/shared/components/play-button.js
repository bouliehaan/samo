import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { t } from 'i18next';
import { forwardRef, memo } from 'react';
import styles from './play-button.module.css';
import { PlayTooltip } from '/@/renderer/features/shared/components/play-button-group';
import { usePlayButtonClick } from '/@/renderer/features/shared/hooks/use-play-button-click';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Button } from '/@/shared/components/button/button';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Play } from '/@/shared/types/types';
export const DefaultPlayButton = forwardRef(({ className, variant = 'filled', ...props }, ref) => {
    return (_jsx(ActionIcon, { className: clsx(styles.textButton, className, {
            [styles.unthemed]: variant !== 'filled',
        }), icon: "mediaPlay", iconProps: {
            size: 'xl',
        }, ref: ref, variant: variant, ...props }));
});
DefaultPlayButton.displayName = 'DefaultPlayButton';
export const PlayTextButton = ({ className, showTooltip = true, variant = 'default', ...props }) => {
    const button = (_jsx(Button, { className: clsx(styles.wideTextButton, className, {
            [styles.unthemed]: variant !== 'filled',
        }), classNames: {
            label: styles.wideTextButtonLabel,
            root: styles.wideTextButton,
        }, variant: "subtle", ...props, children: props.children || (_jsxs(Group, { gap: "sm", wrap: "nowrap", children: [_jsx(Icon, { icon: "mediaPlay", size: "lg" }), t('player.play', { postProcess: 'sentenceCase' })] })) }));
    const hasLongPress = Boolean(props.onLongPress || props.onMouseDown || props.onTouchStart);
    if (hasLongPress && showTooltip) {
        return _jsx(PlayTooltip, { type: Play.NOW, children: button });
    }
    return button;
};
export const PlayNextTextButton = ({ ...props }) => {
    const button = (_jsx(PlayTextButton, { ...props, showTooltip: false, children: _jsxs(Group, { gap: "sm", wrap: "nowrap", children: [_jsx(Icon, { className: styles.noFill, icon: "mediaPlayNext", size: "lg" }), t('player.addNext', { postProcess: 'sentenceCase' })] }) }));
    const hasLongPress = Boolean(props.onLongPress || props.onMouseDown || props.onTouchStart);
    if (hasLongPress) {
        return _jsx(PlayTooltip, { type: Play.NEXT, children: button });
    }
    return button;
};
export const PlayLastTextButton = ({ ...props }) => {
    const button = (_jsx(PlayTextButton, { ...props, showTooltip: false, children: _jsxs(Group, { gap: "sm", wrap: "nowrap", children: [_jsx(Icon, { className: styles.noFill, icon: "mediaPlayLast", size: "lg" }), t('player.addLast', { postProcess: 'sentenceCase' })] }) }));
    const hasLongPress = Boolean(props.onLongPress || props.onMouseDown || props.onTouchStart);
    if (hasLongPress) {
        return _jsx(PlayTooltip, { type: Play.LAST, children: button });
    }
    return button;
};
export const WideShuffleButton = ({ ...props }) => {
    return (_jsx(PlayTextButton, { ...props, children: _jsxs(Group, { gap: "sm", wrap: "nowrap", children: [_jsx(Icon, { fill: "default", icon: "mediaShuffle", size: "lg" }), t('action.shuffle', { postProcess: 'sentenceCase' })] }) }));
};
const PlayButtonBase = forwardRef(({ classNames, fill, icon = 'mediaPlay', isSecondary, loading, onClick, onLongPress, }, ref) => {
    const clickHandlers = usePlayButtonClick({
        loading,
        onClick,
        onLongPress,
    });
    return (_jsx("button", { className: clsx(styles.playButton, classNames, {
            [styles.fill]: fill,
            [styles.secondary]: isSecondary,
        }), ref: ref, ...clickHandlers.handlers, ...clickHandlers.props, children: loading ? _jsx(Spinner, { color: "black" }) : _jsx(Icon, { icon: icon, size: "lg" }) }));
});
export const PlayButton = memo(PlayButtonBase);
PlayButton.displayName = 'PlayButton';
