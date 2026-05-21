import { jsx as _jsx } from "react/jsx-runtime";
import { RiAlbumFill, RiAlbumLine, RiBookOpenFill, RiBookOpenLine, RiFlag2Fill, RiFlag2Line, RiFolder3Fill, RiFolder3Line, RiHeartFill, RiHeartLine, RiHome6Fill, RiHome6Line, RiMicFill, RiMicLine, RiMusic2Fill, RiMusic2Line, RiPlayFill, RiPlayLine, RiPlayListFill, RiPlayListLine, RiRadioFill, RiRadioLine, RiSearchFill, RiSearchLine, RiSettings2Fill, RiSettings2Line, RiUserVoiceFill, RiUserVoiceLine, } from 'react-icons/ri';
import { generatePath, useLocation } from 'react-router';
import styles from './sidebar-icon.module.css';
import { AppRoute } from '/@/renderer/router/routes';
import { LibraryItem } from '/@/shared/types/domain-types';
export const SidebarIcon = ({ active, route, size }) => {
    const location = useLocation();
    const isActive = active !== undefined ? active : location.pathname === route;
    const renderIcon = () => {
        switch (route) {
            case AppRoute.AUDIOBOOKS:
                if (isActive)
                    return _jsx(RiBookOpenFill, { size: size });
                return _jsx(RiBookOpenLine, { size: size });
            case AppRoute.HOME:
                if (isActive)
                    return _jsx(RiHome6Fill, { size: size });
                return _jsx(RiHome6Line, { size: size });
            case AppRoute.LIBRARY_ALBUM_ARTISTS:
                if (isActive)
                    return _jsx(RiUserVoiceFill, { size: size });
                return _jsx(RiUserVoiceLine, { size: size });
            case AppRoute.LIBRARY_ALBUMS:
                if (isActive)
                    return _jsx(RiAlbumFill, { size: size });
                return _jsx(RiAlbumLine, { size: size });
            case AppRoute.LIBRARY_ARTISTS:
                if (isActive)
                    return _jsx(RiUserVoiceFill, { size: size });
                return _jsx(RiUserVoiceLine, { size: size });
            case AppRoute.LIBRARY_FOLDERS:
                if (isActive)
                    return _jsx(RiFolder3Fill, { size: size });
                return _jsx(RiFolder3Line, { size: size });
            case AppRoute.LIBRARY_GENRES:
                if (isActive)
                    return _jsx(RiFlag2Fill, { size: size });
                return _jsx(RiFlag2Line, { size: size });
            case AppRoute.LIBRARY_SONGS:
                if (isActive)
                    return _jsx(RiMusic2Fill, { size: size });
                return _jsx(RiMusic2Line, { size: size });
            case AppRoute.NOW_PLAYING:
                if (isActive)
                    return _jsx(RiPlayFill, { size: size });
                return _jsx(RiPlayLine, { size: size });
            case AppRoute.PLAYLISTS:
                if (isActive)
                    return _jsx(RiPlayListFill, { size: size });
                return _jsx(RiPlayListLine, { size: size });
            case AppRoute.PODCASTS:
                if (isActive)
                    return _jsx(RiMicFill, { size: size });
                return _jsx(RiMicLine, { size: size });
            case AppRoute.RADIO:
                if (isActive)
                    return _jsx(RiRadioFill, { size: size });
                return _jsx(RiRadioLine, { size: size });
            case AppRoute.SETTINGS:
                if (isActive)
                    return _jsx(RiSettings2Fill, { size: size });
                return _jsx(RiSettings2Line, { size: size });
            case generatePath(AppRoute.SEARCH, { itemType: LibraryItem.SONG }):
                if (isActive)
                    return _jsx(RiSearchFill, { size: size });
                return _jsx(RiSearchLine, { size: size });
            default:
                if (route.startsWith(AppRoute.FAVORITES)) {
                    if (isActive)
                        return _jsx(RiHeartFill, { size: size });
                    return _jsx(RiHeartLine, { size: size });
                }
                return _jsx(RiHome6Line, { size: size });
        }
    };
    return _jsx("span", { className: styles.wrapper, children: renderIcon() });
};
