import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { formatBitRate, formatSampleRate, isPremiumQualityContainer, } from '@samo/core/audio-quality';
import clsx from 'clsx';
import { t } from 'i18next';
import isElectron from 'is-electron';
import { AnimatePresence, motion } from 'motion/react';
import { Fragment, useEffect, useRef } from 'react';
import { generatePath, Link } from 'react-router';
import styles from './full-screen-player-image.module.css';
import { useItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { AudioPathBadge } from '/@/renderer/features/player/components/audio-path-badge';
import { useIsRadioActive, useRadioPlayer, } from '/@/renderer/features/radio/hooks/use-radio-player';
import { useNowPlaying } from '/@/renderer/hooks/use-now-playing';
import { AppRoute } from '/@/renderer/router/routes';
import { useGeneralSettings, useNativeAspectRatio, usePlaybackSettings, usePlaybackType, usePlayerData, usePlayerSong, } from '/@/renderer/store';
import { usePlaybackSource } from '/@/renderer/store/playback-owner.store';
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
const imageVariants = {
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
const unknownBadge = (label) => (_jsx(Badge, { color: "gray", variant: "light", children: label }));
const ImageWithPlaceholder = ({ className, explicit, placeholderIcon = 'itemAlbum', ...props }) => {
    const nativeAspectRatio = useNativeAspectRatio();
    if (!props.src) {
        return (_jsx(Center, { style: {
                background: 'var(--theme-colors-surface)',
                borderRadius: 'var(--theme-card-default-radius)',
                height: '100%',
                width: '100%',
            }, children: _jsx(Icon, { color: "muted", icon: placeholderIcon, size: "25%" }) }));
    }
    return (_jsx(MotionImage, { className: clsx(styles.image, className, {
            [styles.censored]: explicit,
        }), style: {
            objectFit: nativeAspectRatio ? 'contain' : 'cover',
            width: nativeAspectRatio ? 'auto' : '100%',
        }, ...props }));
};
export const FullScreenPlayerImage = () => {
    const mainImageRef = useRef(null);
    const isRadioActive = useIsRadioActive();
    const { isPlaying: isRadioPlaying, metadata: radioMetadata, stationName } = useRadioPlayer();
    const currentSong = usePlayerSong();
    const { nextSong } = usePlayerData();
    const { blurExplicitImages, playerItems } = useGeneralSettings();
    const { transcode } = usePlaybackSettings();
    const playbackType = usePlaybackType();
    const playbackSource = usePlaybackSource();
    const nowPlaying = useNowPlaying();
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
    const previousSongRef = useRef(currentSong?._uniqueId);
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
            bottomExplicit: (isTop ? currentSong?.explicitStatus : nextSong?.explicitStatus) ===
                ExplicitStatus.EXPLICIT,
            bottomImage: isTop ? currentImageUrl : nextImageUrl,
            current: isTop ? 1 : 0,
            topExplicit: (isTop ? nextSong?.explicitStatus : currentSong?.explicitStatus) ===
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
        bit_depth: isTranscoded ? (unknownBadge('Unknown bit depth')) : currentSong?.bitDepth ? (_jsxs(Badge, { children: [currentSong.bitDepth, " bit"] })) : isPremiumQualityDirect ? (unknownBadge('Unknown bit depth')) : null,
        bit_rate: formatBitRate(effectiveBitRate) ? (_jsx(Badge, { children: formatBitRate(effectiveBitRate) })) : isTranscoded ? (unknownBadge('Unknown bitrate')) : null,
        bpm: currentSong?.bpm && (_jsxs(Badge, { children: [currentSong?.bpm, " ", t('common.bpm')] })),
        codec: effectiveContainer ? (_jsx(Badge, { children: effectiveContainer.toUpperCase() })) : (unknownBadge('Unknown format')),
        disc_number: currentSong?.discNumber && (_jsxs(Badge, { children: [t('common.disc'), " ", currentSong?.discNumber] })),
        genres: currentSong?.genres &&
            currentSong?.genres
                .slice(0, 2)
                .map((genre) => _jsx(Badge, { children: genre.name }, genre.id)),
        release_date: currentSong?.releaseDate && _jsx(Badge, { children: currentSong?.releaseDate }),
        release_type: currentSong?.tags?.releasetype && (_jsx(Badge, { children: currentSong?.tags?.releasetype[0] })),
        release_year: currentSong?.releaseYear && _jsx(Badge, { children: currentSong?.releaseYear }),
        sample_rate: isTranscoded ? (unknownBadge('Unknown sample rate')) : formatSampleRate(currentSong?.sampleRate) ? (_jsx(Badge, { children: formatSampleRate(currentSong?.sampleRate) })) : isPremiumQualityDirect ? (unknownBadge('Unknown sample rate')) : null,
        track_number: currentSong?.trackNumber && (_jsxs(Badge, { children: [t('common.trackNumber'), " ", currentSong?.trackNumber] })),
    };
    return (_jsxs(Flex, { align: "center", className: clsx(styles.playerContainer, 'full-screen-player-image-container'), direction: "column", justify: "flex-start", p: "1rem", children: [_jsx("div", { className: styles.imageContainer, ref: mainImageRef, children: _jsxs(AnimatePresence, { initial: false, mode: "sync", children: [isNonMusicMode && (_jsx(ImageWithPlaceholder, { animate: "open", className: "full-screen-player-image", custom: { isOpen: true }, draggable: false, exit: "closed", initial: "closed", placeholder: "var(--theme-colors-foreground-muted)", placeholderIcon: isPodcastMode || isRadioMode ? 'radio' : 'itemAlbum', src: nowPlaying.artwork ?? '', variants: imageVariants }, `${nowPlaying.source}-${nowPlaying.title}-${nowPlaying.artwork ?? 'none'}`)), !isNonMusicMode && imageState.current === 0 && (_jsx(ImageWithPlaceholder, { animate: "open", className: "full-screen-player-image", custom: { isOpen: imageState.current === 0 }, draggable: false, exit: "closed", explicit: blurExplicitImages && imageState.topExplicit, initial: "closed", placeholder: "var(--theme-colors-foreground-muted)", src: imageState.topImage || '', variants: imageVariants }, `top-${currentSong?._uniqueId || 'none'}`)), !isNonMusicMode && imageState.current === 1 && (_jsx(ImageWithPlaceholder, { animate: "open", className: "full-screen-player-image", custom: { isOpen: imageState.current === 1 }, draggable: false, exit: "closed", explicit: blurExplicitImages && imageState.bottomExplicit, initial: "closed", placeholder: "var(--theme-colors-foreground-muted)", src: imageState.bottomImage || '', variants: imageVariants }, `bottom-${currentSong?._uniqueId || 'none'}`))] }) }), _jsxs(Stack, { className: styles.metadataContainer, gap: "md", maw: "100%", children: [_jsx(Text, { fw: 900, lh: "1.2", overflow: "hidden", size: "4xl", w: "100%", children: isNonMusicMode
                            ? nowPlaying.title
                            : isRadioMode
                                ? radioMetadata?.title || stationName || 'Radio'
                                : currentSong?.name }), _jsx(Text, { size: "xl", children: isNonMusicMode
                            ? nowPlaying.artist
                            : isRadioMode
                                ? radioMetadata?.artist || stationName || 'Radio'
                                : currentSong?.artists?.map((artist, index) => (_jsxs(Fragment, { children: [index > 0 && (_jsx(Text, { style: {
                                                display: 'inline-block',
                                                padding: '0 0.5rem',
                                            }, children: "\u2022" })), _jsx(Text, { component: Link, isLink: true, to: generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL, {
                                                albumArtistId: artist.id,
                                            }), children: artist.name })] }, `fs-artist-${artist.id}`))) }, "fs-artists"), isNonMusicMode ? (nowPlaying.subtitle ? (_jsx(Text, { overflow: "hidden", size: "xl", w: "100%", children: nowPlaying.subtitle })) : null) : isRadioMode ? (_jsx(Text, { overflow: "hidden", size: "xl", w: "100%", children: stationName || 'Radio' })) : (_jsx(Text, { component: Link, isLink: true, overflow: "hidden", size: "xl", to: generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, {
                            albumId: currentSong?.albumId || '',
                        }), w: "100%", children: currentSong?.album })), !isNonMusicMode && (_jsxs(_Fragment, { children: [showAudioPathBadge && _jsx(AudioPathBadge, { song: currentSong }), _jsx(Group, { justify: "center", mt: "sm", children: playerItems.map((i) => {
                                    const item = builtDataItems[i.id];
                                    return !i.disabled && item ? (_jsx(Fragment, { children: item }, i.id)) : null;
                                }) })] }))] })] }));
};
