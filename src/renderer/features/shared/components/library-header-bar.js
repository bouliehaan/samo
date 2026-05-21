import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { closeAllModals } from '@mantine/modals';
import { AnimatePresence } from 'motion/react';
import { memo, useCallback, useRef, useState } from 'react';
import styles from './library-header-bar.module.css';
import { useIsPlayerFetching, usePlayer } from '/@/renderer/features/player/context/player-context';
import { DefaultPlayButton } from '/@/renderer/features/shared/components/play-button';
import { PlayButtonGroupPopover } from '/@/renderer/features/shared/components/play-button-group';
import { useCurrentServerId } from '/@/renderer/store';
import { Badge } from '/@/shared/components/badge/badge';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { TextTitle } from '/@/shared/components/text-title/text-title';
import { LibraryItem } from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';
const LibraryHeaderBarComponent = ({ children, ignoreMaxWidth }) => {
    return (_jsx("div", { className: styles.headerContainer, style: ignoreMaxWidth ? { maxWidth: 'none' } : undefined, children: children }));
};
const HeaderPlayButton = ({ allowShuffle, className, context, ids, itemType, listQuery, onBeforePlay, songs, variant = 'filled', ...props }) => {
    const serverId = useCurrentServerId();
    const player = usePlayer();
    const handlePlay = useCallback((playType) => {
        onBeforePlay?.();
        if (listQuery) {
            player.addToQueueByListQuery(serverId, listQuery, itemType, playType);
        }
        else if (ids) {
            player.addToQueueByFetch(serverId, ids, itemType, playType);
        }
        else if (songs) {
            player.addToQueueByData(songs, playType, undefined, context);
        }
        closeAllModals();
    }, [context, ids, itemType, listQuery, onBeforePlay, player, serverId, songs]);
    const isPlayerFetching = useIsPlayerFetching();
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef(null);
    const shouldAllowShuffle = allowShuffle ?? !(itemType === LibraryItem.ALBUM && ids?.length === 1);
    const handleButtonClick = () => {
        if (shouldAllowShuffle) {
            setIsOpen((prev) => !prev);
            return;
        }
        handlePlay(Play.NOW);
    };
    return (_jsxs("div", { className: styles.playButtonContainer, children: [_jsx(DefaultPlayButton, { className: className, loading: isPlayerFetching, onClick: handleButtonClick, ref: buttonRef, variant: variant, ...props }), _jsx(AnimatePresence, { children: isOpen && shouldAllowShuffle && (_jsx(PlayButtonGroupPopover, { allowShuffle: shouldAllowShuffle, loading: isPlayerFetching, onClose: () => setIsOpen(false), onPlay: handlePlay, position: "bottom", triggerRef: buttonRef })) })] }));
};
const Title = ({ children, order = 1 }) => {
    return (_jsx(TextTitle, { fw: 700, order: order, overflow: "hidden", children: children }));
};
const HeaderBadge = ({ children, isLoading, ...props }) => {
    return _jsx(Badge, { ...props, children: isLoading ? _jsx(Spinner, {}) : children });
};
export const LibraryHeaderBar = Object.assign(memo(LibraryHeaderBarComponent), {
    Badge: HeaderBadge,
    PlayButton: HeaderPlayButton,
    Title,
});
