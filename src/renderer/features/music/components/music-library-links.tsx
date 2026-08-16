import { memo } from 'react';
import { Link } from 'react-router';

import styles from './music-library-links.module.css';

import { AppRoute } from '/@/renderer/router/routes';
import { type AppIconSelection, Icon } from '/@/shared/components/icon/icon';

/**
 * The doors into the library, above the shelves.
 *
 * The shelves below are a sample — the newest, the favourites, a few
 * rediscoveries. These are how you get to all of it, including the two lists
 * (songs and genres) that have no shelf of their own and were otherwise
 * reachable only from the left rail.
 */

const LINKS: Array<{ icon: AppIconSelection; label: string; to: string }> = [
    { icon: 'artist', label: 'Artists', to: AppRoute.LIBRARY_ALBUM_ARTISTS },
    { icon: 'album', label: 'Albums', to: AppRoute.LIBRARY_ALBUMS },
    { icon: 'playlist', label: 'Playlists', to: AppRoute.PLAYLISTS },
    { icon: 'track', label: 'Songs', to: AppRoute.LIBRARY_SONGS },
    { icon: 'genre', label: 'Genres', to: AppRoute.LIBRARY_GENRES },
];

export const MusicLibraryLinks = memo(() => (
    <nav aria-label="Music library" className={styles.links}>
        {LINKS.map((link) => (
            <Link className={styles.link} key={link.to} to={link.to}>
                <span className={styles.icon}>
                    <Icon icon={link.icon} size="lg" />
                </span>
                <span className={styles.label}>{link.label}</span>
            </Link>
        ))}
    </nav>
));

MusicLibraryLinks.displayName = 'MusicLibraryLinks';
