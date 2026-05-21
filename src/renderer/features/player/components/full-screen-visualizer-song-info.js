import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import styles from './full-screen-visualizer.module.css';
import { usePlayerEvents } from '/@/renderer/features/player/audio-player/hooks/use-player-events';
import { usePlayerSong } from '/@/renderer/store/player.store';
import { Stack } from '/@/shared/components/stack/stack';
import { TextTitle } from '/@/shared/components/text-title/text-title';
import { Text } from '/@/shared/components/text/text';
export const FullScreenVisualizerSongInfo = () => {
    const currentSong = usePlayerSong();
    const [showSongInfo, setShowSongInfo] = useState(false);
    const timeoutRef = useRef(undefined);
    usePlayerEvents({
        onCurrentSongChange: () => {
            setShowSongInfo(true);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                setShowSongInfo(false);
            }, 3000);
        },
    }, []);
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);
    const overlayVariants = {
        hidden: {
            opacity: 0,
            transition: {
                duration: 1.5,
                ease: 'easeInOut',
            },
        },
        visible: {
            opacity: 1,
            transition: {
                duration: 0.5,
                ease: 'easeInOut',
            },
        },
    };
    if (!currentSong) {
        return null;
    }
    return (_jsxs(_Fragment, { children: [_jsx(motion.div, { animate: showSongInfo ? 'visible' : 'hidden', className: styles.songInfoBackdrop, initial: "hidden", variants: overlayVariants }), _jsx(motion.div, { animate: showSongInfo ? 'visible' : 'hidden', className: styles.songInfoOverlay, initial: "hidden", variants: overlayVariants, children: _jsxs(Stack, { align: "center", gap: "lg", justify: "center", children: [_jsx(TextTitle, { className: styles.songInfoTitle, fw: "800", isNoSelect: true, order: 1, children: currentSong.name }), currentSong.artistName && (_jsx(Text, { className: styles.songInfoArtist, isNoSelect: true, children: currentSong.artistName }))] }) })] }));
};
