import {
    formatBitRate,
    formatSampleRate,
    isPremiumQualityContainer,
} from '@samo/core/audio-quality';
import clsx from 'clsx';
import { t } from 'i18next';
import isElectron from 'is-electron';
import { AnimatePresence, HTMLMotionProps, motion, Variants } from 'motion/react';
import { Fragment, useEffect, useRef } from 'react';
import { generatePath, Link } from 'react-router';

import styles from './full-screen-player-image.module.css';

import { useItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { QualityBadge } from '/@/renderer/components/quality-badge/quality-badge';
import { AudioPathBadge } from '/@/renderer/features/player/components/audio-path-badge';
import { LongFormPlayerArtwork } from '/@/renderer/features/player/components/long-form-player-artwork';
import {
    useIsRadioActive,
    useRadioPlayer,
} from '/@/renderer/features/radio/hooks/use-radio-player';
import { useNowPlaying } from '/@/renderer/hooks/use-now-playing';
import { AppRoute } from '/@/renderer/router/routes';
import {
    useGeneralSettings,
    useNativeAspectRatio,
    usePlaybackSettings,
    usePlaybackType,
    usePlayerData,
    usePlayerSong,
} from '/@/renderer/store';
import { useAudiobookItem, useAudiobookServer } from '/@/renderer/store/audiobook.store';
import { usePlaybackSource } from '/@/renderer/store/playback-owner.store';
import { usePodcastItem, usePodcastServer } from '/@/renderer/store/podcast.store';
import { getQueueSongQualityProfile } from '/@/renderer/utils/quality-profile';
import { Badge } from '/@/shared/components/badge/badge';
import { Center } from '/@/shared/components/center/center';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { useSetState } from '/@/shared/hooks/use-set-state';
import { ExplicitStatus, LibraryItem } from '/@/shared/types/domain-types';
import { PlayerType } from '/@/shared/types/types';

const imageVariants: Variants = {
    closed: {
        opacity: 0,
        transition: {
            duration: 0.8,
            ease: 'linear',
        },
    },
    initial: {
        opacity: 0,
    },
    open: (custom) => {
        const { isOpen } = custom;
        return {
            opacity: isOpen ? 1 : 0,
            transition: {
                duration: 0.4,
                ease: 'linear',
            },
        };
    },
};

const MotionImage = motion.img;

const unknownBadge = (label: string) => (
    <Badge color="gray" variant="light">
        {label}
    </Badge>
);

const ImageWithPlaceholder = ({
    className,
    explicit,
    placeholderIcon = 'itemAlbum',
    ...props
}: HTMLMotionProps<'img'> & {
    explicit?: boolean;
    placeholder?: string;
    placeholderIcon?: 'itemAlbum' | 'radio';
}) => {
    const nativeAspectRatio = useNativeAspectRatio();

    if (!props.src) {
        return (
            <Center
                style={{
                    background: 'var(--theme-colors-surface)',
                    borderRadius: 'var(--theme-card-default-radius)',
                    height: '100%',
                    width: '100%',
                }}
            >
                <Icon color="muted" icon={placeholderIcon} size="25%" />
            </Center>
        );
    }

    return (
        <MotionImage
            className={clsx(styles.image, className, {
                [styles.censored]: explicit,
            })}
            style={{
                objectFit: nativeAspectRatio ? 'contain' : 'cover',
                width: nativeAspectRatio ? 'auto' : '100%',
            }}
            {...props}
        />
    );
};

export const FullScreenPlayerImage = () => {
    const mainImageRef = useRef<HTMLImageElement | null>(null);

    const isRadioActive = useIsRadioActive();
    const { isPlaying: isRadioPlaying, metadata: radioMetadata, stationName } = useRadioPlayer();

    const currentSong = usePlayerSong();
    const { nextSong } = usePlayerData();
    const { blurExplicitImages, playerItems } = useGeneralSettings();
    const { transcode } = usePlaybackSettings();
    const playbackType = usePlaybackType();
    const playbackSource = usePlaybackSource();
    const nowPlaying = useNowPlaying();
    const audiobookItem = useAudiobookItem();
    const audiobookServer = useAudiobookServer();
    const podcastItem = usePodcastItem();
    const podcastServer = usePodcastServer();

    const isRadioMode = playbackSource === 'radio' || (isRadioActive && isRadioPlaying);
    const isAudiobookMode = playbackSource === 'audiobook';
    const isPodcastMode = playbackSource === 'podcast';
    const isLongFormMode = isAudiobookMode || isPodcastMode;
    const isNonMusicMode = isLongFormMode || isRadioMode;
    // Quality badge only makes sense for music playback. Radio (no decode) and
    // audiobook (HLS/per-book) do not have meaningful track-quality fields.
    const showAudioPathBadge = playbackSource === 'music' || playbackSource == null;
    const isNativeDirect = isElectron() && playbackType === PlayerType.LOCAL;
    const isTranscoded = showAudioPathBadge && !isNativeDirect && transcode.enabled;
    const effectiveContainer = isTranscoded ? transcode.format : currentSong?.container;
    const effectiveBitRate = isTranscoded ? transcode.bitrate : currentSong?.bitRate;
    const isPremiumQualityDirect = !isTranscoded && isPremiumQualityContainer(effectiveContainer);
    const formatProfile = getQueueSongQualityProfile(currentSong, {
        playbackType,
        transcodeEnabled: transcode.enabled,
    });

    const currentImageUrl = useItemImageUrl({
        id: currentSong?.imageId || undefined,
        itemType: LibraryItem.SONG,
        serverId: currentSong?._serverId,
        type: 'fullScreenPlayer',
    });

    const nextImageUrl = useItemImageUrl({
        id: nextSong?.imageId || undefined,
        itemType: LibraryItem.SONG,
        serverId: nextSong?._serverId,
        type: 'fullScreenPlayer',
    });

    const [imageState, setImageState] = useSetState({
        bottomExplicit: nextSong?.explicitStatus === ExplicitStatus.EXPLICIT,
        bottomImage: nextImageUrl,
        current: 0,
        topExplicit: currentSong?.explicitStatus === ExplicitStatus.EXPLICIT,
        topImage: currentImageUrl,
    });

    // Track previous song to detect changes
    const previousSongRef = useRef<string | undefined>(currentSong?._uniqueId);
    const imageStateRef = useRef(imageState);

    // Keep ref in sync
    useEffect(() => {
        imageStateRef.current = imageState;
    }, [imageState]);

    // Update images when song or size changes. Non-music modes use nowPlaying artwork directly.
    useEffect(() => {
        if (isNonMusicMode) {
            return;
        }
        if (currentSong?._uniqueId === previousSongRef.current) {
            return;
        }

        const isTop = imageStateRef.current.current === 0;

        setImageState({
            bottomExplicit:
                (isTop ? currentSong?.explicitStatus : nextSong?.explicitStatus) ===
                ExplicitStatus.EXPLICIT,
            bottomImage: isTop ? currentImageUrl : nextImageUrl,
            current: isTop ? 1 : 0,
            topExplicit:
                (isTop ? nextSong?.explicitStatus : currentSong?.explicitStatus) ===
                ExplicitStatus.EXPLICIT,
            topImage: isTop ? nextImageUrl : currentImageUrl,
        });

        previousSongRef.current = currentSong?._uniqueId;
    }, [
        isLongFormMode,
        isNonMusicMode,
        currentSong?._uniqueId,
        currentImageUrl,
        nextSong?._uniqueId,
        nextImageUrl,
        setImageState,
        currentSong?.explicitStatus,
        nextSong?.explicitStatus,
    ]);

    const builtDataItems = {
        bit_depth: isTranscoded ? (
            unknownBadge('Unknown bit depth')
        ) : currentSong?.bitDepth ? (
            <Badge>{currentSong.bitDepth} bit</Badge>
        ) : isPremiumQualityDirect ? (
            unknownBadge('Unknown bit depth')
        ) : null,
        bit_rate: formatBitRate(effectiveBitRate) ? (
            <Badge>{formatBitRate(effectiveBitRate)}</Badge>
        ) : isTranscoded ? (
            unknownBadge('Unknown bitrate')
        ) : null,
        bpm: currentSong?.bpm && (
            <Badge>
                {currentSong?.bpm} {t('common.bpm')}
            </Badge>
        ),
        codec: effectiveContainer ? (
            <Badge>{effectiveContainer.toUpperCase()}</Badge>
        ) : (
            unknownBadge('Unknown format')
        ),
        disc_number: currentSong?.discNumber && (
            <Badge>
                {t('common.disc')} {currentSong?.discNumber}
            </Badge>
        ),
        genres:
            currentSong?.genres &&
            currentSong?.genres
                .slice(0, 2)
                .map((genre) => <Badge key={genre.id}>{genre.name}</Badge>),
        release_date: currentSong?.releaseDate && <Badge>{currentSong?.releaseDate}</Badge>,
        release_type: currentSong?.tags?.releasetype && (
            <Badge>{currentSong?.tags?.releasetype[0]}</Badge>
        ),
        release_year: currentSong?.releaseYear && <Badge>{currentSong?.releaseYear}</Badge>,
        sample_rate: isTranscoded ? (
            unknownBadge('Unknown sample rate')
        ) : formatSampleRate(currentSong?.sampleRate) ? (
            <Badge>{formatSampleRate(currentSong?.sampleRate)}</Badge>
        ) : isPremiumQualityDirect ? (
            unknownBadge('Unknown sample rate')
        ) : null,
        track_number: currentSong?.trackNumber && (
            <Badge>
                {t('common.trackNumber')} {currentSong?.trackNumber}
            </Badge>
        ),
    };

    return (
        <Flex
            align="center"
            className={clsx(styles.playerContainer, 'full-screen-player-image-container')}
            direction="column"
            justify="flex-start"
            p="1rem"
        >
            <div className={styles['image-container']} ref={mainImageRef}>
                {showAudioPathBadge && formatProfile ? (
                    <QualityBadge
                        className={styles['format-badge']}
                        overlay
                        profile={formatProfile}
                    />
                ) : null}
                <AnimatePresence initial={false} mode="sync">
                    {isLongFormMode && (
                        <motion.div
                            animate="open"
                            className="full-screen-player-image"
                            custom={{ isOpen: true }}
                            exit="closed"
                            initial="closed"
                            key={`${nowPlaying.source}-${nowPlaying.title}-${audiobookItem?.id ?? podcastItem?.id ?? 'none'}`}
                            variants={imageVariants}
                        >
                            <LongFormPlayerArtwork
                                alt={nowPlaying.title}
                                className={styles.image}
                                item={isPodcastMode ? podcastItem : audiobookItem}
                                server={isPodcastMode ? podcastServer : audiobookServer}
                            />
                        </motion.div>
                    )}
                    {isRadioMode && (
                        <ImageWithPlaceholder
                            animate="open"
                            className="full-screen-player-image"
                            custom={{ isOpen: true }}
                            draggable={false}
                            exit="closed"
                            initial="closed"
                            key={`${nowPlaying.source}-${nowPlaying.title}-${nowPlaying.artwork ?? 'none'}`}
                            placeholder="var(--theme-colors-foreground-muted)"
                            placeholderIcon="radio"
                            src={nowPlaying.artwork ?? ''}
                            variants={imageVariants}
                        />
                    )}

                    {!isNonMusicMode && imageState.current === 0 && (
                        <ImageWithPlaceholder
                            animate="open"
                            className="full-screen-player-image"
                            custom={{ isOpen: imageState.current === 0 }}
                            draggable={false}
                            exit="closed"
                            explicit={blurExplicitImages && imageState.topExplicit}
                            initial="closed"
                            key={`top-${currentSong?._uniqueId || 'none'}`}
                            placeholder="var(--theme-colors-foreground-muted)"
                            src={imageState.topImage || ''}
                            variants={imageVariants}
                        />
                    )}

                    {!isNonMusicMode && imageState.current === 1 && (
                        <ImageWithPlaceholder
                            animate="open"
                            className="full-screen-player-image"
                            custom={{ isOpen: imageState.current === 1 }}
                            draggable={false}
                            exit="closed"
                            explicit={blurExplicitImages && imageState.bottomExplicit}
                            initial="closed"
                            key={`bottom-${currentSong?._uniqueId || 'none'}`}
                            placeholder="var(--theme-colors-foreground-muted)"
                            src={imageState.bottomImage || ''}
                            variants={imageVariants}
                        />
                    )}
                </AnimatePresence>
            </div>
            <Stack className={styles.metadataContainer} gap="md" maw="100%">
                <Text fw={900} lh="1.2" overflow="hidden" size="4xl" w="100%">
                    {isNonMusicMode
                        ? nowPlaying.title
                        : isRadioMode
                          ? radioMetadata?.title || stationName || 'Radio'
                          : currentSong?.name}
                </Text>
                <Text key="fs-artists" size="xl">
                    {isNonMusicMode
                        ? nowPlaying.artist
                        : isRadioMode
                          ? radioMetadata?.artist || stationName || 'Radio'
                          : currentSong?.artists?.map((artist, index) => (
                                <Fragment key={`fs-artist-${artist.id}`}>
                                    {index > 0 && (
                                        <Text
                                            style={{
                                                display: 'inline-block',
                                                padding: '0 0.5rem',
                                            }}
                                        >
                                            •
                                        </Text>
                                    )}
                                    <Text
                                        component={Link}
                                        isLink
                                        to={generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL, {
                                            albumArtistId: artist.id,
                                        })}
                                    >
                                        {artist.name}
                                    </Text>
                                </Fragment>
                            ))}
                </Text>
                {isNonMusicMode ? (
                    nowPlaying.subtitle ? (
                        <Text overflow="hidden" size="xl" w="100%">
                            {nowPlaying.subtitle}
                        </Text>
                    ) : null
                ) : isRadioMode ? (
                    <Text overflow="hidden" size="xl" w="100%">
                        {stationName || 'Radio'}
                    </Text>
                ) : (
                    <Text
                        component={Link}
                        isLink
                        overflow="hidden"
                        size="xl"
                        to={generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, {
                            albumId: currentSong?.albumId || '',
                        })}
                        w="100%"
                    >
                        {currentSong?.album}
                    </Text>
                )}
                {!isNonMusicMode && (
                    <>
                        {showAudioPathBadge && <AudioPathBadge song={currentSong} />}
                        <Group justify="center" mt="sm">
                            {playerItems.map((i) => {
                                const item = builtDataItems[i.id];
                                return !i.disabled && item ? (
                                    <Fragment key={i.id}>{item}</Fragment>
                                ) : null;
                            })}
                        </Group>
                    </>
                )}
            </Stack>
        </Flex>
    );
};
