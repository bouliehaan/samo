import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { closeAllModals, openModal } from '@mantine/modals';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlaylistQueryBuilder, } from '/@/renderer/features/playlists/components/playlist-query-builder';
import { convertQueryGroupToNDQuery } from '/@/renderer/features/playlists/utils';
import { JsonPreview } from '/@/renderer/features/shared/components/json-preview';
import { Box } from '/@/shared/components/box/box';
import { Button } from '/@/shared/components/button/button';
import { Flex } from '/@/shared/components/flex/flex';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { JsonInput } from '/@/shared/components/json-input/json-input';
import { ConfirmModal } from '/@/shared/components/modal/modal';
import { ScrollArea } from '/@/shared/components/scroll-area/scroll-area';
import { SegmentedControl } from '/@/shared/components/segmented-control/segmented-control';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { toast } from '/@/shared/components/toast/toast';
const serializeFiltersToRulesJson = (filters) => {
    const queryValue = convertQueryGroupToNDQuery(filters.filters);
    const sortString = filters.extraFilters.sortBy?.[0];
    return {
        ...queryValue,
        ...(filters.extraFilters.limit != null && { limit: filters.extraFilters.limit }),
        ...(filters.extraFilters.limitPercent != null && {
            limitPercent: filters.extraFilters.limitPercent,
        }),
        ...(sortString && { sort: sortString }),
    };
};
const parseRulesJsonToSaveArgs = (parsed) => {
    const rootKey = parsed.all ? 'all' : 'any';
    const filter = rootKey in parsed ? { [rootKey]: parsed[rootKey] } : { all: [] };
    return {
        extraFilters: {
            ...(parsed.limit != null && { limit: parsed.limit }),
            ...(parsed.limitPercent != null && { limitPercent: parsed.limitPercent }),
            ...(parsed.sort != null && { sortBy: [parsed.sort] }),
        },
        filter,
    };
};
export const PlaylistQueryEditor = ({ detailQuery, handleSave, handleSaveAs, isQueryBuilderExpanded, onToggleExpand, playlistId, queryBuilderRef, updatePlaylistMutation, }) => {
    const { t } = useTranslation();
    const [editorMode, setEditorMode] = useState('builder');
    const [jsonText, setJsonText] = useState('');
    const [appliedJsonState, setAppliedJsonState] = useState(null);
    const getFiltersForSave = useCallback(() => {
        if (editorMode === 'json') {
            try {
                const parsed = JSON.parse(jsonText);
                const { extraFilters, filter } = parseRulesJsonToSaveArgs(parsed);
                return { extraFilters, filter };
            }
            catch {
                return null;
            }
        }
        const filters = queryBuilderRef.current?.getFilters();
        if (!filters)
            return null;
        return {
            extraFilters: filters.extraFilters,
            filter: convertQueryGroupToNDQuery(filters.filters),
        };
    }, [editorMode, jsonText, queryBuilderRef]);
    const openPreviewModal = useCallback(() => {
        const payload = getFiltersForSave();
        if (!payload) {
            if (editorMode === 'json') {
                toast.error({ message: t('error.invalidJson', { postProcess: 'sentenceCase' }) });
            }
            return;
        }
        const previewValue = {
            ...payload.filter,
            ...(payload.extraFilters.limit != null && { limit: payload.extraFilters.limit }),
            ...(payload.extraFilters.limitPercent != null && {
                limitPercent: payload.extraFilters.limitPercent,
            }),
            ...(payload.extraFilters.sortBy?.[0] && { sort: payload.extraFilters.sortBy[0] }),
        };
        openModal({
            children: _jsx(JsonPreview, { value: previewValue }),
            size: 'xl',
            title: t('common.preview', { postProcess: 'titleCase' }),
        });
    }, [editorMode, getFiltersForSave, t]);
    const openSaveAndReplaceModal = useCallback(() => {
        if (!isQueryBuilderExpanded)
            return;
        const payload = getFiltersForSave();
        if (!payload) {
            if (editorMode === 'json') {
                toast.error({ message: t('error.invalidJson', { postProcess: 'sentenceCase' }) });
            }
            return;
        }
        openModal({
            children: (_jsx(ConfirmModal, { onConfirm: () => {
                    handleSave(payload.filter, payload.extraFilters);
                    closeAllModals();
                }, children: _jsx(Text, { children: t('common.areYouSure', { postProcess: 'sentenceCase' }) }) })),
            title: t('common.saveAndReplace', { postProcess: 'titleCase' }),
        });
    }, [editorMode, getFiltersForSave, handleSave, isQueryBuilderExpanded, t]);
    const parseSortBy = useCallback(() => {
        const sort = detailQuery?.data?.rules?.sort;
        // Handle new syntax: comma-separated with +/- prefix
        // e.g., "+album,-year" -> return as single string in array
        if (typeof sort === 'string') {
            // Check if it's new syntax (has +/- prefix or commas)
            if (sort.includes(',') || sort.startsWith('+') || sort.startsWith('-')) {
                return [sort];
            }
            // Old syntax: single field, convert to new format with default order
            const order = detailQuery?.data?.rules?.order || 'asc';
            const prefix = order === 'desc' ? '-' : '+';
            return [`${prefix}${sort}`];
        }
        if (Array.isArray(sort)) {
            // If array, check if first item has +/- prefix
            if (sort.length > 0 &&
                typeof sort[0] === 'string' &&
                (sort[0].startsWith('+') || sort[0].startsWith('-'))) {
                return sort;
            }
            // Old array format, convert to new format
            const order = detailQuery?.data?.rules?.order || 'asc';
            const prefix = order === 'desc' ? '-' : '+';
            return sort.map((s) => `${prefix}${s}`);
        }
        return ['+dateAdded'];
    }, [detailQuery?.data?.rules?.order, detailQuery?.data?.rules?.sort]);
    const parseSortOrder = useCallback(() => {
        const sort = detailQuery?.data?.rules?.sort;
        if (typeof sort === 'string' && sort.startsWith('-')) {
            return 'desc';
        }
        // Fall back to old order field or default
        return detailQuery?.data?.rules?.order || 'asc';
    }, [detailQuery?.data?.rules?.order, detailQuery?.data?.rules?.sort]);
    const effectiveQuery = useMemo(() => appliedJsonState?.query ??
        (detailQuery?.data?.rules?.all
            ? { all: detailQuery.data.rules.all }
            : detailQuery?.data?.rules?.any
                ? { any: detailQuery.data.rules.any }
                : detailQuery?.data?.rules), [appliedJsonState?.query, detailQuery?.data?.rules]);
    const effectiveLimit = appliedJsonState?.limit ?? detailQuery?.data?.rules?.limit;
    const effectiveLimitPercent = appliedJsonState?.limitPercent ?? detailQuery?.data?.rules?.limitPercent;
    const effectiveSortBy = useMemo(() => (appliedJsonState?.sort ? [appliedJsonState.sort] : parseSortBy()), [appliedJsonState?.sort, parseSortBy]);
    const effectiveSortOrder = appliedJsonState?.sort
        ? appliedJsonState.sort.startsWith('-')
            ? 'desc'
            : 'asc'
        : parseSortOrder();
    const handleEditorModeChange = useCallback((value) => {
        const nextMode = value;
        if (nextMode === 'json') {
            const filters = queryBuilderRef.current?.getFilters();
            if (filters) {
                setJsonText(JSON.stringify(serializeFiltersToRulesJson(filters), null, 2));
            }
            else {
                const fallback = effectiveQuery
                    ? { ...effectiveQuery }
                    : { all: [] };
                if (effectiveLimit != null)
                    fallback.limit = effectiveLimit;
                if (effectiveLimitPercent != null)
                    fallback.limitPercent = effectiveLimitPercent;
                if (effectiveSortBy?.[0])
                    fallback.sort = effectiveSortBy[0];
                if (!fallback.sort)
                    fallback.sort = '+dateAdded';
                setJsonText(JSON.stringify(fallback, null, 2));
            }
            setEditorMode('json');
        }
        else {
            if (editorMode === 'json') {
                try {
                    const parsed = JSON.parse(jsonText);
                    const rootKey = parsed.all ? 'all' : 'any';
                    if (!parsed[rootKey] || !Array.isArray(parsed[rootKey])) {
                        throw new Error('Invalid rules structure');
                    }
                    setAppliedJsonState({
                        limit: parsed.limit,
                        limitPercent: parsed.limitPercent,
                        query: { [rootKey]: parsed[rootKey] },
                        sort: parsed.sort,
                    });
                }
                catch {
                    toast.error({
                        message: t('error.invalidJson', {
                            postProcess: 'sentenceCase',
                        }),
                    });
                    return;
                }
            }
            setEditorMode('builder');
        }
    }, [
        editorMode,
        effectiveLimit,
        effectiveLimitPercent,
        effectiveQuery,
        effectiveSortBy,
        jsonText,
        queryBuilderRef,
        t,
    ]);
    return (_jsx("div", { className: "query-editor-container", style: { borderTop: '1px solid var(--theme-colors-border)' }, children: _jsxs(Stack, { gap: 0, h: "100%", mah: "30dvh", p: "sm", w: "100%", children: [_jsxs(Group, { justify: "space-between", wrap: "nowrap", children: [_jsxs(Group, { gap: "sm", wrap: "nowrap", children: [_jsx(Button, { leftSection: _jsx(Icon, { icon: isQueryBuilderExpanded ? 'arrowDownS' : 'arrowUpS', size: "lg" }), onClick: onToggleExpand, size: "sm", variant: "subtle", children: t('form.queryEditor.title', {
                                        postProcess: 'titleCase',
                                    }) }), isQueryBuilderExpanded && (_jsx(SegmentedControl, { data: [
                                        {
                                            label: (_jsx(Flex, { children: _jsx(Icon, { icon: "queryBuilder" }) })),
                                            value: 'builder',
                                        },
                                        {
                                            label: (_jsx(Flex, { children: _jsx(Icon, { icon: "json" }) })),
                                            value: 'json',
                                        },
                                    ], onChange: handleEditorModeChange, size: "xs", value: editorMode }))] }), _jsxs(Group, { gap: "xs", children: [_jsx(Button, { onClick: openPreviewModal, size: "sm", variant: "subtle", children: t('common.preview', { postProcess: 'titleCase' }) }), _jsx(Button, { disabled: !isQueryBuilderExpanded, leftSection: _jsx(Icon, { icon: "save" }), loading: updatePlaylistMutation?.isPending, onClick: () => {
                                        if (!isQueryBuilderExpanded)
                                            return;
                                        const payload = getFiltersForSave();
                                        if (payload) {
                                            handleSaveAs(payload.filter, payload.extraFilters);
                                        }
                                        else if (editorMode === 'json') {
                                            toast.error({
                                                message: t('error.invalidJson', {
                                                    postProcess: 'sentenceCase',
                                                }),
                                            });
                                        }
                                    }, size: "sm", variant: "subtle", children: t('common.saveAs', { postProcess: 'titleCase' }) }), _jsx(Button, { disabled: !isQueryBuilderExpanded, leftSection: _jsx(Icon, { color: "error", icon: "save" }), onClick: openSaveAndReplaceModal, size: "sm", variant: "subtle", children: t('common.saveAndReplace', {
                                        postProcess: 'titleCase',
                                    }) })] })] }), _jsx(Box, { py: "md", style: {
                        display: isQueryBuilderExpanded ? 'flex' : 'none',
                        flex: 1,
                        minHeight: 0,
                        overflow: 'hidden',
                    }, children: editorMode === 'builder' ? (_jsx(PlaylistQueryBuilder, { limit: effectiveLimit, limitPercent: effectiveLimitPercent, playlistId: playlistId, query: effectiveQuery, ref: queryBuilderRef, sortBy: effectiveSortBy, sortOrder: effectiveSortOrder }, JSON.stringify(appliedJsonState ?? detailQuery?.data?.rules))) : (_jsx(ScrollArea, { style: { flex: 1, minHeight: 0 }, children: _jsx(JsonInput, { autosize: true, minRows: 8, onChange: (value) => setJsonText(value), placeholder: '{ "all": [], "limit": 100, "sort": "+dateAdded" }', size: "lg", spellCheck: false, style: {
                                flex: 1,
                                minHeight: 0,
                            }, value: jsonText }) })) })] }) }));
};
