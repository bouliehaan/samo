import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useSuspenseQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { MultiSelectWithInvalidData } from '/@/renderer/components/select-with-invalid-data';
import { sharedQueries } from '/@/renderer/features/shared/api/shared-api';
import { useCurrentServerId } from '/@/renderer/store';
import { titleCase } from '/@/renderer/utils';
import { NDSongQueryFieldsLabelMap } from '/@/shared/api/navidrome/navidrome-types';
import { LibraryItem } from '/@/shared/types/domain-types';
const TagFilterItem = ({ label, onChange, options, tagValue, value }) => {
    const selectData = useMemo(() => options.map((option) => ({
        label: option.name,
        value: option.id,
    })), [options]);
    const defaultValue = useMemo(() => {
        if (!value)
            return [];
        return Array.isArray(value) ? value : [value];
    }, [value]);
    const handleChange = useCallback((e) => {
        if (e && e.length > 0) {
            onChange(e);
        }
        else {
            onChange(null);
        }
    }, [onChange]);
    return (_jsx(MultiSelectWithInvalidData, { clearable: true, data: selectData, defaultValue: defaultValue, label: label, limit: 100, onChange: handleChange, searchable: true }, tagValue));
};
TagFilterItem.displayName = 'TagFilterItem';
export const TagFilters = ({ query, setCustom, type }) => {
    const serverId = useCurrentServerId();
    const tagsQuery = useSuspenseQuery(sharedQueries.tagList({
        options: {
            gcTime: 1000 * 60 * 60,
            staleTime: 1000 * 60 * 60,
        },
        query: { type },
        serverId,
    }));
    const handleTagFilter = useMemo(() => (tag, e) => {
        setCustom({ [tag]: e || undefined });
    }, [setCustom]);
    const enumTags = useMemo(() => {
        const results = [];
        const excluded = type === LibraryItem.ALBUM
            ? tagsQuery.data?.excluded.album
            : tagsQuery.data?.excluded.song;
        for (const tag of tagsQuery.data?.tags || []) {
            if (!excluded.includes(tag.name)) {
                results.push({
                    label: NDSongQueryFieldsLabelMap[tag.name] ?? titleCase(tag.name),
                    options: tag.options,
                    value: tag.name,
                });
            }
        }
        return results;
    }, [tagsQuery.data?.tags, tagsQuery.data?.excluded.album, tagsQuery.data?.excluded.song, type]);
    return (_jsx(_Fragment, { children: enumTags.map((tag) => (_jsx(TagFilterItem, { label: tag.label, onChange: (e) => handleTagFilter(tag.value, e), options: tag.options, tagValue: tag.value, value: query._custom?.[tag.value] }, tag.value))) }));
};
