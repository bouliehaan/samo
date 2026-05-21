import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { closeAllModals, openModal } from '@mantine/modals';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import orderBy from 'lodash/orderBy';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './lyrics-search-form.module.css';
import i18n from '/@/i18n/i18n';
import { lyricsQueries } from '/@/renderer/features/lyrics/api/lyrics-api';
import { openLyricsExportModal } from '/@/renderer/features/lyrics/components/lyrics-export-form';
import { SynchronizedLyrics, } from '/@/renderer/features/lyrics/synchronized-lyrics';
import { UnsynchronizedLyrics, } from '/@/renderer/features/lyrics/unsynchronized-lyrics';
import { usePlayerSong } from '/@/renderer/store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Button } from '/@/shared/components/button/button';
import { Center } from '/@/shared/components/center/center';
import { Divider } from '/@/shared/components/divider/divider';
import { Group } from '/@/shared/components/group/group';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { Spinner } from '/@/shared/components/spinner/spinner';
import { Stack } from '/@/shared/components/stack/stack';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { Text } from '/@/shared/components/text/text';
import { useDebouncedValue } from '/@/shared/hooks/use-debounced-value';
import { useForm } from '/@/shared/hooks/use-form';
const SearchResult = ({ data, isSelected, onClick }) => {
    const { t } = useTranslation();
    const { artist, id, isSync, name, score, source } = data;
    const percentageScore = useMemo(() => {
        if (!score)
            return 0;
        return ((1 - score) * 100).toFixed(2);
    }, [score]);
    const cleanId = id;
    const syncStatus = useMemo(() => {
        if (isSync === true) {
            return t('page.fullscreenPlayer.config.synchronized', {
                postProcess: 'sentenceCase',
            });
        }
        if (isSync === false) {
            return t('page.fullscreenPlayer.config.unsynchronized', {
                postProcess: 'sentenceCase',
            });
        }
        return t('common.unknown', { postProcess: 'titleCase' });
    }, [isSync, t]);
    return (_jsx("button", { className: clsx(styles.searchItem, {
            [styles.selected]: isSelected,
        }), onClick: onClick, children: _jsxs(Group, { justify: "space-between", wrap: "nowrap", children: [_jsxs(Stack, { gap: 0, maw: "65%", children: [_jsx(Text, { fw: 600, size: "md", children: name }), _jsx(Text, { isMuted: true, children: artist }), _jsx(Group, { gap: "sm", wrap: "nowrap", children: _jsx(Text, { isMuted: true, size: "sm", children: [source, cleanId, syncStatus].join(' — ') }) })] }), _jsxs(Text, { children: [percentageScore, "%"] })] }) }));
};
export const LyricsSearchForm = ({ artist, name, onSearchOverride }) => {
    const { t } = useTranslation();
    const currentSong = usePlayerSong();
    const [selectedResult, setSelectedResult] = useState(null);
    const form = useForm({
        initialValues: {
            artist: artist || '',
            name: name || '',
        },
    });
    const [debouncedArtist] = useDebouncedValue(form.values.artist, 500);
    const [debouncedName] = useDebouncedValue(form.values.name, 500);
    const { data, isLoading } = useQuery(lyricsQueries.search({
        query: { artist: debouncedArtist, name: debouncedName },
    }));
    const { data: previewData, isLoading: isPreviewLoading } = useQuery(lyricsQueries.songLyricsByRemoteId({
        options: {
            enabled: !!selectedResult,
        },
        query: {
            remoteSongId: selectedResult?.id,
            remoteSource: selectedResult?.source,
            song: currentSong,
        },
        serverId: currentSong?._serverId || '',
    }));
    const searchResults = useMemo(() => {
        if (!data)
            return [];
        const results = [];
        Object.keys(data).forEach((key) => {
            (data[key] || []).forEach((result) => results.push(result));
        });
        const scoredResults = orderBy(results, ['score'], ['asc']);
        return scoredResults;
    }, [data]);
    const handleApply = () => {
        if (selectedResult && onSearchOverride) {
            onSearchOverride({
                artist: selectedResult.artist,
                id: selectedResult.id,
                name: selectedResult.name,
                remote: true,
                source: selectedResult.source,
            });
            closeAllModals();
        }
    };
    const handleExport = () => {
        if (selectedResult && previewData) {
            const lyricsMetadata = {
                artist: selectedResult.artist,
                lyrics: previewData,
                name: selectedResult.name,
                offsetMs: 0,
                remote: true,
                source: selectedResult.source,
            };
            const synced = Array.isArray(previewData);
            openLyricsExportModal({ lyrics: lyricsMetadata, offsetMs: 0, synced });
        }
    };
    return (_jsxs(Stack, { h: "100%", w: "100%", children: [_jsx("form", { children: _jsxs(Group, { grow: true, children: [_jsx(TextInput, { "data-autofocus": true, label: t('form.lyricSearch.input', {
                                context: 'name',
                                postProcess: 'titleCase',
                            }), rightSection: form.values.name ? (_jsx(ActionIcon, { icon: "x", onClick: () => form.setFieldValue('name', ''), size: "sm", variant: "transparent" })) : null, ...form.getInputProps('name') }), _jsx(TextInput, { label: t('form.lyricSearch.input', {
                                context: 'artist',
                                postProcess: 'titleCase',
                            }), rightSection: form.values.artist ? (_jsx(ActionIcon, { icon: "x", onClick: () => form.setFieldValue('artist', ''), size: "sm", variant: "transparent" })) : null, ...form.getInputProps('artist') })] }) }), _jsx(Divider, {}), _jsxs(Group, { align: "flex-start", grow: true, style: { flex: 1, minHeight: 0, overflow: 'hidden' }, children: [_jsx(Stack, { style: { flex: 1, height: '100%', minHeight: 0, overflow: 'hidden' }, children: _jsx(ScrollArea, { style: {
                                height: '100%',
                                paddingRight: '1rem',
                            }, children: isLoading ? (_jsx(Spinner, { container: true })) : (_jsx(Stack, { gap: "md", children: searchResults.map((result) => (_jsx(SearchResult, { data: result, isSelected: selectedResult?.id === result.id &&
                                        selectedResult?.source === result.source, onClick: () => setSelectedResult(result) }, `${result.source}-${result.id}`))) })) }) }), selectedResult && (_jsx(Stack, { style: { flex: 1, height: '100%', minHeight: 0, overflow: 'hidden' }, children: _jsx(ScrollArea, { className: styles['lyrics-preview'], style: {
                                height: '100%',
                                paddingRight: '1rem',
                            }, children: isPreviewLoading ? (_jsx(Spinner, { container: true })) : previewData ? (_jsx("div", { className: styles['lyrics-content-wrapper'], style: { width: '100%' }, children: Array.isArray(previewData) ? (_jsx(SynchronizedLyrics, { style: { padding: 0 }, ...{
                                        artist: selectedResult.artist,
                                        lyrics: previewData,
                                        name: selectedResult.name,
                                        remote: true,
                                        source: selectedResult.source,
                                    } })) : (_jsx(UnsynchronizedLyrics, { ...{
                                        artist: selectedResult.artist,
                                        lyrics: previewData,
                                        name: selectedResult.name,
                                        remote: true,
                                        source: selectedResult.source,
                                    } })) })) : (_jsx(Center, { children: _jsx(Text, { isMuted: true, children: t('page.fullscreenPlayer.noLyrics', {
                                        postProcess: 'sentenceCase',
                                    }) }) })) }) }))] }), _jsx(Divider, {}), _jsxs(Group, { justify: "flex-end", children: [_jsx(Button, { onClick: () => closeAllModals(), variant: "default", children: t('common.cancel', { postProcess: 'titleCase' }) }), _jsx(Button, { disabled: !selectedResult || !previewData, onClick: handleExport, variant: "default", children: t('form.lyricsExport.export', { postProcess: 'titleCase' }) }), _jsx(Button, { disabled: !selectedResult, onClick: handleApply, variant: "filled", children: t('common.confirm', { postProcess: 'titleCase' }) })] })] }));
};
export const openLyricSearchModal = ({ artist, name, onSearchOverride }) => {
    openModal({
        children: (_jsx(LyricsSearchForm, { artist: artist, name: name, onSearchOverride: onSearchOverride })),
        size: 'xl',
        styles: {
            body: {
                height: '600px',
            },
        },
        title: i18n.t('form.lyricSearch.title', { postProcess: 'titleCase' }),
    });
};
