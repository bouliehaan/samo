import {
    KeyboardEvent,
    ReactNode,
    useCallback,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { generatePath, useNavigate } from 'react-router';

import styles from './global-search-bar.module.css';

import { ItemImage } from '/@/renderer/components/item-image/item-image';
import { usePlayer } from '/@/renderer/features/player/context/player-context';
import { useRadioControls } from '/@/renderer/features/radio/hooks/use-radio-player';
import { AbsCoverImage } from '/@/renderer/features/search/components/abs-cover-image';
import {
    RankedAlbum,
    RankedArtist,
    RankedAudiobook,
    RankedEpisode,
    RankedPlaylist,
    RankedPodcastShow,
    RankedRadio,
    RankedResult,
    RankedSong,
    ResultGroupKey,
    UnifiedPodcastEpisodeResult,
    type UnifiedSearchSourceKey,
    useUnifiedSearch,
} from '/@/renderer/features/search/hooks/use-unified-search';
import { AppRoute } from '/@/renderer/router/routes';
import {
    recordRecentArtist,
    recordRecentAudiobook,
    recordRecentPlaylist,
    recordRecentPodcast,
    recordRecentSong,
    useAudiobookshelfServer,
    useCurrentServer,
    usePlayButtonBehavior,
} from '/@/renderer/store';
import { useAudiobookActions } from '/@/renderer/store/audiobook.store';
import { usePodcastActions } from '/@/renderer/store/podcast.store';
import {
    AudiobookshelfLibraryItem,
    AudiobookshelfPodcastEpisode,
} from '/@/shared/api/audiobookshelf/audiobookshelf-types';
import { Icon } from '/@/shared/components/icon/icon';
import { useDebouncedValue } from '/@/shared/hooks/use-debounced-value';
import {
    Album,
    AlbumArtist,
    InternetRadioStation,
    LibraryItem,
    Playlist,
    Song,
} from '/@/shared/types/domain-types';

const DEBOUNCE_MS = 200;

type FallbackIcon = 'album' | 'artist' | 'metadata' | 'microphone' | 'playlist' | 'radio' | 'track';

type ResultClickHandler = () => void;

interface ResultRowProps {
    artImageId?: null | string;
    artImageUrl?: null | string;
    artItemType?: LibraryItem;
    artNode?: ReactNode;
    artServerId?: null | string;
    artVariant?: 'circle' | 'square';
    fallbackIcon: FallbackIcon;
    onSelect: ResultClickHandler;
    subtitle?: string;
    tag: string;
    title: string;
}

const ResultRow = ({
    artImageId,
    artImageUrl,
    artItemType,
    artNode,
    artServerId,
    artVariant = 'square',
    fallbackIcon,
    onSelect,
    subtitle,
    tag,
    title,
}: ResultRowProps) => {
    const showImage = Boolean((artImageId || artImageUrl) && artItemType);

    return (
        <button
            className={styles.row}
            onClick={onSelect}
            onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect();
                }
            }}
            type="button"
        >
            <div
                className={`${styles.rowArt}${
                    artVariant === 'circle' ? ` ${styles.rowArtCircle}` : ''
                }`}
            >
                {artNode ? (
                    artNode
                ) : showImage ? (
                    <ItemImage
                        alt={title}
                        height={40}
                        id={artImageId ?? null}
                        itemType={artItemType!}
                        loading="lazy"
                        serverId={artServerId ?? null}
                        src={artImageUrl ?? null}
                        type="itemCard"
                        width={40}
                    />
                ) : (
                    <Icon icon={fallbackIcon} size="lg" />
                )}
            </div>
            <div className={styles.rowText}>
                <span className={styles.rowTitle}>{title}</span>
                {subtitle ? <span className={styles.rowSubtitle}>{subtitle}</span> : null}
            </div>
            <span className={styles.rowTag}>{tag}</span>
        </button>
    );
};

interface ResultSectionProps {
    children: ReactNode;
    title: string;
}

const ResultSection = ({ children, title }: ResultSectionProps) => (
    <div className={styles.section}>
        <div className={styles.sectionHeader}>{title}</div>
        {children}
    </div>
);

const getAbsTitle = (item: AudiobookshelfLibraryItem) =>
    item.media?.metadata?.title ?? item.name ?? 'Untitled';

const getAbsAuthor = (item: AudiobookshelfLibraryItem) => {
    const meta = item.media?.metadata;
    return meta?.author ?? meta?.authors?.map((author) => author.name).join(', ') ?? '';
};

const getEpisodeSubtitle = (
    show: AudiobookshelfLibraryItem,
    episode: AudiobookshelfPodcastEpisode,
) => {
    const showTitle = getAbsTitle(show);
    if (episode.season) return `${showTitle} · S${episode.season}`;
    return showTitle;
};

const GROUP_TITLES: Record<ResultGroupKey, string> = {
    albums: 'Albums',
    artists: 'Artists',
    audiobooks: 'Audiobooks',
    episodes: 'Episodes',
    playlists: 'Playlists',
    podcastShows: 'Podcasts',
    radioStations: 'Radio',
    songs: 'Tracks',
};

const SOURCE_WARNING_LABELS: Record<UnifiedSearchSourceKey, string> = {
    abs: 'Audiobookshelf',
    music: 'Music',
    playlists: 'Playlists',
    radio: 'Radio',
};

interface GlobalSearchBarProps {
    className?: string;
}

interface RowFactoryDeps {
    musicServerId?: null | string;
    onSelectAlbum: (album: Album) => void;
    onSelectArtist: (artist: AlbumArtist) => void;
    onSelectAudiobook: (item: AudiobookshelfLibraryItem) => void;
    onSelectEpisode: (result: UnifiedPodcastEpisodeResult) => void;
    onSelectPlaylist: (playlist: Playlist) => void;
    onSelectPodcastShow: (item: AudiobookshelfLibraryItem) => void;
    onSelectRadio: (station: InternetRadioStation) => void;
    onSelectSong: (song: Song) => void;
}

const renderRow = (entry: RankedResult, deps: RowFactoryDeps): ReactNode => {
    switch (entry.kind) {
        case 'album': {
            const { album } = entry as RankedAlbum;
            return (
                <ResultRow
                    artImageId={album.imageId}
                    artImageUrl={album.imageUrl}
                    artItemType={LibraryItem.ALBUM}
                    artServerId={album._serverId}
                    fallbackIcon="album"
                    key={`album-${album.id}`}
                    onSelect={() => deps.onSelectAlbum(album)}
                    subtitle={album.albumArtistName || undefined}
                    tag="Album"
                    title={album.name}
                />
            );
        }
        case 'artist': {
            const { artist } = entry as RankedArtist;
            return (
                <ResultRow
                    artImageId={artist.imageId}
                    artImageUrl={artist.imageUrl}
                    artItemType={LibraryItem.ALBUM_ARTIST}
                    artServerId={artist._serverId}
                    artVariant="circle"
                    fallbackIcon="artist"
                    key={`artist-${artist.id}`}
                    onSelect={() => deps.onSelectArtist(artist)}
                    tag="Artist"
                    title={artist.name}
                />
            );
        }
        case 'audiobook': {
            const { item } = entry as RankedAudiobook;
            return (
                <ResultRow
                    artNode={
                        <AbsCoverImage
                            alt={getAbsTitle(item)}
                            fallbackIcon="metadata"
                            itemId={item.id}
                        />
                    }
                    fallbackIcon="metadata"
                    key={`audiobook-${item.id}`}
                    onSelect={() => deps.onSelectAudiobook(item)}
                    subtitle={getAbsAuthor(item) || undefined}
                    tag="Audiobook"
                    title={getAbsTitle(item)}
                />
            );
        }
        case 'episode': {
            const { episode } = entry as RankedEpisode;
            return (
                <ResultRow
                    artNode={
                        <AbsCoverImage
                            alt={episode.episode.title ?? getAbsTitle(episode.show)}
                            fallbackIcon="microphone"
                            itemId={episode.show.id}
                        />
                    }
                    fallbackIcon="microphone"
                    key={`episode-${episode.show.id}-${episode.episode.id}`}
                    onSelect={() => deps.onSelectEpisode(episode)}
                    subtitle={getEpisodeSubtitle(episode.show, episode.episode)}
                    tag="Episode"
                    title={episode.episode.title ?? 'Untitled episode'}
                />
            );
        }
        case 'playlist': {
            const { playlist } = entry as RankedPlaylist;
            return (
                <ResultRow
                    artImageId={playlist.imageId}
                    artImageUrl={playlist.imageUrl}
                    artItemType={LibraryItem.PLAYLIST}
                    artServerId={playlist._serverId}
                    fallbackIcon="playlist"
                    key={`playlist-${playlist.id}`}
                    onSelect={() => deps.onSelectPlaylist(playlist)}
                    subtitle={playlist.owner ?? undefined}
                    tag="Playlist"
                    title={playlist.name}
                />
            );
        }
        case 'podcastShow': {
            const { item } = entry as RankedPodcastShow;
            return (
                <ResultRow
                    artNode={
                        <AbsCoverImage
                            alt={getAbsTitle(item)}
                            fallbackIcon="microphone"
                            itemId={item.id}
                        />
                    }
                    fallbackIcon="microphone"
                    key={`podcast-${item.id}`}
                    onSelect={() => deps.onSelectPodcastShow(item)}
                    subtitle={getAbsAuthor(item) || undefined}
                    tag="Podcast"
                    title={getAbsTitle(item)}
                />
            );
        }
        case 'radio': {
            const { station } = entry as RankedRadio;
            return (
                <ResultRow
                    artImageUrl={station.imageUrl}
                    artItemType={LibraryItem.RADIO_STATION}
                    artServerId={deps.musicServerId ?? null}
                    fallbackIcon="radio"
                    key={`radio-${station.id}`}
                    onSelect={() => deps.onSelectRadio(station)}
                    tag="Radio"
                    title={station.name}
                />
            );
        }
        case 'song': {
            const { song } = entry as RankedSong;
            return (
                <ResultRow
                    artImageId={song.imageId}
                    artImageUrl={song.imageUrl}
                    artItemType={LibraryItem.SONG}
                    artServerId={song._serverId}
                    fallbackIcon="track"
                    key={`song-${song.id}`}
                    onSelect={() => deps.onSelectSong(song)}
                    subtitle={song.artistName ?? song.album ?? undefined}
                    tag="Track"
                    title={song.name}
                />
            );
        }
        default:
            return null;
    }
};

interface SourceWarningsProps {
    errors: Partial<Record<UnifiedSearchSourceKey, string>>;
}

const SourceWarnings = ({ errors }: SourceWarningsProps) => {
    const sourceKeys = Object.keys(SOURCE_WARNING_LABELS) as UnifiedSearchSourceKey[];
    const activeWarnings = sourceKeys.filter((sourceKey) => errors[sourceKey]);

    if (activeWarnings.length === 0) return null;

    return (
        <div className={styles.warningList}>
            {activeWarnings.map((sourceKey) => (
                <div className={styles.sourceWarning} key={sourceKey}>
                    <Icon icon="warn" size="sm" />
                    <span>
                        {SOURCE_WARNING_LABELS[sourceKey]} unavailable: {errors[sourceKey]}
                    </span>
                </div>
            ))}
        </div>
    );
};

export const GlobalSearchBar = ({ className }: GlobalSearchBarProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const inputId = useId();

    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [debouncedQuery] = useDebouncedValue(query, DEBOUNCE_MS);
    const debounced = (debouncedQuery ?? '').trim();

    const { bestMatches, groupOrder, hasAnyResults, isLoading, results, sourceErrors } =
        useUnifiedSearch(debounced);

    const player = usePlayer();
    const playButtonBehavior = usePlayButtonBehavior();
    const musicServer = useCurrentServer();
    const musicServerId = musicServer?.id;
    const audiobookshelfServer = useAudiobookshelfServer();
    const audiobookActions = useAudiobookActions();
    const podcastActions = usePodcastActions();
    const radioControls = useRadioControls();

    const closeDropdown = useCallback(() => setIsOpen(false), []);

    useEffect(() => {
        if (!isOpen) return undefined;
        const handlePointerDown = (event: MouseEvent) => {
            if (!wrapperRef.current) return;
            if (!wrapperRef.current.contains(event.target as Node)) {
                closeDropdown();
            }
        };
        const handleKeyDown = (event: globalThis.KeyboardEvent) => {
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
        if (!trimmed) return;
        const searchPath = generatePath(AppRoute.SEARCH, { itemType: LibraryItem.SONG });
        navigate(`${searchPath}?query=${encodeURIComponent(trimmed)}`);
        closeDropdown();
    }, [closeDropdown, navigate, query]);

    const handleHomeClick = useCallback(() => {
        navigate(AppRoute.HOME);
        closeDropdown();
    }, [closeDropdown, navigate]);

    const handleSongSelect = useCallback(
        (song: Song) => {
            recordRecentSong(song);
            player.addToQueueByData([song], playButtonBehavior);
            closeDropdown();
        },
        [closeDropdown, playButtonBehavior, player],
    );

    const handleAlbumSelect = useCallback(
        (album: Album) => {
            navigate(generatePath(AppRoute.LIBRARY_ALBUMS_DETAIL, { albumId: album.id }));
            closeDropdown();
        },
        [closeDropdown, navigate],
    );

    const handleArtistSelect = useCallback(
        (artist: AlbumArtist) => {
            recordRecentArtist(artist);
            navigate(
                generatePath(AppRoute.LIBRARY_ALBUM_ARTISTS_DETAIL, {
                    albumArtistId: artist.id,
                }),
            );
            closeDropdown();
        },
        [closeDropdown, navigate],
    );

    const handlePlaylistSelect = useCallback(
        (playlist: Playlist) => {
            recordRecentPlaylist(playlist);
            navigate(generatePath(AppRoute.PLAYLISTS_DETAIL_SONGS, { playlistId: playlist.id }));
            closeDropdown();
        },
        [closeDropdown, navigate],
    );

    const handleRadioSelect = useCallback(
        (station: InternetRadioStation) => {
            if (!musicServerId) return;
            radioControls.play(station.streamUrl, station.name, {
                id: station.id,
                imageId: station.imageId,
                imageUrl: station.imageUrl,
                serverId: musicServerId,
            });
            closeDropdown();
        },
        [closeDropdown, musicServerId, radioControls],
    );

    const handleAudiobookSelect = useCallback(
        (item: AudiobookshelfLibraryItem) => {
            if (!audiobookshelfServer) return;
            recordRecentAudiobook(item, audiobookshelfServer.id);
            audiobookActions.play(audiobookshelfServer, item);
            closeDropdown();
        },
        [audiobookActions, audiobookshelfServer, closeDropdown],
    );

    const handlePodcastShowSelect = useCallback(
        (item: AudiobookshelfLibraryItem) => {
            if (audiobookshelfServer) {
                recordRecentPodcast(item, audiobookshelfServer.id);
            }
            navigate(generatePath(AppRoute.PODCASTS_DETAIL, { itemId: item.id }));
            closeDropdown();
        },
        [audiobookshelfServer, closeDropdown, navigate],
    );

    const handlePodcastEpisodeSelect = useCallback(
        ({ episode, show }: UnifiedPodcastEpisodeResult) => {
            navigate(generatePath(AppRoute.PODCASTS_DETAIL, { itemId: show.id }));
            if (audiobookshelfServer) {
                recordRecentPodcast(show, audiobookshelfServer.id);
                void podcastActions.play(audiobookshelfServer, show, episode);
            }
            closeDropdown();
        },
        [audiobookshelfServer, closeDropdown, navigate, podcastActions],
    );

    const rowDeps: RowFactoryDeps = useMemo(
        () => ({
            musicServerId: musicServerId ?? null,
            onSelectAlbum: handleAlbumSelect,
            onSelectArtist: handleArtistSelect,
            onSelectAudiobook: handleAudiobookSelect,
            onSelectEpisode: handlePodcastEpisodeSelect,
            onSelectPlaylist: handlePlaylistSelect,
            onSelectPodcastShow: handlePodcastShowSelect,
            onSelectRadio: handleRadioSelect,
            onSelectSong: handleSongSelect,
        }),
        [
            handleAlbumSelect,
            handleArtistSelect,
            handleAudiobookSelect,
            handlePlaylistSelect,
            handlePodcastEpisodeSelect,
            handlePodcastShowSelect,
            handleRadioSelect,
            handleSongSelect,
            musicServerId,
        ],
    );

    const dropdownBody = useMemo(() => {
        if (!debounced) {
            return (
                <div className={styles.empty}>
                    {t('common.search', { postProcess: 'titleCase' })} —{' '}
                    {t('common.startTyping', {
                        defaultValue: 'start typing to search across your media.',
                    })}
                </div>
            );
        }
        if (!hasAnyResults && !isLoading) {
            return (
                <>
                    <SourceWarnings errors={sourceErrors} />
                    <div className={styles.empty}>
                        {t('common.noResults', {
                            defaultValue: 'No matches.',
                            postProcess: 'sentenceCase',
                        })}
                    </div>
                </>
            );
        }

        return (
            <>
                <SourceWarnings errors={sourceErrors} />

                {!hasAnyResults && isLoading ? (
                    <div className={styles.loading}>
                        {t('common.loading', { postProcess: 'sentenceCase' })}…
                    </div>
                ) : null}

                {bestMatches.length > 0 ? (
                    <ResultSection title="Best matches">
                        {bestMatches.map((entry) => renderRow(entry, rowDeps))}
                    </ResultSection>
                ) : null}

                {groupOrder.map((groupKey) => {
                    const entries = results[groupKey];
                    if (!entries || entries.length === 0) return null;
                    return (
                        <ResultSection key={groupKey} title={GROUP_TITLES[groupKey]}>
                            {entries.map((entry: RankedResult) => renderRow(entry, rowDeps))}
                        </ResultSection>
                    );
                })}
            </>
        );
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

    return (
        <div className={`${styles.topBar}${className ? ` ${className}` : ''}`}>
            <div className={styles.chromeGroup}>
                <button
                    aria-label={t('page.sidebar.home', {
                        defaultValue: 'Home',
                        postProcess: 'titleCase',
                    })}
                    className={styles.homeButton}
                    onClick={handleHomeClick}
                    type="button"
                >
                    <Icon icon="home" size="lg" />
                </button>
                <div className={styles.inputWrapper} ref={wrapperRef}>
                    <span className={styles.leftIcon}>
                        <Icon icon="search" size="lg" />
                    </span>
                    <input
                        aria-controls={`${inputId}-results`}
                        aria-expanded={isOpen}
                        autoComplete="off"
                        className={styles.input}
                        id={inputId}
                        onChange={(event) => {
                            setQuery(event.currentTarget.value);
                            setIsOpen(true);
                        }}
                        onFocus={handleFocus}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                handleSubmit();
                            }
                        }}
                        placeholder={t('page.sidebar.searchPlaceholder', {
                            defaultValue: 'Search music, audiobooks, podcasts, and radio',
                        })}
                        ref={inputRef}
                        spellCheck={false}
                        type="text"
                        value={query}
                    />
                    {query ? (
                        <button
                            aria-label={t('common.clear', {
                                defaultValue: 'Clear',
                                postProcess: 'titleCase',
                            })}
                            className={styles.clearButton}
                            onClick={handleClear}
                            type="button"
                        >
                            <Icon icon="x" size="md" />
                        </button>
                    ) : null}
                    {isOpen ? (
                        <div className={styles.dropdown} id={`${inputId}-results`} role="listbox">
                            {dropdownBody}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
