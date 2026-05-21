import { jsx as _jsx } from "react/jsx-runtime";
import { Suspense } from 'react';
import styles from './expanded-list-item.module.css';
import { ExpandedAlbumListItem } from '/@/renderer/features/albums/components/expanded-album-list-item';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { LibraryItem } from '/@/shared/types/domain-types';
export const ExpandedListItem = ({ item, itemType }) => {
    if (!item) {
        return null;
    }
    return (_jsx("div", { className: styles.container, children: _jsx("div", { className: styles.inner, children: _jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(SelectedItem, { item: item, itemType: itemType }) }) }) }));
};
const SelectedItem = ({ item, itemType }) => {
    switch (itemType) {
        case LibraryItem.ALBUM:
            return _jsx(ExpandedAlbumListItem, { item: item });
        default:
            return null;
    }
};
