import isElectron from 'is-electron';
import { nanoid } from 'nanoid';

import type { SettingsSlice, SettingsState } from './schemas';

import { ArtistItem, HomeItem, type ItemTableListColumnConfig } from './schemas';

import i18n from '/@/i18n/i18n';
import { AppRoute } from '/@/renderer/router/routes';
import { LibraryItem, LyricSource } from '/@/shared/types/domain-types';
import { ItemListKey, Platform, PlayerType, TableColumn } from '/@/shared/types/types';

export const createSettingsMigrate =
    (initialState: SettingsState) => (persistedState: unknown, version: number) => {
        const state = persistedState as SettingsSlice;

        if (version === 8) {
            state.general.sidebarItems = state.general.sidebarItems.filter(
                (item) => item.id !== 'Folders',
            );
            state.general.sidebarItems.push({
                disabled: false,
                id: 'Artists-all',
                label: i18n.t('page.sidebar.artists'),
                route: AppRoute.LIBRARY_ARTISTS,
            });
        }

        if (version <= 9) {
            if (!state.window.releaseChannel) {
                state.window.releaseChannel = initialState.window.releaseChannel;
            }

            if (!state.playback.mediaSession) {
                state.playback.mediaSession = initialState.playback.mediaSession;
            }

            if (!state.general.artistBackgroundBlur) {
                state.general.artistBackgroundBlur = initialState.general.artistBackgroundBlur;
            }

            if (!state.general.artistBackground) {
                state.general.artistBackground = initialState.general.artistBackground;
            }

            state.window.windowBarStyle = Platform.LINUX;

            return state;
        }

        if (version <= 10) {
            state.general.sidebarItems.push({
                disabled: false,
                id: 'Favorites',
                label: i18n.t('page.sidebar.favorites'),
                route: AppRoute.FAVORITES,
            });
        }

        if (version <= 11) {
            return {};
        }

        if (version <= 12) {
            state.general.sidebarItems.push({
                disabled: false,
                id: 'Folders',
                label: i18n.t('page.sidebar.folders'),
                route: AppRoute.LIBRARY_FOLDERS,
            });
        }

        if (version <= 13) {
            state.general.homeItems.push({
                disabled: false,
                id: HomeItem.GENRES,
            });
        }

        if (version <= 14) {
            // Add bitDepth and sampleRate columns to song lists

            const bitDepthColumn: ItemTableListColumnConfig = {
                align: 'center',
                autoSize: false,
                id: TableColumn.BIT_DEPTH,
                isEnabled: false,
                pinned: null,
                width: 100,
            };

            const sampleRateColumn: ItemTableListColumnConfig = {
                align: 'center',
                autoSize: false,
                id: TableColumn.SAMPLE_RATE,
                isEnabled: false,
                pinned: null,
                width: 100,
            };

            const columns = [bitDepthColumn, sampleRateColumn];

            state.lists[LibraryItem.SONG]?.table.columns.push(...columns);
            state.lists[LibraryItem.PLAYLIST_SONG]?.table.columns.push(...columns);
            state.lists[LibraryItem.QUEUE_SONG]?.table.columns.push(...columns);
            state.lists['albumDetail']?.table.columns.push(...columns);
            state.lists['fullscreen']?.table.columns.push(...columns);
            state.lists['sidequeue']?.table.columns.push(...columns);
        }

        if (version <= 15) {
            state.general.sidebarItems.push({
                disabled: false,
                id: 'Radio',
                label: i18n.t('page.sidebar.radio'),
                route: AppRoute.RADIO,
            });
        }

        // Version 16 introduced a bug where the release channel may have been reset
        // to the latest channel. This is to revert it.
        if (version === 16) {
            state.window.releaseChannel = 'beta';
        }

        if (version <= 17) {
            // Migrate lyrics settings from record structure to separate lyrics and lyricsDisplay
            if (state.lyrics && typeof state.lyrics === 'object' && 'default' in state.lyrics) {
                const oldLyrics = state.lyrics as any;
                const defaultSettings = oldLyrics.default || oldLyrics;

                // Extract display settings
                const displaySettings = {
                    fontSize: defaultSettings.fontSize || 24,
                    fontSizeUnsync: defaultSettings.fontSizeUnsync || 24,
                    gap: defaultSettings.gap || 24,
                    gapUnsync: defaultSettings.gapUnsync || 24,
                };

                // Remove display properties from main settings
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { fontSize, fontSizeUnsync, gap, gapUnsync, ...mainSettings } =
                    defaultSettings;

                state.lyrics = mainSettings;
                state.lyricsDisplay = {
                    default: {
                        ...state.lyricsDisplay.default,
                        ...displaySettings,
                    },
                };
            }
        }

        if (version <= 18) {
            // Add isEnabled property to all existing player filters
            if (state.playback?.filters && Array.isArray(state.playback.filters)) {
                state.playback.filters = state.playback.filters.map((filter) => ({
                    ...filter,
                    isEnabled: true,
                }));
            }
        }

        if (version <= 19) {
            // Add IDs to presets that don't have them
            if (
                state.visualizer?.audiomotionanalyzer?.presets &&
                Array.isArray(state.visualizer.audiomotionanalyzer.presets)
            ) {
                state.visualizer.audiomotionanalyzer.presets =
                    state.visualizer.audiomotionanalyzer.presets.map((preset) => {
                        if (!preset.id) {
                            return {
                                ...preset,
                                id: nanoid(),
                            };
                        }
                        return preset;
                    });
            }
        }

        if (version <= 20) {
            // Add TITLE_ARTIST column to SONG and ALBUM table configs
            const titleArtistColumn: ItemTableListColumnConfig = {
                align: 'start',
                autoSize: false,
                id: TableColumn.TITLE_ARTIST,
                isEnabled: false,
                pinned: null,
                width: 300,
            };

            const listKeysToUpdate: (LibraryItem | string)[] = [
                LibraryItem.SONG,
                LibraryItem.ALBUM,
                LibraryItem.PLAYLIST_SONG,
                LibraryItem.QUEUE_SONG,
                ItemListKey.ALBUM_DETAIL,
                ItemListKey.FULL_SCREEN,
                ItemListKey.SIDE_QUEUE,
            ];

            listKeysToUpdate.forEach((listKey) => {
                const listConfig = state.lists[listKey];
                if (listConfig?.table?.columns) {
                    const columns = listConfig.table.columns;
                    const hasTitleArtist = columns.some(
                        (col) => col.id === TableColumn.TITLE_ARTIST,
                    );
                    if (!hasTitleArtist) {
                        const titleCombinedIndex = columns.findIndex(
                            (col) => col.id === TableColumn.TITLE_COMBINED,
                        );
                        if (titleCombinedIndex >= 0) {
                            columns.splice(titleCombinedIndex + 1, 0, titleArtistColumn);
                        } else {
                            columns.push(titleArtistColumn);
                        }
                    }
                }
            });
        }

        if (version <= 21) {
            // Add COMPOSER column to SONG and ALBUM table configs
            const composerColumn: ItemTableListColumnConfig = {
                align: 'start',
                autoSize: false,
                id: TableColumn.COMPOSER,
                isEnabled: false,
                pinned: null,
                width: 300,
            };

            const listKeysToUpdate: (LibraryItem | string)[] = [
                LibraryItem.SONG,
                LibraryItem.ALBUM,
                LibraryItem.PLAYLIST_SONG,
                LibraryItem.QUEUE_SONG,
                ItemListKey.ALBUM_DETAIL,
                ItemListKey.FULL_SCREEN,
                ItemListKey.SIDE_QUEUE,
            ];

            listKeysToUpdate.forEach((listKey) => {
                const listConfig = state.lists[listKey];
                if (listConfig?.table?.columns) {
                    const columns = listConfig.table.columns;
                    const hasComposer = columns.some((col) => col.id === TableColumn.COMPOSER);
                    if (!hasComposer) {
                        const artistIndex = columns.findIndex(
                            (col) => col.id === TableColumn.ARTIST,
                        );
                        if (artistIndex >= 0) {
                            columns.splice(artistIndex + 1, 0, composerColumn);
                        } else {
                            columns.push(composerColumn);
                        }
                    }
                }
            });
        }

        if (version <= 22) {
            // Add enableHeader to all list table configs
            Object.keys(state.lists).forEach((listKey) => {
                const listConfig = state.lists[listKey as keyof typeof state.lists];
                if (
                    listConfig?.table &&
                    typeof listConfig.table === 'object' &&
                    !('enableHeader' in listConfig.table)
                ) {
                    (listConfig.table as any).enableHeader = true;
                }
            });
        }

        if (version <= 23) {
            // Add FAVORITE_SONGS to album artist page configuration
            const hasFavoriteSongs = state.general.artistItems?.some(
                (item) => item.id === ArtistItem.FAVORITE_SONGS,
            );

            if (!hasFavoriteSongs) {
                state.general.artistItems.push({
                    disabled: false,
                    id: ArtistItem.FAVORITE_SONGS,
                });
            }
        }

        if (version <= 26) {
            // Add ALBUM_GROUP column to the song table config
            const listKeysToUpdate: ItemListKey[] = [
                ItemListKey.SONG,
                ItemListKey.FOLDER,
                ItemListKey.PLAYLIST_SONG,
                ItemListKey.ALBUM_ARTIST_SONG,
                ItemListKey.GENRE_SONG,
                ItemListKey.QUEUE_SONG,
                ItemListKey.FULL_SCREEN,
                ItemListKey.SIDE_QUEUE,
            ];

            listKeysToUpdate.forEach((listKey) => {
                const listConfig = state.lists[listKey as keyof typeof state.lists];
                if (listConfig?.table?.columns) {
                    const columns = listConfig.table.columns;
                    const hasAlbumGroup = columns.some((col) => col.id === TableColumn.ALBUM_GROUP);
                    if (!hasAlbumGroup) {
                        columns.push({
                            align: 'start',
                            autoSize: false,
                            id: TableColumn.ALBUM_GROUP,
                            isEnabled: false,
                            pinned: 'left',
                            width: 200,
                        });
                    }
                }
            });
        }

        if (version <= 27) {
            if (!state.general.sideQueueLayout) {
                state.general.sideQueueLayout = initialState.general.sideQueueLayout;
            }
        }

        if (version <= 28) {
            // Reset accent to the new samo default if the user never customised it
            if (state.general.accent === 'rgb(53, 116, 252)') {
                state.general.accent = '#e8d5b0';
            }
        }

        if (version <= 29) {
            // Remove Chinese (NetEase) and SimpMusic providers from lyrics sources
            const removed = ['NetEase', 'SimpMusic'];
            if (Array.isArray(state.lyrics?.sources)) {
                state.lyrics.sources = state.lyrics.sources.filter(
                    (s: string) => !removed.includes(s),
                );
                if (state.lyrics.sources.length === 0) {
                    state.lyrics.sources = [LyricSource.LRCLIB];
                }
            }
            delete (state.lyrics as any)?.enableNeteaseTranslation;
        }

        if (version <= 30) {
            if (typeof state.general.offlineMode !== 'boolean') {
                state.general.offlineMode = initialState.general.offlineMode;
            }
        }

        if (version <= 31) {
            if (
                Array.isArray(state.lyrics?.sources) &&
                state.lyrics.sources.length === 1 &&
                state.lyrics.sources[0] === LyricSource.LRCLIB
            ) {
                state.lyrics.sources = [LyricSource.LRCLIB, LyricSource.SIMPMUSIC];
            }
        }

        if (version <= 32 && isElectron()) {
            state.playback.type = PlayerType.LOCAL;
        }

        if (version <= 33) {
            // Lyrics is LRCLib-only now. Wipe stale Genius / SimpMusic / NetEase
            // entries from `sources`.
            if (state.lyrics) {
                state.lyrics.sources = [LyricSource.LRCLIB];
            }
        }

        if (version <= 33 && !state.playback.castReceiverAppId) {
            state.playback.castReceiverAppId = initialState.playback.castReceiverAppId;
        }

        if (version <= 35) {
            // The font picker UI was removed and the desktop now matches the
            // mobile app (Archivo for body, Office Code Pro for muted subtext).
            // Reset any stale persisted font so the new default actually applies.
            state.font = { ...initialState.font };
        }

        return persistedState;
    };
