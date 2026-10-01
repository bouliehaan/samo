import clsx from 'clsx';
import { ReactNode } from 'react';

import styles from './home-sections.module.css';

import { Text } from '/@/shared/components/text/text';

/**
 * The one tile every home shelf is built from: square art, hover-revealed
 * controls over it, a title and one muted line under it.
 *
 * Playlists, tracks, albums and radio stations all render through this so a
 * shelf of one kind cannot drift from a shelf of another — the tile grammar
 * used to be copied per section, and each copy picked up its own margins,
 * borders and hover, which is how the page ended up with three kinds of card.
 * What differs per kind is passed in: the art, an optional badge on the art,
 * the controls, and what the two lines say.
 */
export const HomeTile = ({
    art,
    badge,
    controls,
    isActive,
    onClick,
    onContextMenu,
    subtitle,
    title,
}: {
    art: ReactNode;
    badge?: ReactNode;
    controls?: ReactNode;
    /** Something is playing from this tile — keeps its art lit without hover. */
    isActive?: boolean;
    onClick: () => void;
    onContextMenu: (event: React.MouseEvent) => void;
    subtitle?: null | string;
    title: string;
}) => (
    <div
        className={clsx(styles.mediaCard, isActive && styles.mediaCardActive)}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
            }
        }}
        role="button"
        tabIndex={0}
    >
        <div className={styles.mediaArt}>
            {art}
            {badge ? <span className={styles.badge}>{badge}</span> : null}
            {controls ? <span className={styles.playlistControls}>{controls}</span> : null}
        </div>
        <Text className={styles.title} fw={650} size="sm">
            {title}
        </Text>
        {subtitle ? (
            <Text className={styles.subtitle} isMuted size="sm">
                {subtitle}
            </Text>
        ) : null}
    </div>
);
