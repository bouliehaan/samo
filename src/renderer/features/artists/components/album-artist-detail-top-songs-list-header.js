import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
import { Badge } from '/@/shared/components/badge/badge';
import { SpinnerIcon } from '/@/shared/components/spinner/spinner';
import { LibraryItem } from '/@/shared/types/domain-types';
export const AlbumArtistDetailTopSongsListHeader = ({ data, itemCount, title, }) => {
    const { t } = useTranslation();
    return (_jsx(PageHeader, { children: _jsxs(LibraryHeaderBar, { ignoreMaxWidth: true, children: [_jsx(LibraryHeaderBar.PlayButton, { itemType: LibraryItem.SONG, songs: data }), _jsx(LibraryHeaderBar.Title, { order: 2, children: t('page.albumArtistDetail.topSongsFrom', {
                        postProcess: 'titleCase',
                        title,
                    }) }), _jsx(Badge, { children: itemCount === null || itemCount === undefined ? _jsx(SpinnerIcon, {}) : itemCount })] }) }));
};
