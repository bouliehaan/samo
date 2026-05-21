import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import { memo } from 'react';
import styles from './mobile-fullscreen-player.module.css';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Group } from '/@/shared/components/group/group';
import { Separator } from '/@/shared/components/separator/separator';
import { TextTitle } from '/@/shared/components/text-title/text-title';
import { Text } from '/@/shared/components/text/text';
import { PlaybackSelectors } from '/@/shared/constants/playback-selectors';
export const MobileFullscreenPlayerMetadata = memo(({ currentSong, onToggleFavorite, radioArtist, radioStationName, radioTitle, }) => {
    const isRadio = radioTitle !== undefined || radioStationName !== undefined;
    const title = isRadio ? radioTitle || radioStationName || 'Radio' : currentSong?.name;
    const artistsDisplay = isRadio
        ? radioArtist || radioStationName || '—'
        : currentSong?.artists?.map((a) => a.name).join(', ');
    const album = isRadio ? radioStationName || '—' : currentSong?.album;
    const container = currentSong?.container;
    const year = currentSong?.releaseYear;
    const isFavorite = currentSong?.userFavorite;
    const hasMetadata = !isRadio && (container || year);
    return (_jsxs("div", { className: styles.metadataContainer, children: [_jsx("div", { className: styles.titleRow, children: _jsx(TextTitle, { className: PlaybackSelectors.songTitle, fw: 700, order: 2, ta: "center", children: title || '—' }) }), _jsx(Text, { className: clsx(PlaybackSelectors.songArtist), size: "md", truncate: true, children: artistsDisplay || '—' }), _jsx(Text, { className: clsx(PlaybackSelectors.songAlbum), size: "md", truncate: true, children: album || '—' }), hasMetadata && (_jsxs(Group, { align: "center", className: styles.metadataRow, gap: "xs", wrap: "nowrap", children: [container && _jsx(Text, { size: "xs", children: container }), year && (_jsxs(_Fragment, { children: [container && _jsx(Separator, {}), _jsx(Text, { size: "xs", children: year })] }))] })), !isRadio && (_jsx(Group, { align: "center", className: styles.actionsRow, gap: "xs", children: _jsx(ActionIcon, { icon: "favorite", iconProps: {
                        fill: isFavorite ? 'primary' : undefined,
                        size: 'md',
                    }, onClick: onToggleFavorite, size: "sm", variant: "subtle" }) }))] }));
});
MobileFullscreenPlayerMetadata.displayName = 'MobileFullscreenPlayerMetadata';
