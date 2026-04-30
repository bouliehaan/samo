import { closeAllModals } from '@mantine/modals';
import { AnimatePresence } from 'motion/react';
import { CSSProperties, memo, ReactNode, useCallback, useRef, useState } from 'react';

import styles from './library-header-bar.module.css';

import { useIsPlayerFetching, usePlayer } from '/@/renderer/features/player/context/player-context';
import { DefaultPlayButton } from '/@/renderer/features/shared/components/play-button';
import { PlayButtonGroupPopover } from '/@/renderer/features/shared/components/play-button-group';
import { type MusicPlaybackContext, useCurrentServerId } from '/@/renderer/store';
import { Badge, BadgeProps } from '/@/shared/components/badge/badge';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { TextTitle } from '/@/shared/components/text-title/text-title';
import { LibraryItem, Song } from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';

interface LibraryHeaderBarProps {
    children: ReactNode;
    ignoreMaxWidth?: boolean;
}

const LibraryHeaderBarComponent = ({ children, ignoreMaxWidth }: LibraryHeaderBarProps) => {
    return (
        <div
            className={styles.headerContainer}
            style={ignoreMaxWidth ? ({ maxWidth: 'none' } as CSSProperties) : undefined}
        >
            {children}
        </div>
    );
};

interface HeaderPlayButtonProps {
    className?: string;
    /**
     * Explicit playback context to attach when starting playback. Only used by the
     * `songs={...}` path — `ids`/`listQuery` paths derive their own context inside
     * `addToQueueByFetch` from a single ALBUM/PLAYLIST id. Pass this when you have the
     * full song array of an album/playlist already in hand (e.g. the collapsed playlist
     * detail header).
     */
    context?: MusicPlaybackContext;
    ids?: string[];
    itemType: LibraryItem;
    listQuery?: Record<string, any>;
    onBeforePlay?: () => void;
    songs?: Song[];
    variant?: 'default' | 'filled';
}

interface TitleProps {
    children: ReactNode;
    order?: number;
}

const HeaderPlayButton = ({
    className,
    context,
    ids,
    itemType,
    listQuery,
    onBeforePlay,
    songs,
    variant = 'filled',
    ...props
}: HeaderPlayButtonProps) => {
    const serverId = useCurrentServerId();
    const player = usePlayer();

    const handlePlay = useCallback(
        (playType: Play) => {
            onBeforePlay?.();
            if (listQuery) {
                player.addToQueueByListQuery(serverId, listQuery, itemType, playType);
            } else if (ids) {
                player.addToQueueByFetch(serverId, ids, itemType, playType);
            } else if (songs) {
                player.addToQueueByData(songs, playType, undefined, context);
            }

            closeAllModals();
        },
        [context, ids, itemType, listQuery, onBeforePlay, player, serverId, songs],
    );

    const isPlayerFetching = useIsPlayerFetching();

    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    return (
        <div className={styles.playButtonContainer}>
            <DefaultPlayButton
                className={className}
                loading={isPlayerFetching}
                onClick={() => setIsOpen((prev) => !prev)}
                ref={buttonRef}
                variant={variant}
                {...props}
            />
            <AnimatePresence>
                {isOpen && (
                    <PlayButtonGroupPopover
                        loading={isPlayerFetching}
                        onClose={() => setIsOpen(false)}
                        onPlay={handlePlay}
                        position="bottom"
                        triggerRef={buttonRef}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const Title = ({ children, order = 1 }: TitleProps) => {
    return (
        <TextTitle fw={700} order={order as any} overflow="hidden">
            {children}
        </TextTitle>
    );
};

interface HeaderBadgeProps extends BadgeProps {
    isLoading?: boolean;
}

const HeaderBadge = ({ children, isLoading, ...props }: HeaderBadgeProps) => {
    return <Badge {...props}>{isLoading ? <Spinner /> : children}</Badge>;
};

export const LibraryHeaderBar = Object.assign(memo(LibraryHeaderBarComponent), {
    Badge: HeaderBadge,
    PlayButton: HeaderPlayButton,
    Title,
});
