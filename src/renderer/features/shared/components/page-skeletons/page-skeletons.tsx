import styles from './page-skeletons.module.css';

import { Skeleton } from '/@/shared/components/skeleton/skeleton';

const range = (length: number): number[] => Array.from({ length }, (_, index) => index);

const CardSkeleton = ({ circle = false }: { circle?: boolean }) => (
    <div className={styles.card}>
        <div className={circle ? styles.cardArtCircle : styles.cardArt}>
            <Skeleton borderRadius={circle ? '50%' : '0.5rem'} />
        </div>
        <Skeleton height="0.85rem" width="85%" />
        <Skeleton height="0.7rem" width="55%" />
    </div>
);

/** Grid of media cards — album/artist/playlist/genre library lists. */
export const GridPageSkeleton = ({
    cards = 24,
    circle = false,
}: {
    cards?: number;
    circle?: boolean;
}) => (
    <div className={styles.page}>
        <div className={styles.headerBar}>
            <Skeleton borderRadius="0.4rem" height="1.75rem" width="180px" />
            <div className={styles.headerBarControls}>
                <Skeleton borderRadius="0.5rem" height="2rem" width="2rem" />
                <Skeleton borderRadius="0.5rem" height="2rem" width="6rem" />
            </div>
        </div>
        <div className={styles.grid}>
            {range(cards).map((index) => (
                <CardSkeleton circle={circle} key={index} />
            ))}
        </div>
    </div>
);

const TrackRowSkeleton = () => (
    <div className={styles.trackRow}>
        <div className={styles.trackIndex}>
            <Skeleton height="1rem" width="1rem" />
        </div>
        <div className={styles.trackArt}>
            <Skeleton borderRadius="0.25rem" />
        </div>
        <div className={styles.trackTitle}>
            <Skeleton height="0.95rem" width="45%" />
        </div>
        <div className={styles.trackDuration}>
            <Skeleton height="0.85rem" width="2.5rem" />
        </div>
    </div>
);

/** Cover + meta header above a track list — album/artist/playlist/podcast detail. */
export const DetailPageSkeleton = ({
    circle = false,
    tracks = 10,
}: {
    circle?: boolean;
    tracks?: number;
}) => (
    <div className={styles.page}>
        <div className={styles.detailHeader}>
            <div className={styles.detailCover}>
                <Skeleton borderRadius={circle ? '50%' : '0.75rem'} />
            </div>
            <div className={styles.detailMeta}>
                <Skeleton height="0.85rem" width="80px" />
                <Skeleton height="2.5rem" width="55%" />
                <Skeleton height="1rem" width="40%" />
                <Skeleton height="0.85rem" width="28%" />
                <div className={styles.detailButtons}>
                    <Skeleton borderRadius="2rem" height="2.25rem" width="7.5rem" />
                    <Skeleton borderRadius="50%" height="2.25rem" width="2.25rem" />
                    <Skeleton borderRadius="50%" height="2.25rem" width="2.25rem" />
                </div>
            </div>
        </div>
        <div className={styles.trackList}>
            {range(tracks).map((index) => (
                <TrackRowSkeleton key={index} />
            ))}
        </div>
    </div>
);

/** Just the track rows — for content that renders below an already-shown header. */
export const TrackListSkeleton = ({ tracks = 12 }: { tracks?: number }) => (
    <div className={styles.page}>
        <div className={styles.trackList}>
            {range(tracks).map((index) => (
                <TrackRowSkeleton key={index} />
            ))}
        </div>
    </div>
);

const CarouselRowSkeleton = ({ circle = false }: { circle?: boolean }) => (
    <div className={styles.carouselRow}>
        <Skeleton borderRadius="0.4rem" height="1.4rem" width="200px" />
        <div className={styles.carouselCards}>
            {range(7).map((index) => (
                <div className={styles.carouselCard} key={index}>
                    <CardSkeleton circle={circle} />
                </div>
            ))}
        </div>
    </div>
);

/** Stacked carousels — the home page. */
export const HomePageSkeleton = () => (
    <div className={styles.page}>
        {range(4).map((index) => (
            <CarouselRowSkeleton circle={index === 2} key={index} />
        ))}
    </div>
);
