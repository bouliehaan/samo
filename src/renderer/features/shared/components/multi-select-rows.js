import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './multi-select-rows.module.css';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { Group } from '/@/shared/components/group/group';
import { Text } from '/@/shared/components/text/text';
import { LibraryItem } from '/@/shared/types/domain-types';
export function ArtistMultiSelectRow({ disabled = false, displayCountType = 'album', focusedIndex, index, onToggle, options, style, }) {
    const { t } = useTranslation();
    const handleClick = useCallback(() => {
        onToggle(options[index].value);
    }, [onToggle, options, index]);
    const isFocused = focusedIndex === index;
    const count = displayCountType === 'song' ? options[index].songCount : options[index].albumCount;
    const countEntity = displayCountType === 'song' ? 'song' : 'album';
    return (_jsxs(Group, { className: `${styles.row} ${disabled ? styles.disabled : ''}`, gap: "sm", onClick: disabled ? undefined : handleClick, style: { ...style }, ...(isFocused && !disabled && { 'data-focused': true }), children: [_jsx(ItemImage, { containerClassName: styles.rowImage, enableDebounce: true, enableViewport: false, itemType: LibraryItem.ARTIST, src: options[index].imageUrl, type: "table" }), _jsxs("div", { className: styles.rowContent, children: [_jsx(Text, { isNoSelect: true, overflow: "hidden", size: "sm", children: options[index].label }), _jsx(Text, { isMuted: true, overflow: "hidden", size: "xs", children: count ? (_jsxs(_Fragment, { children: [count, " ", t(`entity.${countEntity}`, { count })] })) : null })] })] }));
}
export function GenreMultiSelectRow({ disabled = false, displayCountType = 'album', focusedIndex, index, onToggle, options, style, }) {
    const { t } = useTranslation();
    const handleClick = useCallback(() => {
        onToggle(options[index].value);
    }, [onToggle, options, index]);
    const isFocused = focusedIndex === index;
    const count = displayCountType === 'song' ? options[index].songCount : options[index].albumCount;
    const countEntity = displayCountType === 'song' ? 'song' : 'album';
    return (_jsx(Group, { className: `${styles.row} ${disabled ? styles.disabled : ''}`, gap: "sm", onClick: disabled ? undefined : handleClick, style: { ...style }, ...(isFocused && !disabled && { 'data-focused': true }), children: _jsxs("div", { className: styles.rowContent, children: [_jsx(Text, { isNoSelect: true, overflow: "hidden", size: "sm", children: options[index].label }), _jsx(Text, { isMuted: true, overflow: "hidden", size: "xs", children: count ? (_jsxs(_Fragment, { children: [count, " ", t(`entity.${countEntity}`, { count })] })) : null })] }) }));
}
