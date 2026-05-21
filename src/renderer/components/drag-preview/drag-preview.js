import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './drag-preview.module.css';
import { useItemImageUrl } from '/@/renderer/components/item-image/item-image';
import { Icon } from '/@/shared/components/icon/icon';
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
export const DragPreview = memo(({ data }) => {
    const items = data.item || [];
    const { t } = useTranslation();
    const itemCount = items.length;
    const firstItem = items[0];
    const itemName = firstItem ? getItemName(firstItem) : 'Item';
    const itemImage = useItemImageUrl({
        id: firstItem?.imageId,
        itemType: data.itemType || LibraryItem.SONG,
        type: 'table',
    });
    const isMultiple = itemCount > 1;
    return (_jsx("div", { className: styles.container, children: _jsx("div", { className: styles.preview, children: _jsxs("div", { className: styles.content, children: [itemImage ? (_jsxs("div", { className: styles['image-container'], children: [_jsx("img", { alt: itemName, className: styles.image, src: itemImage }), _jsx("div", { className: styles['image-overlay'] })] })) : (_jsxs("div", { className: styles['icon-container'], children: [data.itemType === LibraryItem.ALBUM && _jsx(Icon, { icon: "album", size: "xl" }), data.itemType === LibraryItem.SONG && (_jsx(Icon, { icon: "itemSong", size: "xl" })), data.itemType === LibraryItem.ARTIST && (_jsx(Icon, { icon: "artist", size: "xl" })), data.itemType === LibraryItem.PLAYLIST && (_jsx(Icon, { icon: "playlist", size: "xl" })), data.itemType === LibraryItem.GENRE && _jsx(Icon, { icon: "genre", size: "xl" }), !data.itemType && _jsx(Icon, { icon: "library", size: "xl" })] })), _jsxs("div", { className: styles['text-container'], children: [_jsx("div", { className: styles.name, children: itemName }), isMultiple && (_jsxs("div", { className: styles.count, children: ["+", t('common.itemsMore', { count: itemCount - 1 })] }))] })] }) }) }));
});
DragPreview.displayName = 'DragPreview';
