import { useTranslation } from 'react-i18next';

import { useListContext } from '/@/renderer/context/list-context';
import { useAlbumListFilters } from '/@/renderer/features/albums/hooks/use-album-list-filters';
import { SaveAsCollectionButton } from '/@/renderer/features/shared/components/save-as-collection-button';
import { useSongListFilters } from '/@/renderer/features/songs/hooks/use-song-list-filters';
import { Button } from '/@/shared/components/button/button';
import { Icon } from '/@/shared/components/icon/icon';
import { LibraryItem } from '/@/shared/types/domain-types';
import { ItemListKey } from '/@/shared/types/types';

interface ListFilterActionsProps {
    isActive?: boolean;
    itemType: LibraryItem.ALBUM | LibraryItem.SONG;
}

export const isFilterValueSet = (value: unknown): boolean => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'object' && Object.keys(value).length === 0) return false;
    return true;
};

// Samo has no server-side filter form. Keep useful collection actions in the
// toolbar instead of presenting an empty modal or a pinned, empty sidebar.
export const ListFilterActions = ({ isActive, itemType }: ListFilterActionsProps) => {
    const { t } = useTranslation();
    const { pageKey } = useListContext();
    const albumListFilters = useAlbumListFilters(pageKey as ItemListKey);
    const songListFilters = useSongListFilters(pageKey as ItemListKey);
    const clear = itemType === LibraryItem.ALBUM ? albumListFilters.clear : songListFilters.clear;

    return (
        <>
            {isActive && (
                <Button leftSection={<Icon icon="x" size="sm" />} onClick={clear} variant="toolbar">
                    {t('common.reset', { postProcess: 'sentenceCase' })}
                </Button>
            )}
            <SaveAsCollectionButton itemType={itemType} />
        </>
    );
};
