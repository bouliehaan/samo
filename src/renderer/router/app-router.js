import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router';
import { ShuffleAllContextModal } from '/@/renderer/features/player/components/shuffle-all-modal';
import { RouterErrorBoundary } from '/@/renderer/features/shared/components/router-error-boundary';
import { AuthenticationOutlet } from '/@/renderer/layouts/authentication-outlet';
import { ResponsiveLayout } from '/@/renderer/layouts/responsive-layout';
import { AppOutlet } from '/@/renderer/router/app-outlet';
import { AppRoute } from '/@/renderer/router/routes';
import { TitlebarOutlet } from '/@/renderer/router/titlebar-outlet';
import { BaseContextModal, ModalsProvider } from '/@/shared/components/modal/modal';
import { Spinner } from '/@/shared/components/spinner/spinner';
const NowPlayingRoute = lazy(() => import('/@/renderer/features/now-playing/routes/now-playing-route'));
const AlbumListRoute = lazy(() => import('/@/renderer/features/albums/routes/album-list-route'));
const SongListRoute = lazy(() => import('/@/renderer/features/songs/routes/song-list-route'));
const AudiobooksRoute = lazy(() => import('/@/renderer/features/audiobooks/routes/audiobooks-route'));
const PodcastsRoute = lazy(() => import('/@/renderer/features/podcasts/routes/podcasts-route'));
const PodcastDetailRoute = lazy(() => import('/@/renderer/features/podcasts/routes/podcast-detail-route'));
const PlaylistDetailSongListRoute = lazy(() => import('/@/renderer/features/playlists/routes/playlist-detail-song-list-route'));
const PlaylistListRoute = lazy(() => import('/@/renderer/features/playlists/routes/playlist-list-route'));
const ActionRequiredRoute = lazy(() => import('/@/renderer/features/action-required/routes/action-required-route'));
const InvalidRoute = lazy(() => import('/@/renderer/features/action-required/routes/invalid-route'));
const LoginRoute = lazy(() => import('/@/renderer/features/login/routes/login-route'));
const NoNetworkRoute = lazy(() => import('/@/renderer/features/action-required/routes/no-network-route'));
const HomeRoute = lazy(() => import('/@/renderer/features/home/routes/home-route'));
const ArtistListRoute = lazy(() => import('/@/renderer/features/artists/routes/artist-list-route'));
const AlbumArtistListRoute = lazy(() => import('/@/renderer/features/artists/routes/album-artist-list-route'));
const AlbumArtistDetailRoute = lazy(() => import('/@/renderer/features/artists/routes/album-artist-detail-route'));
const AlbumArtistDetailTopSongsListRoute = lazy(() => import('../features/artists/routes/album-artist-detail-top-songs-list-route'));
const AlbumArtistDetailFavoriteSongsListRoute = lazy(() => import('../features/artists/routes/album-artist-detail-favorite-songs-list-route'));
const AlbumDetailRoute = lazy(() => import('/@/renderer/features/albums/routes/album-detail-route'));
const DummyAlbumDetailRoute = lazy(() => import('/@/renderer/features/albums/routes/dummy-album-detail-route'));
const GenreListRoute = lazy(() => import('/@/renderer/features/genres/routes/genre-list-route'));
const GenreDetailRoute = lazy(() => import('/@/renderer/features/genres/routes/genre-detail-route'));
const FolderListRoute = lazy(() => import('/@/renderer/features/folders/routes/folder-list-route'));
const RadioListRoute = lazy(() => import('/@/renderer/features/radio/routes/radio-list-route'));
const SearchRoute = lazy(() => import('/@/renderer/features/search/routes/search-route'));
const FavoritesRoute = lazy(() => import('/@/renderer/features/favorites/routes/favorites-route'));
const SettingsRoute = lazy(() => import('/@/renderer/features/settings/routes/settings-route'));
const LazyLyricsSettingsContextModal = lazy(() => import('/@/renderer/features/lyrics/components/lyrics-settings-modal').then((module) => ({
    default: module.LyricsSettingsContextModal,
})));
const LyricsSettingsContextModal = (props) => (_jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(LazyLyricsSettingsContextModal, { ...props }) }));
const LazyAddToPlaylistContextModal = lazy(() => import('/@/renderer/features/playlists/components/add-to-playlist-context-modal').then((module) => ({
    default: module.AddToPlaylistContextModal,
})));
const AddToPlaylistContextModal = (props) => (_jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(LazyAddToPlaylistContextModal, { ...props }) }));
const LazySaveAndReplaceContextModal = lazy(() => import('/@/renderer/features/playlists/components/save-and-replace-context-modal').then((module) => ({
    default: module.SaveAndReplaceContextModal,
})));
const SaveAndReplaceContextModal = (props) => (_jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(LazySaveAndReplaceContextModal, { ...props }) }));
const LazyUpdatePlaylistContextModal = lazy(() => import('/@/renderer/features/playlists/components/update-playlist-form').then((module) => ({
    default: module.UpdatePlaylistContextModal,
})));
const UpdatePlaylistContextModal = (props) => (_jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(LazyUpdatePlaylistContextModal, { ...props }) }));
const LazySettingsContextModal = lazy(() => import('/@/renderer/features/settings/components/settings-modal').then((module) => ({
    default: module.SettingsContextModal,
})));
const SettingsContextModal = (props) => (_jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(LazySettingsContextModal, { ...props }) }));
const LazyShareItemContextModal = lazy(() => import('/@/renderer/features/sharing/components/share-item-context-modal').then((module) => ({
    default: module.ShareItemContextModal,
})));
const ShareItemContextModal = (props) => (_jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(LazyShareItemContextModal, { ...props }) }));
const LazyVisualizerSettingsContextModal = lazy(() => import('/@/renderer/features/visualizer/components/audiomotionanalyzer/visualizer-settings-modal').then((module) => ({
    default: module.VisualizerSettingsContextModal,
})));
const VisualizerSettingsContextModal = (props) => (_jsx(Suspense, { fallback: _jsx(Spinner, { container: true }), children: _jsx(LazyVisualizerSettingsContextModal, { ...props }) }));
const appRouterModals = {
    addToPlaylist: AddToPlaylistContextModal,
    base: BaseContextModal,
    lyricsSettings: LyricsSettingsContextModal,
    saveAndReplace: SaveAndReplaceContextModal,
    settings: SettingsContextModal,
    shareItem: ShareItemContextModal,
    shuffleAll: ShuffleAllContextModal,
    updatePlaylist: UpdatePlaylistContextModal,
    visualizerSettings: VisualizerSettingsContextModal,
};
export const AppRouter = () => {
    const router = (_jsx(HashRouter, { unstable_useTransitions: false, children: _jsx(ModalsProvider, { modals: appRouterModals, children: _jsx(RouterErrorBoundary, { children: _jsxs(Routes, { children: [_jsx(Route, { element: _jsx(AuthenticationOutlet, {}), children: _jsx(Route, { element: _jsx(TitlebarOutlet, {}), children: _jsx(Route, { element: _jsx(AppOutlet, {}), children: _jsxs(Route, { element: _jsx(ResponsiveLayout, {}), children: [_jsx(Route, { element: _jsx(HomeRoute, {}), index: true }), _jsx(Route, { element: _jsx(HomeRoute, {}), path: AppRoute.HOME }), _jsx(Route, { element: _jsx(SearchRoute, {}), path: AppRoute.SEARCH }), _jsx(Route, { element: _jsx(FavoritesRoute, {}), path: AppRoute.FAVORITES }), _jsx(Route, { element: _jsx(SettingsRoute, {}), path: AppRoute.SETTINGS }), _jsx(Route, { element: _jsx(NowPlayingRoute, {}), path: AppRoute.NOW_PLAYING }), _jsxs(Route, { path: AppRoute.LIBRARY_GENRES, children: [_jsx(Route, { element: _jsx(GenreListRoute, {}), index: true }), _jsx(Route, { element: _jsx(GenreDetailRoute, {}), path: AppRoute.LIBRARY_GENRES_DETAIL })] }), _jsx(Route, { element: _jsx(AlbumListRoute, {}), path: AppRoute.LIBRARY_ALBUMS }), _jsx(Route, { element: _jsx(AlbumDetailRoute, {}), path: AppRoute.LIBRARY_ALBUMS_DETAIL }), _jsx(Route, { element: _jsx(ArtistListRoute, {}), path: AppRoute.LIBRARY_ARTISTS }), _jsxs(Route, { path: AppRoute.LIBRARY_ARTISTS_DETAIL, children: [_jsx(Route, { element: _jsx(AlbumArtistDetailRoute, {}), index: true }), _jsx(Route, { element: _jsx(AlbumListRoute, {}), path: AppRoute.LIBRARY_ARTISTS_DETAIL_DISCOGRAPHY }), _jsx(Route, { element: _jsx(SongListRoute, {}), path: AppRoute.LIBRARY_ARTISTS_DETAIL_SONGS }), _jsx(Route, { element: _jsx(AlbumArtistDetailTopSongsListRoute, {}), path: AppRoute.LIBRARY_ARTISTS_DETAIL_TOP_SONGS }), _jsx(Route, { element: _jsx(AlbumArtistDetailFavoriteSongsListRoute, {}), path: AppRoute.LIBRARY_ARTISTS_DETAIL_FAVORITE_SONGS })] }), _jsx(Route, { element: _jsx(DummyAlbumDetailRoute, {}), path: AppRoute.FAKE_LIBRARY_ALBUM_DETAILS }), _jsx(Route, { element: _jsx(SongListRoute, {}), path: AppRoute.LIBRARY_SONGS }), _jsx(Route, { element: _jsx(FolderListRoute, {}), path: AppRoute.LIBRARY_FOLDERS }), _jsx(Route, { element: _jsx(PlaylistListRoute, {}), path: AppRoute.PLAYLISTS }), _jsx(Route, { element: _jsx(RadioListRoute, {}), path: AppRoute.RADIO }), _jsx(Route, { element: _jsx(AudiobooksRoute, {}), path: AppRoute.AUDIOBOOKS }), _jsx(Route, { element: _jsx(PodcastsRoute, {}), path: AppRoute.PODCASTS }), _jsx(Route, { element: _jsx(PodcastDetailRoute, {}), path: AppRoute.PODCASTS_DETAIL }), _jsx(Route, { element: _jsx(PlaylistDetailSongListRoute, {}), path: AppRoute.PLAYLISTS_DETAIL_SONGS }), _jsxs(Route, { path: AppRoute.LIBRARY_ALBUM_ARTISTS, children: [_jsx(Route, { element: _jsx(AlbumArtistListRoute, {}), index: true }), _jsxs(Route, { path: AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL, children: [_jsx(Route, { element: _jsx(AlbumArtistDetailRoute, {}), index: true }), _jsx(Route, { element: _jsx(AlbumListRoute, {}), path: AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL_DISCOGRAPHY }), _jsx(Route, { element: _jsx(SongListRoute, {}), path: AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL_SONGS }), _jsx(Route, { element: _jsx(AlbumArtistDetailTopSongsListRoute, {}), path: AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL_TOP_SONGS }), _jsx(Route, { element: _jsx(AlbumArtistDetailFavoriteSongsListRoute, {}), path: AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL_FAVORITE_SONGS })] })] }), _jsx(Route, { element: _jsx(InvalidRoute, {}), path: "*" })] }) }) }) }), _jsxs(Route, { element: _jsx(TitlebarOutlet, {}), children: [_jsxs(Route, { element: _jsx(ResponsiveLayout, { shell: true }), children: [_jsx(Route, { element: _jsx(ActionRequiredRoute, {}), path: AppRoute.ACTION_REQUIRED }), _jsx(Route, { element: _jsx(LoginRoute, {}), path: AppRoute.LOGIN })] }), _jsx(Route, { element: _jsx(ResponsiveLayout, {}), children: _jsx(Route, { element: _jsx(NoNetworkRoute, {}), path: AppRoute.NO_NETWORK }) })] })] }) }) }) }));
    return router;
};
