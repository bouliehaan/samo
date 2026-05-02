import { AnimatePresence, motion, Variants } from 'motion/react';
import {
    CSSProperties,
    memo,
    ReactNode,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import styles from './full-screen-player.module.css';

import { useItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { SONG_TABLE_COLUMNS } from '/@/renderer/components/item-list/item-table-list/default-columns';
import { FullScreenPlayerImage } from '/@/renderer/features/player/components/full-screen-player-image';
import { FullScreenPlayerQueue } from '/@/renderer/features/player/components/full-screen-player-queue';
import {
    ListConfigMenu,
    SONG_DISPLAY_TYPES,
} from '/@/renderer/features/shared/components/list-config-menu';
import { useFastAverageColor } from '/@/renderer/hooks';
import { useNowPlaying } from '/@/renderer/hooks/use-now-playing';
import {
    useFullScreenPlayerStore,
    useFullScreenPlayerStoreActions,
    useLyricsDisplaySettings,
    useLyricsSettings,
    usePlayerData,
    usePlayerSong,
    useSettingsStore,
    useSettingsStoreActions,
    useWindowSettings,
} from '/@/renderer/store';
import { usePlaybackSource } from '/@/renderer/store/playback-owner.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Divider } from '/@/shared/components/divider/divider';
import { Group } from '/@/shared/components/group/group';
import { NumberInput } from '/@/shared/components/number-input/number-input';
import { Option } from '/@/shared/components/option/option';
import { Popover } from '/@/shared/components/popover/popover';
import { SegmentedControl } from '/@/shared/components/segmented-control/segmented-control';
import { Slider } from '/@/shared/components/slider/slider';
import { Switch } from '/@/shared/components/switch/switch';
import { useHotkeys } from '/@/shared/hooks/use-hotkeys';
import { LibraryItem } from '/@/shared/types/domain-types';
import { ItemListKey, ListDisplayType, Platform } from '/@/shared/types/types';

const mainBackground = 'var(--theme-colors-background)';

const backgroundImageVariants: Variants = {
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

interface BackgroundImageProps {
    dynamicBackground: boolean | undefined;
    dynamicIsImage: boolean | undefined;
}

const BackgroundImage = memo(({ dynamicBackground, dynamicIsImage }: BackgroundImageProps) => {
    const currentSong = usePlayerSong();
    const { nextSong } = usePlayerData();
    const nowPlaying = useNowPlaying();

    const isNonMusicMode =
        nowPlaying.source === 'audiobook' ||
        nowPlaying.source === 'podcast' ||
        nowPlaying.source === 'radio';

    const musicCurrentImageUrl = useItemImageUrl({
        id: currentSong?.imageId || undefined,
        itemType: LibraryItem.SONG,
        type: 'itemCard',
    });

    const musicNextImageUrl = useItemImageUrl({
        id: nextSong?.imageId || undefined,
        itemType: LibraryItem.SONG,
        type: 'itemCard',
    });

    const currentImageUrl = isNonMusicMode ? nowPlaying.artwork : musicCurrentImageUrl;
    const nextImageUrl = isNonMusicMode ? nowPlaying.artwork : musicNextImageUrl;

    const [imageState, setImageState] = useState({
        bottomImage: nextImageUrl,
        current: 0,
        topImage: currentImageUrl,
    });

    const previousSongRef = useRef<string | undefined>(currentSong?._uniqueId);
    const imageStateRef = useRef(imageState);

    // Keep ref in sync
    useEffect(() => {
        imageStateRef.current = imageState;
    }, [imageState]);

    // Update images when song changes
    useEffect(() => {
        const currentImageKey = isNonMusicMode
            ? `${nowPlaying.source}-${nowPlaying.title}-${currentImageUrl ?? 'none'}`
            : currentSong?._uniqueId;

        if (currentImageKey === previousSongRef.current) {
            return;
        }

        const isTop = imageStateRef.current.current === 0;

        setImageState({
            bottomImage: isTop ? currentImageUrl : nextImageUrl,
            current: isTop ? 1 : 0,
            topImage: isTop ? nextImageUrl : currentImageUrl,
        });

        previousSongRef.current = currentImageKey;
    }, [
        isNonMusicMode,
        nowPlaying.source,
        nowPlaying.title,
        currentSong?._uniqueId,
        currentImageUrl,
        nextSong?._uniqueId,
        nextImageUrl,
    ]);

    if (!dynamicBackground || !dynamicIsImage) {
        return null;
    }

    const getBackgroundImageUrl = (
        imageUrl: string | undefined,
        songId: string | undefined,
        albumId: string | undefined,
    ) => {
        if (!imageUrl || !songId || !albumId) {
            return imageUrl;
        }
        return imageUrl.replace(songId, albumId);
    };

    // Determine which song IDs to use for keys and image URLs
    const mediaImageKey = `${nowPlaying.source}-${nowPlaying.title}-${nowPlaying.artwork ?? 'none'}`;
    const topSongId = isNonMusicMode
        ? mediaImageKey
        : imageState.current === 0
          ? currentSong?._uniqueId
          : nextSong?._uniqueId;
    const bottomSongId = isNonMusicMode
        ? mediaImageKey
        : imageState.current === 0
          ? nextSong?._uniqueId
          : currentSong?._uniqueId;
    const topSong = isNonMusicMode ? undefined : imageState.current === 0 ? currentSong : nextSong;
    const bottomSong = isNonMusicMode
        ? undefined
        : imageState.current === 0
          ? nextSong
          : currentSong;

    return (
        <AnimatePresence initial={false} mode="sync">
            {imageState.current === 0 && imageState.topImage && (
                <motion.div
                    animate="open"
                    className={styles.backgroundImage}
                    custom={{ isOpen: imageState.current === 0 }}
                    exit="closed"
                    initial="closed"
                    key={`top-${topSongId || 'none'}`}
                    style={
                        {
                            backgroundImage: imageState.topImage
                                ? `url("${getBackgroundImageUrl(
                                      imageState.topImage,
                                      topSong?.id,
                                      topSong?.albumId,
                                  )}"), url("${imageState.topImage}")`
                                : undefined,
                        } as CSSProperties
                    }
                    variants={backgroundImageVariants}
                />
            )}

            {imageState.current === 1 && imageState.bottomImage && (
                <motion.div
                    animate="open"
                    className={styles.backgroundImage}
                    custom={{ isOpen: imageState.current === 1 }}
                    exit="closed"
                    initial="closed"
                    key={`bottom-${bottomSongId || 'none'}`}
                    style={
                        {
                            backgroundImage: imageState.bottomImage
                                ? `url("${getBackgroundImageUrl(
                                      imageState.bottomImage,
                                      bottomSong?.id,
                                      bottomSong?.albumId,
                                  )}"), url("${imageState.bottomImage}")`
                                : undefined,
                        } as CSSProperties
                    }
                    variants={backgroundImageVariants}
                />
            )}
        </AnimatePresence>
    );
});

BackgroundImage.displayName = 'BackgroundImage';

interface BackgroundImageOverlayProps {
    dynamicBackground: boolean | undefined;
    dynamicImageBlur: number | undefined;
}

const BackgroundImageOverlay = memo(
    ({ dynamicBackground, dynamicImageBlur }: BackgroundImageOverlayProps) => {
        if (!dynamicBackground) {
            return null;
        }

        return (
            <div
                className={styles.backgroundImageOverlay}
                style={
                    {
                        '--image-blur': `${dynamicImageBlur ?? 0}rem`,
                    } as CSSProperties
                }
            />
        );
    },
);

BackgroundImageOverlay.displayName = 'BackgroundImageOverlay';

const Controls = () => {
    const { t } = useTranslation();
    const {
        dynamicBackground,
        dynamicImageBlur,
        dynamicIsImage,
        expanded,
        opacity,
        useImageAspectRatio,
    } = useFullScreenPlayerStore();
    const { setStore } = useFullScreenPlayerStoreActions();
    const { setSettings } = useSettingsStoreActions();
    const lyricsSettings = useLyricsSettings();
    const displaySettings = useLyricsDisplaySettings('default');
    const lyricConfig = { ...lyricsSettings, ...displaySettings };
    const playbackSource = usePlaybackSource();
    const showMusicListConfig = playbackSource == null || playbackSource === 'music';

    const handleToggleFullScreenPlayer = () => {
        setStore({ expanded: !expanded, visualizerExpanded: false });
    };

    const handleLyricsSettings = (property: string, value: any) => {
        const displayProperties = ['fontSize', 'fontSizeUnsync', 'gap', 'gapUnsync'];
        if (displayProperties.includes(property)) {
            const currentDisplay = useSettingsStore.getState().lyricsDisplay;
            setSettings({
                lyricsDisplay: {
                    ...currentDisplay,
                    default: {
                        ...currentDisplay.default,
                        [property]: value,
                    },
                },
            });
        } else {
            setSettings({
                lyrics: {
                    ...useSettingsStore.getState().lyrics,
                    [property]: value,
                },
            });
        }
    };

    useHotkeys([['Escape', handleToggleFullScreenPlayer]]);

    return (
        <Group
            className={styles.controlsContainer}
            gap="sm"
            pos="absolute"
            style={{
                background: `rgb(var(--theme-colors-background-transparent), ${opacity}%)`,
                left: 0,
                top: 'max(72px, calc(env(titlebar-area-height, 0px) + 0.75rem))',
            }}
        >
            <ActionIcon
                icon="arrowDownS"
                iconProps={{ size: 'lg' }}
                onClick={handleToggleFullScreenPlayer}
                size="lg"
                tooltip={{
                    classNames: { tooltip: styles.minimizeTooltip },
                    label: t('common.minimize', { postProcess: 'titleCase' }),
                    offset: 2,
                    position: 'bottom',
                    withinPortal: false,
                }}
                variant="subtle"
            />
            <Popover position="bottom-start">
                <Popover.Target>
                    <ActionIcon
                        aria-label={t('common.configure', { postProcess: 'titleCase' })}
                        icon="settings2"
                        iconProps={{ size: 'lg' }}
                        size="lg"
                        variant="subtle"
                    />
                </Popover.Target>
                <Popover.Dropdown>
                    <Option>
                        <Option.Label>
                            {t('page.fullscreenPlayer.config.dynamicBackground', {
                                postProcess: 'sentenceCase',
                            })}
                        </Option.Label>
                        <Option.Control>
                            <Switch
                                defaultChecked={dynamicBackground}
                                onChange={(e) =>
                                    setStore({
                                        dynamicBackground: e.target.checked,
                                    })
                                }
                            />
                        </Option.Control>
                    </Option>
                    {dynamicBackground && (
                        <Option>
                            <Option.Label>
                                {t('page.fullscreenPlayer.config.dynamicIsImage', {
                                    postProcess: 'sentenceCase',
                                })}
                            </Option.Label>
                            <Option.Control>
                                <Switch
                                    defaultChecked={dynamicIsImage}
                                    onChange={(e) =>
                                        setStore({
                                            dynamicIsImage: e.target.checked,
                                        })
                                    }
                                />
                            </Option.Control>
                        </Option>
                    )}
                    {dynamicBackground && dynamicIsImage && (
                        <Option>
                            <Option.Label>
                                {t('page.fullscreenPlayer.config.dynamicImageBlur', {
                                    postProcess: 'sentenceCase',
                                })}
                            </Option.Label>
                            <Option.Control>
                                <Slider
                                    defaultValue={dynamicImageBlur}
                                    label={(e) => `${e} rem`}
                                    max={6}
                                    min={0}
                                    onChangeEnd={(e) => setStore({ dynamicImageBlur: Number(e) })}
                                    step={0.5}
                                    w="100%"
                                />
                            </Option.Control>
                        </Option>
                    )}
                    {dynamicBackground && (
                        <Option>
                            <Option.Label>
                                {t('page.fullscreenPlayer.config.opacity', {
                                    postProcess: 'sentenceCase',
                                })}
                            </Option.Label>
                            <Option.Control>
                                <Slider
                                    defaultValue={opacity}
                                    label={(e) => `${e} %`}
                                    max={100}
                                    min={0}
                                    onChangeEnd={(e) => setStore({ opacity: Number(e) })}
                                    w="100%"
                                />
                            </Option.Control>
                        </Option>
                    )}
                    <Option>
                        <Option.Label>
                            {t('page.fullscreenPlayer.config.useImageAspectRatio', {
                                postProcess: 'sentenceCase',
                            })}
                        </Option.Label>
                        <Option.Control>
                            <Switch
                                checked={useImageAspectRatio}
                                onChange={(e) =>
                                    setStore({
                                        useImageAspectRatio: e.target.checked,
                                    })
                                }
                            />
                        </Option.Control>
                    </Option>
                    <Divider my="sm" />
                    <Option>
                        <Option.Label>
                            {t('page.fullscreenPlayer.config.followCurrentLyric', {
                                postProcess: 'sentenceCase',
                            })}
                        </Option.Label>
                        <Option.Control>
                            <Switch
                                checked={lyricConfig.follow}
                                onChange={(e) =>
                                    handleLyricsSettings('follow', e.currentTarget.checked)
                                }
                            />
                        </Option.Control>
                    </Option>
                    <Option>
                        <Option.Label>
                            {t('page.fullscreenPlayer.config.showLyricProvider', {
                                postProcess: 'sentenceCase',
                            })}
                        </Option.Label>
                        <Option.Control>
                            <Switch
                                checked={lyricConfig.showProvider}
                                onChange={(e) =>
                                    handleLyricsSettings('showProvider', e.currentTarget.checked)
                                }
                            />
                        </Option.Control>
                    </Option>
                    <Option>
                        <Option.Label>
                            {t('page.fullscreenPlayer.config.showLyricMatch', {
                                postProcess: 'sentenceCase',
                            })}
                        </Option.Label>
                        <Option.Control>
                            <Switch
                                checked={lyricConfig.showMatch}
                                onChange={(e) =>
                                    handleLyricsSettings('showMatch', e.currentTarget.checked)
                                }
                            />
                        </Option.Control>
                    </Option>
                    <Option>
                        <Option.Label>
                            {t('page.fullscreenPlayer.config.lyricSize', {
                                postProcess: 'sentenceCase',
                            })}
                        </Option.Label>
                        <Option.Control>
                            <Group w="100%" wrap="nowrap">
                                <Slider
                                    defaultValue={lyricConfig.fontSize}
                                    label={(e) =>
                                        `${t('page.fullscreenPlayer.config.synchronized', {
                                            postProcess: 'titleCase',
                                        })}: ${e}px`
                                    }
                                    max={72}
                                    min={8}
                                    onChangeEnd={(e) => handleLyricsSettings('fontSize', Number(e))}
                                    w="100%"
                                />
                                <Slider
                                    defaultValue={lyricConfig.fontSize}
                                    label={(e) =>
                                        `${t('page.fullscreenPlayer.config.unsynchronized', {
                                            postProcess: 'sentenceCase',
                                        })}: ${e}px`
                                    }
                                    max={72}
                                    min={8}
                                    onChangeEnd={(e) =>
                                        handleLyricsSettings('fontSizeUnsync', Number(e))
                                    }
                                    w="100%"
                                />
                            </Group>
                        </Option.Control>
                    </Option>
                    <Option>
                        <Option.Label>
                            {t('page.fullscreenPlayer.config.lyricGap', {
                                postProcess: 'sentenceCase',
                            })}
                        </Option.Label>
                        <Option.Control>
                            <Group w="100%" wrap="nowrap">
                                <Slider
                                    defaultValue={lyricConfig.gap}
                                    label={(e) => `Synchronized: ${e}px`}
                                    max={50}
                                    min={0}
                                    onChangeEnd={(e) => handleLyricsSettings('gap', Number(e))}
                                    w="100%"
                                />
                                <Slider
                                    defaultValue={lyricConfig.gap}
                                    label={(e) => `Unsynchronized: ${e}px`}
                                    max={50}
                                    min={0}
                                    onChangeEnd={(e) =>
                                        handleLyricsSettings('gapUnsync', Number(e))
                                    }
                                    w="100%"
                                />
                            </Group>
                        </Option.Control>
                    </Option>
                    <Option>
                        <Option.Label>
                            {t('page.fullscreenPlayer.config.lyricAlignment', {
                                postProcess: 'sentenceCase',
                            })}
                        </Option.Label>
                        <Option.Control>
                            <SegmentedControl
                                data={[
                                    {
                                        label: t('common.left', {
                                            postProcess: 'titleCase',
                                        }),
                                        value: 'left',
                                    },
                                    {
                                        label: t('common.center', {
                                            postProcess: 'titleCase',
                                        }),
                                        value: 'center',
                                    },
                                    {
                                        label: t('common.right', {
                                            postProcess: 'titleCase',
                                        }),
                                        value: 'right',
                                    },
                                ]}
                                onChange={(e) => handleLyricsSettings('alignment', e)}
                                value={lyricConfig.alignment}
                            />
                        </Option.Control>
                    </Option>
                    <Option>
                        <Option.Label>
                            {t('page.fullscreenPlayer.config.lyricOffset', {
                                postProcess: 'sentenceCase',
                            })}
                        </Option.Label>
                        <Option.Control>
                            <NumberInput
                                defaultValue={lyricConfig.delayMs}
                                hideControls={false}
                                onBlur={(e) =>
                                    handleLyricsSettings('delayMs', Number(e.currentTarget.value))
                                }
                                step={10}
                            />
                        </Option.Control>
                    </Option>
                </Popover.Dropdown>
            </Popover>
            {showMusicListConfig && (
                <ListConfigMenu
                    buttonProps={{
                        size: 'lg',
                        variant: 'subtle',
                    }}
                    displayTypes={[
                        { hidden: true, value: ListDisplayType.GRID },
                        ...SONG_DISPLAY_TYPES,
                    ]}
                    listKey={ItemListKey.FULL_SCREEN}
                    optionsConfig={{
                        table: {
                            itemsPerPage: { hidden: true },
                            pagination: { hidden: true },
                        },
                    }}
                    tableColumnsData={SONG_TABLE_COLUMNS}
                />
            )}
        </Group>
    );
};

// The default layout reserves 90px at the bottom for the player bar; everything
// above that (including any native title bar) is part of the main-content row.
// Anchoring this overlay to fill the main-content row exactly avoids the visible
// gap above the player bar that used to appear when this height was hard-coded.
const containerVariants: Variants = {
    closed: () => ({
        bottom: 0,
        height: 'auto',
        left: 0,
        position: 'absolute',
        right: 0,
        top: '100vh',
        transition: {
            duration: 0.5,
            ease: 'easeInOut',
        },
        y: 0,
    }),
    open: (custom) => {
        const { background, dynamicBackground } = custom;
        return {
            backgroundColor: dynamicBackground ? background : mainBackground,
            bottom: 0,
            height: 'auto',
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
            transition: {
                delay: 0.1,
                duration: 0.5,
                ease: 'easeInOut',
            },
            y: 0,
        };
    },
};

interface PlayerContainerProps {
    children: ReactNode;
    dynamicBackground: boolean | undefined;
    dynamicIsImage: boolean | undefined;
    windowBarStyle: Platform;
}

const PlayerContainer = memo(
    ({ children, dynamicBackground, dynamicIsImage, windowBarStyle }: PlayerContainerProps) => {
        const currentSong = usePlayerSong();
        const nowPlaying = useNowPlaying();
        const isNonMusicMode =
            nowPlaying.source === 'audiobook' ||
            nowPlaying.source === 'podcast' ||
            nowPlaying.source === 'radio';
        const musicImageUrl = useItemImageUrl({
            id: currentSong?.imageId || undefined,
            imageUrl: currentSong?.imageUrl,
            itemType: LibraryItem.SONG,
            type: 'itemCard',
        });
        const imageUrl = isNonMusicMode ? nowPlaying.artwork : musicImageUrl;
        const { background } = useFastAverageColor({
            algorithm: 'dominant',
            src: imageUrl,
            srcLoaded: true,
        });

        return (
            <motion.div
                animate="open"
                className={styles.container}
                custom={{ background, dynamicBackground, windowBarStyle }}
                exit="closed"
                initial="closed"
                transition={{ duration: 2 }}
                variants={containerVariants}
            >
                <BackgroundImage
                    dynamicBackground={dynamicBackground}
                    dynamicIsImage={dynamicIsImage}
                />
                {children}
            </motion.div>
        );
    },
);

PlayerContainer.displayName = 'PlayerContainer';

export const FullScreenPlayer = () => {
    const { dynamicBackground, dynamicImageBlur, dynamicIsImage } = useFullScreenPlayerStore();
    const { setStore } = useFullScreenPlayerStoreActions();
    const { windowBarStyle } = useWindowSettings();
    const playbackSource = usePlaybackSource();

    const isRadioMode = playbackSource === 'radio';
    const effectiveDynamicBackground = dynamicBackground && !isRadioMode;

    const location = useLocation();
    const isOpenedRef = useRef<boolean | null>(null);

    useLayoutEffect(() => {
        if (isOpenedRef.current !== null) {
            setStore({ expanded: false });
        }

        isOpenedRef.current = true;
    }, [location, setStore]);

    return (
        <PlayerContainer
            dynamicBackground={effectiveDynamicBackground}
            dynamicIsImage={dynamicIsImage}
            windowBarStyle={windowBarStyle}
        >
            <Controls />
            <BackgroundImageOverlay
                dynamicBackground={effectiveDynamicBackground}
                dynamicImageBlur={dynamicImageBlur}
            />
            <div className={styles.responsiveContainer}>
                <FullScreenPlayerImage />
                <FullScreenPlayerQueue />
            </div>
        </PlayerContainer>
    );
};
