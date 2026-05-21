import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { closeAllModals, openModal } from '@mantine/modals';
import formatDuration from 'format-duration';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '/@/i18n/i18n';
import { Button } from '/@/shared/components/button/button';
import { Checkbox } from '/@/shared/components/checkbox/checkbox';
import { Code } from '/@/shared/components/code/code';
import { Divider } from '/@/shared/components/divider/divider';
import { Group } from '/@/shared/components/group/group';
import { NumberInput } from '/@/shared/components/number-input/number-input';
import { Stack } from '/@/shared/components/stack/stack';
import { useForm } from '/@/shared/hooks/use-form';
export const LyricsExportForm = ({ lyrics, offsetMs, synced }) => {
    const { t } = useTranslation();
    const form = useForm({
        initialValues: {
            offsetMs,
            synced,
        },
    });
    const displayedLyrics = useMemo(() => {
        if (form.values.synced && Array.isArray(lyrics.lyrics)) {
            const contents = lyrics.lyrics
                .map((lyric) => `[${formatDuration(lyric[0], { leading: true, ms: true })}]${lyric[1]}`)
                .join('\n');
            return `[ar:${lyrics.artist}]
[ti:${lyrics.name}]
[offset:${form.values.offsetMs + (lyrics.offsetMs ?? 0)}]
${contents}
`;
        }
        else {
            if (Array.isArray(lyrics.lyrics)) {
                return lyrics.lyrics.map((lyric) => lyric[1]).join('\n') + '\n';
            }
            return lyrics.lyrics;
        }
    }, [
        form.values.offsetMs,
        form.values.synced,
        lyrics.artist,
        lyrics.lyrics,
        lyrics.name,
        lyrics.offsetMs,
    ]);
    const exportLyrics = useCallback(() => {
        const extension = form.values.synced ? '.lrc' : '.txt';
        const lyricFile = new File([displayedLyrics], lyrics.name + extension, {
            type: 'text/plain',
        });
        const lyricsFileLink = document.createElement('a');
        const lyricsFileUrl = URL.createObjectURL(lyricFile);
        lyricsFileLink.href = lyricsFileUrl;
        lyricsFileLink.download = lyricFile.name;
        lyricsFileLink.click();
        URL.revokeObjectURL(lyricsFileUrl);
        closeAllModals();
    }, [displayedLyrics, form.values.synced, lyrics.name]);
    return (_jsxs(Stack, { h: "100%", w: "100%", children: [synced && (_jsx("form", { children: _jsxs(Group, { grow: true, children: [_jsx(Checkbox, { "data-autofocus": true, label: t('form.lyricsExport.input', {
                                context: 'synced',
                                postProcess: 'titleCase',
                            }), ...form.getInputProps('synced', { type: 'checkbox' }) }), _jsx(NumberInput, { "data-autofocus": true, label: t('form.lyricsExport.input', {
                                context: 'offset',
                                postProcess: 'titleCase',
                            }), ...form.getInputProps('offsetMs') })] }) })), _jsx(Code, { block: true, children: displayedLyrics }), _jsx(Divider, {}), _jsxs(Group, { justify: "flex-end", children: [_jsx(Button, { onClick: () => closeAllModals(), variant: "default", children: t('common.close', { postProcess: 'titleCase' }) }), _jsx(Button, { onClick: exportLyrics, variant: "filled", children: t('form.lyricsExport.export', { postProcess: 'titleCase' }) })] })] }));
};
export const openLyricsExportModal = ({ lyrics, offsetMs, synced }) => {
    openModal({
        children: _jsx(LyricsExportForm, { lyrics: lyrics, offsetMs: offsetMs, synced: synced }),
        size: 'xl',
        styles: {
            body: {
                height: '600px',
            },
        },
        title: i18n.t('form.lyricSearch.title', { postProcess: 'titleCase' }),
    });
};
