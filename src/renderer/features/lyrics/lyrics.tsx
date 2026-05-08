import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import styles from './lyrics.module.css';

import { translateLyrics } from '/@/renderer/features/lyrics/api/lyric-translate';
import { clearLyricsCacheForSong, lyricsQueries } from '/@/renderer/features/lyrics/api/lyrics-api';
import { openLyricsExportModal } from '/@/renderer/features/lyrics/components/lyrics-export-form';
import { openLyricSearchModal } from '/@/renderer/features/lyrics/components/lyrics-search-form';
import { LyricsContextMenu } from '/@/renderer/features/lyrics/lyrics-context-menu';
import { SynchronizedLyrics } from '/@/renderer/features/lyrics/synchronized-lyrics';
import { UnsynchronizedLyrics } from '/@/renderer/features/lyrics/unsynchronized-lyrics';
import { openLyricsSettingsModal } from '/@/renderer/features/lyrics/utils/open-lyrics-settings-modal';
import { usePlayerEvents } from '/@/renderer/features/player/audio-player/hooks/use-player-events';
import { useIsRadioActive } from '/@/renderer/features/radio/hooks/use-radio-player';
import { ComponentErrorBoundary } from '/@/renderer/features/shared/components/component-error-boundary';
import { useLyricsSettings, useOfflineMode, usePlayerSong } from '/@/renderer/store';
import {
    lyricsKey,
    useLyricsOverrideEntry,
    useLyricsOverridesActions,
} from '/@/renderer/store/lyrics-overrides.store';
import { usePlaybackSource } from '/@/renderer/store/playback-owner.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Spinner } from '/@/shared/components/spinner/spinner';
import {
    FullLyricsMetadata,
    LyricSource,
    LyricsOverride,
    StructuredLyric,
    SynchronizedLyricsArray,
} from '/@/shared/types/domain-types';

type LyricsProps = {
    settingsKey?: string;
};

type ResolvedLyrics = {
    isOverride: boolean;
    languageIndex: number;
    languages: null | { label: string; value: string }[];
    lines: null | SynchronizedLyricsArray;
    metadata: FullLyricsMetadata | null;
    offsetMs: number;
    plain: null | string;
};

const empty: ResolvedLyrics = {
    isOverride: false,
    languageIndex: 0,
    languages: null,
    lines: null,
    metadata: null,
    offsetMs: 0,
    plain: null,
};

export const Lyrics = ({ settingsKey = 'default' }: LyricsProps) => {
    const currentSong = usePlayerSong();
    const isRadioActive = useIsRadioActive();
    const playbackSource = usePlaybackSource();
    const offlineMode = useOfflineMode();
    const settings = useLyricsSettings();

    const isLyricsDisabled =
        isRadioActive || playbackSource === 'audiobook' || playbackSource === 'podcast';

    const songKey = lyricsKey(currentSong?._serverId, currentSong?.id);
    const overrideEntry = useLyricsOverrideEntry(songKey);
    const overrideActions = useLyricsOverridesActions();

    const [translatedLyrics, setTranslatedLyrics] = useState<null | string>(null);
    const [showTranslation, setShowTranslation] = useState(false);

    const { data, isLoading } = useQuery(
        lyricsQueries.songLyrics(
            {
                options: {
                    enabled: !!currentSong?.id && !isLyricsDisabled && !overrideEntry?.suppressed,
                },
                query: { songId: currentSong?.id || '' },
                serverId: currentSong?._serverId || '',
            },
            currentSong,
        ),
    );

    const overrideRef = overrideEntry?.override;
    const { data: overrideData, isLoading: overrideLoading } = useQuery(
        lyricsQueries.songLyricsByRemoteId({
            options: {
                enabled: !!overrideRef && !isLyricsDisabled && !!currentSong?.id,
            },
            query: {
                remoteSongId: overrideRef?.id,
                remoteSource: overrideRef?.source as LyricSource | undefined,
                song: currentSong,
            },
            serverId: currentSong?._serverId || '',
        }),
    );

    const resolved = useMemo<ResolvedLyrics>(() => {
        if (isLyricsDisabled || overrideEntry?.suppressed) return empty;

        const fallbackOffset = overrideEntry?.offsetMs ?? settings.delayMs ?? 0;

        // 1. User-picked override lyrics
        if (overrideRef && overrideData) {
            const meta: FullLyricsMetadata = {
                artist: overrideRef.artist,
                lyrics: overrideData,
                name: overrideRef.name,
                offsetMs: 0,
                remote: true,
                source: overrideRef.source,
            };
            return {
                isOverride: true,
                languageIndex: 0,
                languages: null,
                lines: Array.isArray(overrideData) ? overrideData : null,
                metadata: meta,
                offsetMs: fallbackOffset,
                plain: typeof overrideData === 'string' ? overrideData : null,
            };
        }

        if (!data) return empty;

        const pickStructured = (local: StructuredLyric[]): ResolvedLyrics => {
            const idx = Math.min(
                Math.max(0, overrideEntry?.structuredIndex ?? 0),
                local.length - 1,
            );
            const item = local[idx];
            return {
                isOverride: false,
                languageIndex: idx,
                languages: local.map((l, i) => ({
                    label: l.lang || `Language ${i + 1}`,
                    value: i.toString(),
                })),
                lines: item.synced ? item.lyrics : null,
                metadata: item,
                offsetMs: overrideEntry?.offsetMs ?? item.offsetMs ?? settings.delayMs ?? 0,
                plain: item.synced ? null : item.lyrics,
            };
        };

        const pickSingleLocal = (local: FullLyricsMetadata): ResolvedLyrics => ({
            isOverride: false,
            languageIndex: 0,
            languages: null,
            lines: Array.isArray(local.lyrics) ? local.lyrics : null,
            metadata: local,
            offsetMs: overrideEntry?.offsetMs ?? local.offsetMs ?? settings.delayMs ?? 0,
            plain: typeof local.lyrics === 'string' ? local.lyrics : null,
        });

        const pickRemote = (remote: FullLyricsMetadata): ResolvedLyrics => ({
            isOverride: false,
            languageIndex: 0,
            languages: null,
            lines: Array.isArray(remote.lyrics) ? remote.lyrics : null,
            metadata: remote,
            offsetMs: overrideEntry?.offsetMs ?? remote.offsetMs ?? settings.delayMs ?? 0,
            plain: typeof remote.lyrics === 'string' ? remote.lyrics : null,
        });

        const localStructured =
            Array.isArray(data.local) && data.local.length > 0 ? data.local : null;
        const localSingle =
            data.local && !Array.isArray(data.local) && 'lyrics' in data.local ? data.local : null;
        const remote = data.remoteAuto;

        if (settings.preferLocalLyrics) {
            if (localStructured) return pickStructured(localStructured);
            if (localSingle) return pickSingleLocal(localSingle);
            if (remote) return pickRemote(remote);
        } else {
            if (remote) return pickRemote(remote);
            if (localStructured) return pickStructured(localStructured);
            if (localSingle) return pickSingleLocal(localSingle);
        }

        return empty;
    }, [
        data,
        isLyricsDisabled,
        overrideData,
        overrideEntry?.offsetMs,
        overrideEntry?.structuredIndex,
        overrideEntry?.suppressed,
        overrideRef,
        settings.delayMs,
        settings.preferLocalLyrics,
    ]);

    // Reset translation cache when the song changes
    usePlayerEvents(
        {
            onCurrentSongChange: () => {
                setShowTranslation(false);
                setTranslatedLyrics(null);
            },
        },
        [],
    );

    const fetchTranslation = useCallback(async () => {
        if (!resolved.metadata || !resolved.lines || isLyricsDisabled || offlineMode) return;
        const original = resolved.lines.map(([, line]) => line).join('\n');
        const translated = await translateLyrics(
            original,
            settings.translationApiKey,
            settings.translationApiProvider,
            settings.translationTargetLanguage,
        );
        setTranslatedLyrics(translated);
        setShowTranslation(true);
    }, [
        isLyricsDisabled,
        offlineMode,
        resolved.lines,
        resolved.metadata,
        settings.translationApiKey,
        settings.translationApiProvider,
        settings.translationTargetLanguage,
    ]);

    useEffect(() => {
        if (resolved.lines && !translatedLyrics && settings.enableAutoTranslation) {
            fetchTranslation();
        }
    }, [resolved.lines, translatedLyrics, settings.enableAutoTranslation, fetchTranslation]);

    const handleAdjustOffset = useCallback(
        (deltaMs: number) => {
            if (!songKey) return;
            const next = resolved.offsetMs + deltaMs;
            overrideActions.setOffset(songKey, next);
        },
        [overrideActions, resolved.offsetMs, songKey],
    );

    const handleResetOffset = useCallback(() => {
        if (!songKey) return;
        overrideActions.clearOffset(songKey);
    }, [overrideActions, songKey]);

    const handleSearchOverride = useCallback(() => {
        if (!currentSong) return;
        openLyricSearchModal({
            artist: currentSong.artistName,
            name: currentSong.name,
            onSearchOverride: (params: LyricsOverride) => {
                if (!songKey) return;
                overrideActions.setOverride(songKey, params);
            },
        });
    }, [currentSong, overrideActions, songKey]);

    const handleClearOverride = useCallback(() => {
        if (!songKey) return;
        overrideActions.clearOverride(songKey);
    }, [overrideActions, songKey]);

    const handleSuppress = useCallback(async () => {
        if (!songKey || !currentSong) return;
        overrideActions.suppress(songKey);
        await clearLyricsCacheForSong(currentSong);
    }, [currentSong, overrideActions, songKey]);

    const handlePickLanguage = useCallback(
        (idx: number) => {
            if (!songKey) return;
            overrideActions.setStructuredIndex(songKey, idx);
        },
        [overrideActions, songKey],
    );

    const handleToggleTranslation = useCallback(async () => {
        if (translatedLyrics) {
            setShowTranslation((v) => !v);
            return;
        }
        await fetchTranslation();
    }, [translatedLyrics, fetchTranslation]);

    const handleExport = useCallback(() => {
        if (!resolved.metadata) return;
        openLyricsExportModal({
            lyrics: resolved.metadata,
            offsetMs: resolved.offsetMs,
            synced: !!resolved.lines,
        });
    }, [resolved]);

    const handleOpenSettings = () => openLyricsSettingsModal(settingsKey);

    const isWaitingForOverride = !!overrideRef && overrideLoading;
    const isStillLoading = (isLoading || isWaitingForOverride) && !isLyricsDisabled;
    const hasContent = !!resolved.lines || !!resolved.plain;

    return (
        <ComponentErrorBoundary>
            <div className={styles.lyricsContainer}>
                <ActionIcon
                    className={styles.settingsIcon}
                    icon="settings2"
                    iconProps={{ size: 'lg' }}
                    onClick={handleOpenSettings}
                    pos="absolute"
                    right={0}
                    top={0}
                    variant="subtle"
                />
                {isStillLoading ? (
                    <Spinner container />
                ) : (
                    <AnimatePresence mode="sync">
                        {hasContent && resolved.metadata && (
                            <motion.div
                                animate={{ opacity: 1 }}
                                className={styles.scrollContainer}
                                initial={{ opacity: 0 }}
                                key={`${currentSong?.id ?? 'none'}:${resolved.languageIndex}:${resolved.isOverride ? 'override' : 'auto'}`}
                                transition={{ duration: 0.4 }}
                            >
                                <LyricsContextMenu
                                    canExport={hasContent}
                                    canSearch={!offlineMode}
                                    canTranslate={
                                        !!settings.translationApiKey &&
                                        !!settings.translationApiProvider &&
                                        !!resolved.lines &&
                                        !offlineMode
                                    }
                                    hasOffset={resolved.offsetMs !== 0}
                                    hasOverride={resolved.isOverride}
                                    isShowingTranslation={showTranslation && !!translatedLyrics}
                                    languages={resolved.languages}
                                    onAdjustOffset={handleAdjustOffset}
                                    onClearOverride={handleClearOverride}
                                    onExport={handleExport}
                                    onPickLanguage={handlePickLanguage}
                                    onResetOffset={handleResetOffset}
                                    onSearchOverride={handleSearchOverride}
                                    onSuppress={handleSuppress}
                                    onToggleTranslation={handleToggleTranslation}
                                    selectedLanguage={resolved.languageIndex}
                                >
                                    {resolved.lines ? (
                                        <SynchronizedLyrics
                                            artist={resolved.metadata.artist}
                                            lyrics={resolved.lines}
                                            name={resolved.metadata.name}
                                            offsetMs={resolved.offsetMs}
                                            remote={resolved.metadata.remote}
                                            settingsKey={settingsKey}
                                            source={resolved.metadata.source}
                                            translatedLyrics={
                                                showTranslation ? translatedLyrics : null
                                            }
                                        />
                                    ) : (
                                        <UnsynchronizedLyrics
                                            artist={resolved.metadata.artist}
                                            lyrics={resolved.plain ?? ''}
                                            name={resolved.metadata.name}
                                            remote={resolved.metadata.remote}
                                            settingsKey={settingsKey}
                                            source={resolved.metadata.source}
                                            translatedLyrics={
                                                showTranslation ? translatedLyrics : null
                                            }
                                        />
                                    )}
                                </LyricsContextMenu>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>
        </ComponentErrorBoundary>
    );
};
