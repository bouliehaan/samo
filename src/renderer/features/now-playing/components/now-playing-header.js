import { jsx as _jsx } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { PageHeader } from '/@/renderer/components/page-header/page-header';
import { LibraryHeaderBar } from '/@/renderer/features/shared/components/library-header-bar';
export const NowPlayingHeader = () => {
    const { t } = useTranslation();
    return (_jsx(PageHeader, { children: _jsx(LibraryHeaderBar, { ignoreMaxWidth: true, children: _jsx(LibraryHeaderBar.Title, { children: t('page.sidebar.nowPlaying', { postProcess: 'titleCase' }) }) }) }));
};
