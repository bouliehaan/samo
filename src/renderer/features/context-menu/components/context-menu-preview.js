import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import styles from './context-menu-preview.module.css';
import { useItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { Icon } from '/@/shared/components/icon/icon';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';
const getItemName = (item) => {
    if (item && typeof item === 'object') {
        if ('name' in item && typeof item.name === 'string') {
            return item.name;
        }
        if ('title' in item && typeof item.title === 'string') {
            return item.title;
        }
    }
    return 'Item';
};
const getItemImage = (item) => {
    if (item && typeof item === 'object') {
        if ('imageId' in item && typeof item.imageId === 'string') {
            return item.imageId;
        }
        if ('imageUrl' in item && typeof item.imageUrl === 'string') {
            return item.imageUrl;
        }
    }
    return null;
};
export const ContextMenuPreview = ({ items, itemType }) => {
    const { t } = useTranslation();
    const itemCount = items.length;
    const firstItem = items[0];
    const itemName = firstItem ? getItemName(firstItem) : 'Item';
    const itemImage = firstItem ? getItemImage(firstItem) : null;
    const isMultiple = itemCount > 1;
    const imageUrl = useItemImageUrl({
        id: firstItem?.imageId,
        itemType: itemType || LibraryItem.SONG,
        serverId: firstItem?._serverId,
        type: 'table',
    });
    if (itemCount === 0) {
        return null;
    }
    return (_jsxs("div", { className: styles.container, children: [_jsx("div", { className: styles.divider }), _jsx("div", { className: styles.preview, children: _jsxs("div", { className: styles.content, children: [itemImage ? (_jsxs("div", { className: styles.imageContainer, children: [_jsx("img", { alt: itemName, className: styles.image, src: imageUrl }), _jsx("div", { className: styles.imageOverlay })] })) : (_jsxs("div", { className: styles.iconContainer, children: [itemType === LibraryItem.ALBUM && _jsx(Icon, { icon: "album", size: "md" }), itemType === LibraryItem.SONG && _jsx(Icon, { icon: "itemSong", size: "md" }), itemType === LibraryItem.ALBUM_ARTIST && (_jsx(Icon, { icon: "artist", size: "md" })), itemType === LibraryItem.ARTIST && _jsx(Icon, { icon: "artist", size: "md" }), itemType === LibraryItem.PLAYLIST && (_jsx(Icon, { icon: "playlist", size: "md" })), itemType === LibraryItem.GENRE && _jsx(Icon, { icon: "genre", size: "md" }), itemType === LibraryItem.FOLDER && _jsx(Icon, { icon: "folder", size: "md" }), !itemType && _jsx(Icon, { icon: "library", size: "md" })] })), _jsxs("div", { className: styles.textContainer, children: [_jsx(Text, { className: styles.name, isNoSelect: true, children: itemName }), isMultiple && (_jsxs(Text, { className: styles.count, isNoSelect: true, children: ["+", t('common.itemsMore', { count: itemCount - 1 })] }))] })] }) })] }));
};
ContextMenuPreview.displayName = 'ContextMenuPreview';
