import type { KeyboardEvent } from 'react';

import { closeAllModals, openModal } from '@mantine/modals';
import clsx from 'clsx';
import { forwardRef, ReactNode, Ref, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import styles from './library-header.module.css';

import { getItemImageRequest, ItemImage } from '/@/renderer/components/item-image/item-image';
import { useIsPlayerFetching } from '/@/renderer/features/player/context/player-context';
import {
    PlayTextButton,
    WideShuffleButton,
} from '/@/renderer/features/shared/components/play-button';
import { usePlayButtonClick } from '/@/renderer/features/shared/hooks/use-play-button-click';
import { useIsMutatingCreateFavorite } from '/@/renderer/features/shared/mutations/create-favorite-mutation';
import { useIsMutatingDeleteFavorite } from '/@/renderer/features/shared/mutations/delete-favorite-mutation';
import { useGeneralSettings } from '/@/renderer/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Button } from '/@/shared/components/button/button';
import { Center } from '/@/shared/components/center/center';
import { DragDropZone } from '/@/shared/components/drag-drop-zone/drag-drop-zone';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { BaseImage } from '/@/shared/components/image/image';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Text } from '/@/shared/components/text/text';
import { ExplicitStatus, LibraryItem } from '/@/shared/types/domain-types';
import { Play } from '/@/shared/types/types';
import { logFn } from '/@/shared/utils/logger';

interface LibraryHeaderProps {
    children?: ReactNode;
    compact?: boolean;
    containerClassName?: string;
    /**
     * Always-visible decoration anchored to the artwork — e.g. the lossless
     * quality badge. Renders independently of `imageOverlay` (which is
     * hover-revealed for upload/edit affordances).
     */
    imageBadge?: ReactNode;
    imageOverlay?: ReactNode;
    imagePlaceholderUrl?: null | string;
    imageUrl?: null | string;
    item: {
        children?: ReactNode;
        explicitStatus?: ExplicitStatus | null;
        imageId?: null | string;
        imageUrl?: null | string;
        route: string;
        type?: LibraryItem;
    };
    loading?: boolean;
    onImageFileDrop?: (file: File) => Promise<void> | void;
    title: string;
    topRight?: ReactNode;
}

export const LibraryHeader = forwardRef(
    (
        {
            children,
            compact,
            containerClassName,
            imageBadge,
            imageOverlay,
            imageUrl,
            item,
            onImageFileDrop,
            title,
            topRight,
        }: LibraryHeaderProps,
        ref: Ref<HTMLDivElement>,
    ) => {
        const { t } = useTranslation();
        const { blurExplicitImages } = useGeneralSettings();

        const itemTypeString = (): string => {
            switch (item.type) {
                case LibraryItem.ALBUM:
                    return t('entity.album', { count: 1 });
                case LibraryItem.ALBUM_ARTIST:
                    return t('entity.albumArtist', { count: 1 });
                case LibraryItem.ARTIST:
                    return t('entity.artist', { count: 1 });
                case LibraryItem.PLAYLIST:
                    return t('entity.playlist', { count: 1 });
                case LibraryItem.SONG:
                    return t('entity.track', { count: 1 });
                default:
                    return t('common.unknown');
            }
        };

        const openImage = useCallback(() => {
            const imageId = item.imageId;
            const itemType = item.type as LibraryItem;

            if (!imageId || !itemType) {
                return;
            }

            const imageRequest = getItemImageRequest({
                id: imageId,
                imageUrl: item.imageUrl,
                itemType,
            });

            if (!imageRequest) {
                logFn.error('No image URL found');
                return;
            }

            openModal({
                children: (
                    <Center
                        onClick={() => closeAllModals()}
                        style={{
                            cursor: 'pointer',
                            height: 'calc(100vh - 80px)',
                            width: '100%',
                        }}
                    >
                        <BaseImage
                            alt="cover"
                            enableDebounce={false}
                            enableViewport={false}
                            fetchPriority="high"
                            imageRequest={imageRequest}
                            isExplicit={
                                blurExplicitImages &&
                                item.explicitStatus === ExplicitStatus.EXPLICIT
                            }
                            src={undefined}
                            style={{
                                maxHeight: '100%',
                                maxWidth: '100%',
                                objectFit: 'contain',
                            }}
                            unloaderIcon="emptyImage"
                        />
                    </Center>
                ),
                fullScreen: true,
            });
        }, [blurExplicitImages, item.explicitStatus, item.imageId, item.imageUrl, item.type]);

        const imageSectionSharedProps = {
            onClick: () => {
                openImage();
            },
            onKeyDown: (event: KeyboardEvent) =>
                [' ', 'Enter', 'Spacebar'].includes(event.key) && openImage(),
            role: 'button' as const,
            style: { cursor: 'pointer' as const },
            tabIndex: 0,
        };

        return (
            <div
                className={clsx(
                    styles.libraryHeader,
                    containerClassName,
                    compact && styles.compact,
                )}
                ref={ref}
            >
                {topRight && <div className={styles.topRight}>{topRight}</div>}
                {onImageFileDrop ? (
                    <DragDropZone
                        accept="image/*"
                        className={styles.imageSection}
                        mode="file"
                        onFileSelected={(file) => void onImageFileDrop(file)}
                        {...imageSectionSharedProps}
                    >
                        <ItemImage
                            className={styles.image}
                            containerClassName={styles.image}
                            enableDebounce={false}
                            enableViewport={false}
                            explicitStatus={item.explicitStatus ?? null}
                            fetchPriority="high"
                            id={item.imageId}
                            itemType={item.type as LibraryItem}
                            src={imageUrl || ''}
                            type="header"
                        />
                        {imageOverlay && (
                            <div
                                className={styles.imageOverlay}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                role="presentation"
                            >
                                {imageOverlay}
                            </div>
                        )}
                        {imageBadge}
                    </DragDropZone>
                ) : (
                    <div className={styles.imageSection} {...imageSectionSharedProps}>
                        <ItemImage
                            className={styles.image}
                            containerClassName={styles.image}
                            enableDebounce={false}
                            enableViewport={false}
                            explicitStatus={item.explicitStatus ?? null}
                            fetchPriority="high"
                            id={item.imageId}
                            itemType={item.type as LibraryItem}
                            src={imageUrl || ''}
                            type="header"
                        />
                        {imageOverlay && (
                            <div
                                className={styles.imageOverlay}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                role="presentation"
                            >
                                {imageOverlay}
                            </div>
                        )}
                        {imageBadge}
                    </div>
                )}
                {title && (
                    <div className={styles.metadataSection}>
                        {item.children ? (
                            <div className={styles.itemType}>{item.children}</div>
                        ) : (
                            <Text
                                className={styles.itemType}
                                component={Link}
                                fw={600}
                                isLink
                                size="md"
                                to={item.route}
                                tt="uppercase"
                            >
                                {itemTypeString()}
                            </Text>
                        )}

                        <h1
                            className={styles.title}
                            style={{
                                fontSize: calculateTitleSize(title),
                            }}
                        >
                            {title}
                        </h1>
                        {children}
                    </div>
                )}
            </div>
        );
    },
);

export const isAsianCharacter = (char: string): boolean => {
    const codePoint = char.codePointAt(0);

    if (!codePoint) return false;

    // CJK Unified Ideographs: U+4E00–U+9FFF
    if (codePoint >= 0x4e00 && codePoint <= 0x9fff) return true;

    // Hiragana: U+3040–U+309F
    if (codePoint >= 0x3040 && codePoint <= 0x309f) return true;

    // Katakana: U+30A0–U+30FF
    if (codePoint >= 0x30a0 && codePoint <= 0x30ff) return true;

    // CJK Extension A: U+3400–U+4DBF
    if (codePoint >= 0x3400 && codePoint <= 0x4dbf) return true;

    // CJK Compatibility Ideographs: U+F900–U+FAFF
    if (codePoint >= 0xf900 && codePoint <= 0xfaff) return true;

    // Fullwidth forms (some Asian characters): U+FF00–U+FFEF
    // Only count fullwidth letters/numbers as Asian
    if (codePoint >= 0xff01 && codePoint <= 0xff5e) return true;

    return false;
};

export const calculateWeightedLength = (str: string): number => {
    let length = 0;
    for (const char of str) {
        length += isAsianCharacter(char) ? 2.5 : 1;
    }
    return length;
};

export const calculateTitleSize = (title: string) => {
    const titleLength = calculateWeightedLength(title);
    let baseSize = '3.8dvw';

    if (titleLength > 20) {
        baseSize = '3.2dvw';
    }

    if (titleLength > 30) {
        baseSize = '2.85dvw';
    }

    if (titleLength > 40) {
        baseSize = '2.5dvw';
    }

    if (titleLength > 50) {
        baseSize = '2.3dvw';
    }

    if (titleLength > 60) {
        baseSize = '2.1dvw';
    }

    if (titleLength > 70) {
        baseSize = '1.9dvw';
    }

    if (titleLength > 80) {
        baseSize = '1.75dvw';
    }

    if (titleLength > 90) {
        baseSize = '1.6dvw';
    }

    return `clamp(2.25rem, ${baseSize}, 3.5rem)`;
};

interface LibraryHeaderMenuProps {
    favorite?: boolean;
    onAlbumRadio?: () => void;
    onArtistRadio?: () => void;
    onFavorite?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onMore?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    onPlay?: (type: Play) => void;
    onShuffle?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const LibraryHeaderMenu = ({
    favorite,
    onAlbumRadio,
    onArtistRadio,
    onFavorite,
    onMore,
    onPlay,
    onShuffle,
}: LibraryHeaderMenuProps) => {
    const { t } = useTranslation();
    const isMutatingCreateFavorite = useIsMutatingCreateFavorite();
    const isMutatingDeleteFavorite = useIsMutatingDeleteFavorite();
    const isMutatingFavorite = isMutatingCreateFavorite || isMutatingDeleteFavorite;
    const isPlayerFetching = useIsPlayerFetching();

    const handlePlayNow = usePlayButtonClick({
        onClick: () => {
            onPlay?.(Play.NOW);
        },
    });

    const handleShuffle = usePlayButtonClick({
        onClick: (event) => {
            onShuffle?.(event);
        },
    });

    return (
        <div className={styles.libraryHeaderMenu}>
            <Group wrap="nowrap">
                {onPlay && <PlayTextButton {...handlePlayNow.handlers} {...handlePlayNow.props} />}
                {onShuffle && (
                    <WideShuffleButton {...handleShuffle.handlers} {...handleShuffle.props} />
                )}
                {onAlbumRadio && (
                    <Button
                        disabled={isPlayerFetching}
                        leftSection={
                            isPlayerFetching ? (
                                <Spinner color="white" />
                            ) : (
                                <Icon icon="radio" size="lg" />
                            )
                        }
                        onClick={onAlbumRadio}
                        size="md"
                        variant="transparent"
                    >
                        {t('player.albumRadio', { postProcess: 'sentenceCase' })}
                    </Button>
                )}
                {onArtistRadio && (
                    <Button
                        disabled={isPlayerFetching}
                        leftSection={
                            isPlayerFetching ? (
                                <Spinner color="white" />
                            ) : (
                                <Icon icon="radio" size="lg" />
                            )
                        }
                        onClick={onArtistRadio}
                        size="md"
                        variant="transparent"
                    >
                        {t('player.artistRadio', { postProcess: 'sentenceCase' })}
                    </Button>
                )}
            </Group>
            <Group gap="sm" wrap="nowrap">
                {onFavorite && (
                    <ActionIcon
                        disabled={isMutatingFavorite}
                        icon="favorite"
                        iconProps={{
                            fill: favorite ? 'primary' : undefined,
                        }}
                        onClick={onFavorite}
                        size="lg"
                        variant="transparent"
                    />
                )}
                {onMore && (
                    <ActionIcon
                        icon="ellipsisHorizontal"
                        onClick={onMore}
                        size="lg"
                        variant="transparent"
                    />
                )}
            </Group>
        </div>
    );
};
