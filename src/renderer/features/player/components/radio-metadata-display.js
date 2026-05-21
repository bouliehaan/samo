import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import clsx from 'clsx';
import { Link } from 'react-router';
import styles from './left-controls.module.css';
import { useIsRadioActive, useRadioStore } from '/@/renderer/features/radio/hooks/use-radio-player';
import { AppRoute } from '/@/renderer/router/routes';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Text } from '/@/shared/components/text/text';
import { PlaybackSelectors } from '/@/shared/constants/playback-selectors';
export const RadioMetadataDisplay = ({ onStopPropagation, onToggleContextMenu, }) => {
    const radioMetadata = useRadioStore((state) => state.metadata);
    const stationName = useRadioStore((state) => state.stationName);
    const streamUrl = useRadioStore((state) => state.currentStreamUrl);
    const isRadioActive = useIsRadioActive();
    if (!isRadioActive) {
        return null;
    }
    const title = radioMetadata?.title || stationName || 'Radio';
    const artist = radioMetadata?.artist || (radioMetadata?.title ? stationName : null);
    const station = stationName || streamUrl || 'Internet radio';
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: styles.lineItem, onClick: onStopPropagation, children: _jsx(Text, { className: PlaybackSelectors.songTitle, fw: 500, isNoSelect: true, onContextMenu: onToggleContextMenu, overflow: "hidden", children: title }) }), _jsx("div", { className: clsx(styles.lineItem, styles.secondary, PlaybackSelectors.songArtist), onClick: onStopPropagation, children: _jsx(Text, { isMuted: true, isNoSelect: true, overflow: "hidden", size: "md", children: artist || station }) }), _jsx("div", { className: clsx(styles.lineItem, styles.secondary, PlaybackSelectors.songAlbum), onClick: onStopPropagation, children: _jsxs(Group, { align: "center", gap: "xs", wrap: "nowrap", children: [_jsx(Icon, { color: "muted", icon: "radio", size: "sm" }), _jsx(Text, { component: Link, fw: 500, isLink: true, isMuted: true, isNoSelect: true, overflow: "hidden", size: "md", to: AppRoute.RADIO, children: station })] }) })] }));
};
