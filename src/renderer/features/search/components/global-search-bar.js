import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useId, useMemo, useRef, useState, } from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath, useNavigate } from 'react-router';
import styles from './global-search-bar.module.css';
import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { useRadioControls } from '/@/renderer/features/radio/hooks/use-radio-player';
import { AbsCoverImage } from '/@/renderer/features/search/components/abs-cover-image';
import { useUnifiedSearch, } from '/@/renderer/features/search/hooks/use-unified-search';
import { useSetFavorite } from '/@/renderer/features/shared/hooks/use-set-favorite';
import { AppRoute } from '/@/renderer/router/routes';
import { recordRecentArtist, recordRecentAudiobook, recordRecentPlaylist, recordRecentPodcast, recordRecentSong, useAudiobookshelfServer, useCurrentServer, usePlayButtonBehavior, } from '/@/renderer/store';
import { useAudiobookActions } from '/@/renderer/store/audiobook.store';
import { useFavoriteAudiobookIds, useFavoritePodcastIds, useLibraryFavoritesActions, } from '/@/renderer/store/library-favorites.store';
import { usePodcastActions } from '/@/renderer/store/podcast.store';
import { Icon } from '/@/shared/components/icon/icon';
import { useDebouncedValue } from '/@/shared/hooks/use-debounced-value';
import { LibraryItem, } from '/@/shared/types/domain-types';
const DEBOUNCE_MS = 200;
const ResultRow = ({ artImageId, artImageUrl, artItemType, artNode, artServerId, artVariant = 'square', fallbackIcon, favorite, onSelect, subtitle, tag, title, }) => {
    const showImage = Boolean((artImageId || artImageUrl) && artItemType);
    return (_jsxs("div", { "aria-selected": false, className: styles.row, onClick: onSelect, onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect();
            }
        }, role: "option", tabIndex: 0, children: [_jsx("div", { className: `${styles.rowArt}${artVariant === 'circle' ? ` ${styles.rowArtCircle}` : ''}`, children: artNode ? (artNode) : showImage ? (_jsx(ItemImage, { alt: title, height: 40, id: artImageId ?? null, itemType: artItemType, loading: "lazy", serverId: artServerId ?? null, src: artImageUrl ?? null, type: "itemCard", width: 40 })) : (_jsx(Icon, { icon: fallbackIcon, size: "lg" })) }), _jsxs("div", { className: styles.rowText, children: [_jsx("span", { className: styles.rowTitle, children: title }), subtitle ? _jsx("span", { className: styles.rowSubtitle, children: subtitle }) : null] }), favorite ? (_jsx("button", { "aria-label": favorite.isFavorite ? 'Remove favorite' : 'Add favorite', className: styles.favoriteButton, onClick: (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    favorite.onToggle();
                }, type: "button", children: _jsx(Icon, { icon: "favorite", size: "md", ...(favorite.isFavorite
                        ? { color: 'primary', fill: 'primary' }
                        : {}) }) })) : null, _jsx("span", { className: styles.rowTag, children: tag })] }));
};
const ResultSection = ({ children, title }) => (_jsxs("div", { className: styles.section, children: [_jsx("div", { className: styles.sectionHeader, children: title }), children] }));
const getAbsTitle = (item) => item.media?.metadata?.title ?? item.name ?? 'Untitled';
const getAbsAuthor = (item) => {
    const meta = item.media?.metadata;
    return meta?.author ?? meta?.authors?.map((author) => author.name).join(', ') ?? '';
};
const getEpisodeSubtitle = (show, episode) => {
    const showTitle = getAbsTitle(show);
    if (episode.season)
        return `${showTitle} · S${episode.season}`;
    return showTitle;
};
const GROUP_TITLES = {
    albums: 'Albums',
    artists: 'Artists',
    audiobooks: 'Audiobooks',
    episodes: 'Episodes',
    playlists: 'Playlists',
    podcastShows: 'Podcasts',
    radioStations: 'Radio',
    songs: 'Tracks',
};
const SOURCE_WARNING_LABELS = {
    abs: 'Audiobookshelf',
    music: 'Music',
    playlists: 'Playlists',
    radio: 'Radio',
};
const renderRow = (entry, deps) => {
    switch (entry.kind) {
        case 'album': {
            const { album } = entry;
            return (_jsx(ResultRow, { artImageId: album.imageId, artImageUrl: album.imageUrl, artItemType: LibraryItem.ALBUM, artServerId: album._serverId, fallbackIcon: "album", favorite: {
                    isFavorite: album.userFavorite,
                    onToggle: () => deps.onToggleFavorite(album, LibraryItem.ALBUM),
                }, onSelect: () => deps.onSelectAlbum(album), subtitle: album.albumArtistName || undefined, tag: "Album", title: album.name }, `album-${album.id}`));
        }
        case 'artist': {
            const { artist } = entry;
            return (_jsx(ResultRow, { artImageId: artist.imageId, artImageUrl: artist.imageUrl, artItemType: LibraryItem.ALBUM_ARTIST, artServerId: artist._serverId, artVariant: "circle", fallbackIcon: "artist", favorite: {
                    isFavorite: artist.userFavorite,
                    onToggle: () => deps.onToggleFavorite(artist, LibraryItem.ALBUM_ARTIST),
                }, onSelect: () => deps.onSelectArtist(artist), tag: "Artist", title: artist.name }, `artist-${artist.id}`));
        }
        case 'audiobook': {
            const { item } = entry;
            return (_jsx(ResultRow, { artNode: _jsx(AbsCoverImage, { alt: getAbsTitle(item), fallbackIcon: "metadata", itemId: item.id }), fallbackIcon: "metadata", favorite: {
                    isFavorite: deps.audiobookFavoriteIds.has(item.id),
                    onToggle: () => deps.onToggleAudiobookFavorite(item),
                }, onSelect: () => deps.onSelectAudiobook(item), subtitle: getAbsAuthor(item) || undefined, tag: "Audiobook", title: getAbsTitle(item) }, `audiobook-${item.id}`));
        }
        case 'episode': {
            const { episode } = entry;
            return (_jsx(ResultRow, { artNode: _jsx(AbsCoverImage, { alt: episode.episode.title ?? getAbsTitle(episode.show), fallbackIcon: "microphone", itemId: episode.show.id }), fallbackIcon: "microphone", onSelect: () => deps.onSelectEpisode(episode), subtitle: getEpisodeSubtitle(episode.show, episode.episode), tag: "Episode", title: episode.episode.title ?? 'Untitled episode' }, `episode-${episode.show.id}-${episode.episode.id}`));
        }
        case 'playlist': {
            const { playlist } = entry;
            return (_jsx(ResultRow, { artImageId: playlist.imageId, artImageUrl: playlist.imageUrl, artItemType: LibraryItem.PLAYLIST, artServerId: playlist._serverId, fallbackIcon: "playlist", onSelect: () => deps.onSelectPlaylist(playlist), subtitle: playlist.owner ?? undefined, tag: "Playlist", title: playlist.name }, `playlist-${playlist.id}`));
        }
        case 'podcastShow': {
            const { item } = entry;
            return (_jsx(ResultRow, { artNode: _jsx(AbsCoverImage, { alt: getAbsTitle(item), fallbackIcon: "microphone", itemId: item.id }), fallbackIcon: "microphone", favorite: {
                    isFavorite: deps.podcastFavoriteIds.has(item.id),
                    onToggle: () => deps.onTogglePodcastFavorite(item),
                }, onSelect: () => deps.onSelectPodcastShow(item), subtitle: getAbsAuthor(item) || undefined, tag: "Podcast", title: getAbsTitle(item) }, `podcast-${item.id}`));
        }
        case 'radio': {
            const { station } = entry;
            return (_jsx(ResultRow, { artImageUrl: station.imageUrl, artItemType: LibraryItem.RADIO_STATION, artServerId: deps.musicServerId ?? null, fallbackIcon: "radio", onSelect: () => deps.onSelectRadio(station), tag: "Radio", title: station.name }, `radio-${station.id}`));
        }
        case 'song': {
            const { song } = entry;
            return (_jsx(ResultRow, { artImageId: song.imageId, artImageUrl: song.imageUrl, artItemType: LibraryItem.SONG, artServerId: song._serverId, fallbackIcon: "track", favorite: {
                    isFavorite: song.userFavorite,
                    onToggle: () => deps.onToggleFavorite(song, LibraryItem.SONG),
                }, onSelect: () => deps.onSelectSong(song), subtitle: song.artistName ?? song.album ?? undefined, tag: "Track", title: song.name }, `song-${song.id}`));
        }
        default:
            return null;
    }
};
const SourceWarnings = ({ errors }) => {
    const sourceKeys = Object.keys(SOURCE_WARNING_LABELS);
    const activeWarnings = sourceKeys.filter((sourceKey) => errors[sourceKey]);
    if (activeWarnings.length === 0)
        return null;
    return (_jsx("div", { className: styles.warningList, children: activeWarnings.map((sourceKey) => (_jsxs("div", { className: styles.sourceWarning, children: [_jsx(Icon, { icon: "warn", size: "sm" }), _jsxs("span", { children: [SOURCE_WARNING_LABELS[sourceKey], " unavailable: ", errors[sourceKey]] })] }, sourceKey))) }));
};
export const GlobalSearchBar = ({ className }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const inputId = useId();
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [debouncedQuery] = useDebouncedValue(query, DEBOUNCE_MS);
    const debounced = (debouncedQuery ?? '').trim();
    const { bestMatches, groupOrder, hasAnyResults, isLoading, results, sourceErrors } = useUnifiedSearch(debounced);
    const player = usePlayer();
    const playButtonBehavior = usePlayButtonBehavior();
    const musicServer = useCurrentServer();
    const musicServerId = musicServer?.id;
    const audiobookshelfServer = useAudiobookshelfServer();
    const audiobookshelfServerId = audiobookshelfServer?.id;
    const audiobookActions = useAudiobookActions();
    const podcastActions = usePodcastActions();
    const radioControls = useRadioControls();
    const setFavorite = useSetFavorite();
    const libraryFavoriteActions = useLibraryFavoritesActions();
    const audiobookFavoriteIds = useFavoriteAudiobookIds(audiobookshelfServerId);
    const podcastFavoriteIds = useFavoritePodcastIds(audiobookshelfServerId);
    const closeDropdown = useCallback(() => setIsOpen(false), []);
    useEffect(() => {
        if (!isOpen)
            return undefined;
        const handlePointerDown = (event) => {
            if (!wrapperRef.current)
                return;
            if (!wrapperRef.current.contains(event.target)) {
                closeDropdown();
            }
        };
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                closeDropdown();
                inputRef.current?.blur();
            }
        };
        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [closeDropdown, isOpen]);
    const handleFocus = useCallback(() => setIsOpen(true), []);
    const handleClear = useCallback(() => {
        setQuery('');
        inputRef.current?.focus();
    }, []);
    const handleSubmit = useCallback(() => {
        const trimmed = query.trim();
        if (!trimmed)
            return;
        const searchPath = generatePath(AppRoute.SEARCH, { itemType: LibraryItem.SONG });
        navigate(`${searchPath}?query=${encodeURIComponent(trimmed)}`);
        closeDropdown();
    }, [closeDropdown, navigate, query]);
    const handleHomeClick = useCallback(() => {
        navigate(AppRoute.HOME);
        closeDropdown();
    }, [closeDropdown, navigate]);
    const handleSongSelect = useCallback((song) => {
        recordRecentSong(song);
        player.addToQueueByData([song], playButtonBehavior);
        closeDropdown();
    }, [closeDropdown, playButtonBehavior, player]);
    const handleAlbumSelect = useCallback((album) => {
        navigate(generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, { albumId: album.id }));
        closeDropdown();
    }, [closeDropdown, navigate]);
    const handleArtistSelect = useCallback((artist) => {
        recordRecentArtist(artist);
        navigate(generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL, {
            albumArtistId: artist.id,
        }));
        closeDropdown();
    }, [closeDropdown, navigate]);
    const handlePlaylistSelect = useCallback((playlist) => {
        recordRecentPlaylist(playlist);
        navigate(generatePath(AppRoute.PLAYLISTS_DETAIL_SONGS, { playlistId: playlist.id }));
        closeDropdown();
    }, [closeDropdown, navigate]);
    const handleRadioSelect = useCallback((station) => {
        if (!musicServerId)
            return;
        radioControls.play(station.streamUrl, station.name, {
            id: station.id,
            imageId: station.imageId,
            imageUrl: station.imageUrl,
            serverId: musicServerId,
        });
        closeDropdown();
    }, [closeDropdown, musicServerId, radioControls]);
    const handleAudiobookSelect = useCallback((item) => {
        if (!audiobookshelfServer)
            return;
        recordRecentAudiobook(item, audiobookshelfServer.id);
        audiobookActions.play(audiobookshelfServer, item);
        closeDropdown();
    }, [audiobookActions, audiobookshelfServer, closeDropdown]);
    const handlePodcastShowSelect = useCallback((item) => {
        if (audiobookshelfServer) {
            recordRecentPodcast(item, audiobookshelfServer.id);
        }
        navigate(generatePath(AppRoute.PODCASTS_DETAIL, { itemId: item.id }));
        closeDropdown();
    }, [audiobookshelfServer, closeDropdown, navigate]);
    const handlePodcastEpisodeSelect = useCallback(({ episode, show }) => {
        navigate(generatePath(AppRoute.PODCASTS_DETAIL, { itemId: show.id }));
        if (audiobookshelfServer) {
            recordRecentPodcast(show, audiobookshelfServer.id);
            void podcastActions.play(audiobookshelfServer, show, episode);
        }
        closeDropdown();
    }, [audiobookshelfServer, closeDropdown, navigate, podcastActions]);
    const handleToggleFavorite = useCallback((item, itemType) => {
        setFavorite(item._serverId, [item.id], itemType, !item.userFavorite);
    }, [setFavorite]);
    const handleToggleAudiobookFavorite = useCallback((item) => {
        if (!audiobookshelfServerId)
            return;
        libraryFavoriteActions.toggle('audiobook', audiobookshelfServerId, item.id);
    }, [audiobookshelfServerId, libraryFavoriteActions]);
    const handleTogglePodcastFavorite = useCallback((item) => {
        if (!audiobookshelfServerId)
            return;
        libraryFavoriteActions.toggle('podcast', audiobookshelfServerId, item.id);
    }, [audiobookshelfServerId, libraryFavoriteActions]);
    const rowDeps = useMemo(() => ({
        audiobookFavoriteIds,
        musicServerId: musicServerId ?? null,
        onSelectAlbum: handleAlbumSelect,
        onSelectArtist: handleArtistSelect,
        onSelectAudiobook: handleAudiobookSelect,
        onSelectEpisode: handlePodcastEpisodeSelect,
        onSelectPlaylist: handlePlaylistSelect,
        onSelectPodcastShow: handlePodcastShowSelect,
        onSelectRadio: handleRadioSelect,
        onSelectSong: handleSongSelect,
        onToggleAudiobookFavorite: handleToggleAudiobookFavorite,
        onToggleFavorite: handleToggleFavorite,
        onTogglePodcastFavorite: handleTogglePodcastFavorite,
        podcastFavoriteIds,
    }), [
        audiobookFavoriteIds,
        handleAlbumSelect,
        handleArtistSelect,
        handleAudiobookSelect,
        handlePlaylistSelect,
        handlePodcastEpisodeSelect,
        handlePodcastShowSelect,
        handleRadioSelect,
        handleSongSelect,
        handleToggleAudiobookFavorite,
        handleToggleFavorite,
        handleTogglePodcastFavorite,
        musicServerId,
        podcastFavoriteIds,
    ]);
    const dropdownBody = useMemo(() => {
        if (!debounced) {
            return (_jsxs("div", { className: styles.empty, children: [t('common.search', { postProcess: 'titleCase' }), " \u2014", ' ', t('common.startTyping', {
                        defaultValue: 'start typing to search across your media.',
                    })] }));
        }
        if (!hasAnyResults && !isLoading) {
            return (_jsxs(_Fragment, { children: [_jsx(SourceWarnings, { errors: sourceErrors }), _jsx("div", { className: styles.empty, children: t('common.noResults', {
                            defaultValue: 'No matches.',
                            postProcess: 'sentenceCase',
                        }) })] }));
        }
        return (_jsxs(_Fragment, { children: [_jsx(SourceWarnings, { errors: sourceErrors }), !hasAnyResults && isLoading ? (_jsxs("div", { className: styles.loading, children: [t('common.loading', { postProcess: 'sentenceCase' }), "\u2026"] })) : null, bestMatches.length > 0 ? (_jsx(ResultSection, { title: "Best matches", children: bestMatches.map((entry) => renderRow(entry, rowDeps)) })) : null, groupOrder.map((groupKey) => {
                    const entries = results[groupKey];
                    if (!entries || entries.length === 0)
                        return null;
                    return (_jsx(ResultSection, { title: GROUP_TITLES[groupKey], children: entries.map((entry) => renderRow(entry, rowDeps)) }, groupKey));
                })] }));
    }, [
        bestMatches,
        debounced,
        groupOrder,
        hasAnyResults,
        isLoading,
        results,
        rowDeps,
        sourceErrors,
        t,
    ]);
    return (_jsx("div", { className: `${styles.topBar}${className ? ` ${className}` : ''}`, children: _jsxs("div", { className: styles.chromeGroup, children: [_jsx("button", { "aria-label": t('page.sidebar.home', {
                        defaultValue: 'Home',
                        postProcess: 'titleCase',
                    }), className: styles.homeButton, onClick: handleHomeClick, type: "button", children: _jsx(Icon, { icon: "home", size: "lg" }) }), _jsxs("div", { className: styles.inputWrapper, ref: wrapperRef, children: [_jsx("span", { className: styles.leftIcon, children: _jsx(Icon, { icon: "search", size: "lg" }) }), _jsx("input", { "aria-controls": `${inputId}-results`, "aria-expanded": isOpen, autoComplete: "off", className: styles.input, id: inputId, onChange: (event) => {
                                setQuery(event.currentTarget.value);
                                setIsOpen(true);
                            }, onFocus: handleFocus, onKeyDown: (event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    handleSubmit();
                                }
                            }, placeholder: t('page.sidebar.searchPlaceholder', {
                                defaultValue: 'Search music, audiobooks, podcasts, and radio',
                            }), ref: inputRef, spellCheck: false, type: "text", value: query }), query ? (_jsx("button", { "aria-label": t('common.clear', {
                                defaultValue: 'Clear',
                                postProcess: 'titleCase',
                            }), className: styles.clearButton, onClick: handleClear, type: "button", children: _jsx(Icon, { icon: "x", size: "md" }) })) : null, isOpen ? (_jsx("div", { className: styles.dropdown, id: `${inputId}-results`, role: "listbox", children: dropdownBody })) : null] })] }) }));
};
