import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { closeAllModals, openModal } from '@mantine/modals';
import clsx from 'clsx';
import { forwardRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import styles from './library-header.module.css';
import { getItemImageUrl, ItemImage } from '/@/renderer/components/item-image/item-image';
import { useIsPlayerFetching } from '/@/renderer/features/player/context/player-context';
import { PlayTextButton, WideShuffleButton, } from '/@/renderer/features/shared/components/play-button';
import { logFn } from '/@/renderer/utils/logger';
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
export const LibraryHeader = forwardRef(({ children, compact, containerClassName, imageOverlay, imageUrl, item, onImageFileDrop, title, topRight, }, ref) => {
    const { t } = useTranslation();
    const { blurExplicitImages } = useGeneralSettings();
    const itemTypeString = () => {
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
        const itemType = item.type;
        if (!imageId || !itemType) {
            return;
        }
        const imageUrl = getItemImageUrl({
            id: imageId,
            itemType,
        });
        if (!imageUrl) {
            logFn.error('No image URL found');
            return;
        }
        openModal({
            children: (_jsx(Center, { onClick: () => closeAllModals(), style: {
                    cursor: 'pointer',
                    height: 'calc(100vh - 80px)',
                    width: '100%',
                }, children: _jsx(BaseImage, { alt: "cover", enableDebounce: false, enableViewport: false, fetchPriority: "high", isExplicit: blurExplicitImages &&
                        item.explicitStatus === ExplicitStatus.EXPLICIT, src: imageUrl, style: {
                        maxHeight: '100%',
                        maxWidth: '100%',
                        objectFit: 'contain',
                    }, unloaderIcon: "emptyImage" }) })),
            fullScreen: true,
        });
    }, [blurExplicitImages, item.explicitStatus, item.imageId, item.type]);
    const imageSectionSharedProps = {
        onClick: () => {
            openImage();
        },
        onKeyDown: (event) => [' ', 'Enter', 'Spacebar'].includes(event.key) && openImage(),
        role: 'button',
        style: { cursor: 'pointer' },
        tabIndex: 0,
    };
    return (_jsxs("div", { className: clsx(styles.libraryHeader, containerClassName, compact && styles.compact), ref: ref, children: [topRight && _jsx("div", { className: styles.topRight, children: topRight }), onImageFileDrop ? (_jsxs(DragDropZone, { accept: "image/*", className: styles.imageSection, mode: "file", onFileSelected: (file) => void onImageFileDrop(file), ...imageSectionSharedProps, children: [_jsx(ItemImage, { className: styles.image, containerClassName: styles.image, enableDebounce: false, enableViewport: false, explicitStatus: item.explicitStatus ?? null, fetchPriority: "high", id: item.imageId, itemType: item.type, src: imageUrl || '', type: "header" }), imageOverlay && (_jsx("div", { className: styles.imageOverlay, onClick: (e) => e.stopPropagation(), onKeyDown: (e) => e.stopPropagation(), role: "presentation", children: imageOverlay }))] })) : (_jsxs("div", { className: styles.imageSection, ...imageSectionSharedProps, children: [_jsx(ItemImage, { className: styles.image, containerClassName: styles.image, enableDebounce: false, enableViewport: false, explicitStatus: item.explicitStatus ?? null, fetchPriority: "high", id: item.imageId, itemType: item.type, src: imageUrl || '', type: "header" }), imageOverlay && (_jsx("div", { className: styles.imageOverlay, onClick: (e) => e.stopPropagation(), onKeyDown: (e) => e.stopPropagation(), role: "presentation", children: imageOverlay }))] })), title && (_jsxs("div", { className: styles.metadataSection, children: [item.children ? (_jsx("div", { className: styles.itemType, children: item.children })) : (_jsx(Text, { className: styles.itemType, component: Link, fw: 600, isLink: true, size: "md", to: item.route, tt: "uppercase", children: itemTypeString() })), _jsx("h1", { className: styles.title, style: {
                            fontSize: calculateTitleSize(title),
                        }, children: title }), children] }))] }));
});
export const isAsianCharacter = (char) => {
    const codePoint = char.codePointAt(0);
    if (!codePoint)
        return false;
    // CJK Unified Ideographs: U+4E00–U+9FFF
    if (codePoint >= 0x4e00 && codePoint <= 0x9fff)
        return true;
    // Hiragana: U+3040–U+309F
    if (codePoint >= 0x3040 && codePoint <= 0x309f)
        return true;
    // Katakana: U+30A0–U+30FF
    if (codePoint >= 0x30a0 && codePoint <= 0x30ff)
        return true;
    // CJK Extension A: U+3400–U+4DBF
    if (codePoint >= 0x3400 && codePoint <= 0x4dbf)
        return true;
    // CJK Compatibility Ideographs: U+F900–U+FAFF
    if (codePoint >= 0xf900 && codePoint <= 0xfaff)
        return true;
    // Fullwidth forms (some Asian characters): U+FF00–U+FFEF
    // Only count fullwidth letters/numbers as Asian
    if (codePoint >= 0xff01 && codePoint <= 0xff5e)
        return true;
    return false;
};
export const calculateWeightedLength = (str) => {
    let length = 0;
    for (const char of str) {
        length += isAsianCharacter(char) ? 2.5 : 1;
    }
    return length;
};
export const calculateTitleSize = (title) => {
    const titleLength = calculateWeightedLength(title);
    let baseSize = '3dvw';
    if (titleLength > 20) {
        baseSize = '2.5dvw';
    }
    if (titleLength > 30) {
        baseSize = '2.25dvw';
    }
    if (titleLength > 40) {
        baseSize = '2dvw';
    }
    if (titleLength > 50) {
        baseSize = '1.875dvw';
    }
    if (titleLength > 60) {
        baseSize = '1.75dvw';
    }
    if (titleLength > 70) {
        baseSize = '1.5dvw';
    }
    if (titleLength > 80) {
        baseSize = '1.4dvw';
    }
    if (titleLength > 90) {
        baseSize = '1.3dvw';
    }
    return `clamp(1.75rem, ${baseSize}, 2.75rem)`;
};
export const LibraryHeaderMenu = ({ favorite, onAlbumRadio, onArtistRadio, onFavorite, onMore, onPlay, onShuffle, }) => {
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
    return (_jsxs("div", { className: styles.libraryHeaderMenu, children: [_jsxs(Group, { wrap: "nowrap", children: [onPlay && _jsx(PlayTextButton, { ...handlePlayNow.handlers, ...handlePlayNow.props }), onShuffle && (_jsx(WideShuffleButton, { ...handleShuffle.handlers, ...handleShuffle.props })), onAlbumRadio && (_jsx(Button, { disabled: isPlayerFetching, leftSection: isPlayerFetching ? (_jsx(Spinner, { color: "white" })) : (_jsx(Icon, { icon: "radio", size: "lg" })), onClick: onAlbumRadio, size: "md", variant: "transparent", children: t('player.albumRadio', { postProcess: 'sentenceCase' }) })), onArtistRadio && (_jsx(Button, { disabled: isPlayerFetching, leftSection: isPlayerFetching ? (_jsx(Spinner, { color: "white" })) : (_jsx(Icon, { icon: "radio", size: "lg" })), onClick: onArtistRadio, size: "md", variant: "transparent", children: t('player.artistRadio', { postProcess: 'sentenceCase' }) }))] }), _jsxs(Group, { gap: "sm", wrap: "nowrap", children: [onFavorite && (_jsx(ActionIcon, { disabled: isMutatingFavorite, icon: "favorite", iconProps: {
                            fill: favorite ? 'primary' : undefined,
                        }, onClick: onFavorite, size: "lg", variant: "transparent" })), onMore && (_jsx(ActionIcon, { icon: "ellipsisHorizontal", onClick: onMore, size: "lg", variant: "transparent" }))] })] }));
};
