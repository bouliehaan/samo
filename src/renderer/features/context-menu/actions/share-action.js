import { jsx as _jsx } from "react/jsx-runtime";
import { openContextModal } from '@mantine/modals';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { LibraryItem } from '/@/shared/types/domain-types';
export const ShareAction = ({ ids, itemType }) => {
    const { t } = useTranslation();
    const resourceType = useMemo(() => {
        switch (itemType) {
            case LibraryItem.ALBUM:
                return 'album';
            case LibraryItem.ALBUM_ARTIST:
                return 'albumArtist';
            case LibraryItem.FOLDER:
                return 'folder';
            case LibraryItem.PLAYLIST:
                return 'playlist';
            case LibraryItem.SONG:
                return 'song';
            default:
                return 'song';
        }
    }, [itemType]);
    const onSelect = useCallback(() => {
        openContextModal({
            innerProps: {
                itemIds: ids,
                resourceType,
            },
            modal: 'shareItem',
            title: t('page.contextMenu.shareItem', { postProcess: 'titleCase' }),
        });
    }, [ids, resourceType, t]);
    return (_jsx(ContextMenu.Item, { leftIcon: "share", onSelect: onSelect, children: t('page.contextMenu.shareItem', { postProcess: 'sentenceCase' }) }));
};
