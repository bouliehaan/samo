import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import clsx from 'clsx';
import styles from './title-column.module.css';
import { useIsCurrentSong } from '/@/renderer/features/player/hooks/use-is-current-song';
import { ExplicitIndicator } from '/@/shared/components/explicit-indicator/explicit-indicator';
export const TitleArtistColumn = ({ song }) => {
    const { isActive } = useIsCurrentSong(song);
    return (_jsxs("span", { className: clsx({ [styles.active]: isActive }), children: [_jsx(ExplicitIndicator, { explicitStatus: song.explicitStatus }), [song.name, song.artistName].filter(Boolean).join(' — ') ?? _jsx(_Fragment, { children: "\u00A0" })] }));
};
