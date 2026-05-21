import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { QueryBuilderOption } from '/@/renderer/components/query-builder/query-builder-option';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Box } from '/@/shared/components/box/box';
import { DropdownMenu } from '/@/shared/components/dropdown-menu/dropdown-menu';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Select } from '/@/shared/components/select/select';
import { Stack } from '/@/shared/components/stack/stack';
export const QueryBuilder = ({ data, filters, groupIndex, level, onAddRule, onAddRuleGroup, onChangeField, onChangeOperator, onChangeType, onChangeValue, onClearFilters, onDeleteRule, onDeleteRuleGroup, onResetFilters, operators, playlists, saveActions, uniqueId, }) => {
    const { t } = useTranslation();
    const FILTER_GROUP_OPTIONS_DATA = [
        {
            label: t('form.queryEditor.input', {
                context: 'optionMatchAll',
                postProcess: 'sentenceCase',
            }),
            value: 'all',
        },
        {
            label: t('form.queryEditor.input', {
                context: 'optionMatchAny',
                postProcess: 'sentenceCase',
            }),
            value: 'any',
        },
    ];
    const handleAddRule = () => {
        onAddRule({ groupIndex, level });
    };
    const handleAddRuleGroup = () => {
        onAddRuleGroup({ groupIndex, level });
    };
    const handleDeleteRuleGroup = () => {
        onDeleteRuleGroup({ groupIndex, level, uniqueId });
    };
    const handleChangeType = (value) => {
        onChangeType({ groupIndex, level, value });
    };
    const boxStyle = useMemo(() => ({
        border: '1px solid var(--theme-colors-border)',
        borderRadius: 'var(--theme-radius-md)',
        marginLeft: level > 0 ? '20px' : '0px',
    }), [level]);
    return (_jsx(Box, { p: "md", style: boxStyle, children: _jsxs(Stack, { gap: "sm", children: [_jsxs(Group, { gap: "sm", justify: "space-between", wrap: "nowrap", children: [_jsxs(Group, { gap: "sm", wrap: "nowrap", children: [_jsx(Select, { data: FILTER_GROUP_OPTIONS_DATA, maxWidth: 170, onChange: handleChangeType, size: "sm", value: data.type }), _jsx(ActionIcon, { icon: "add", onClick: handleAddRule, size: "sm", variant: "subtle" }), _jsxs(DropdownMenu, { position: "bottom-start", children: [_jsx(DropdownMenu.Target, { children: _jsx(ActionIcon, { icon: "ellipsisVertical", size: "sm", style: {
                                                    padding: 0,
                                                }, variant: "subtle" }) }), _jsxs(DropdownMenu.Dropdown, { children: [_jsx(DropdownMenu.Item, { leftSection: _jsx(Icon, { icon: "add" }), onClick: handleAddRuleGroup, children: t('form.queryEditor.addRuleGroup', {
                                                        postProcess: 'sentenceCase',
                                                    }) }), level > 0 && (_jsx(DropdownMenu.Item, { leftSection: _jsx(Icon, { icon: "delete" }), onClick: handleDeleteRuleGroup, children: t('form.queryEditor.removeRuleGroup', {
                                                        postProcess: 'sentenceCase',
                                                    }) })), level === 0 && (_jsxs(_Fragment, { children: [_jsx(DropdownMenu.Divider, {}), _jsx(DropdownMenu.Item, { isDanger: true, leftSection: _jsx(Icon, { color: "error", icon: "refresh" }), onClick: onResetFilters, children: t('form.queryEditor.resetToDefault', {
                                                                postProcess: 'sentenceCase',
                                                            }) }), _jsx(DropdownMenu.Item, { isDanger: true, leftSection: _jsx(Icon, { color: "error", icon: "delete" }), onClick: onClearFilters, children: t('form.queryEditor.clearFilters', {
                                                                postProcess: 'sentenceCase',
                                                            }) })] }))] })] })] }), level === 0 && saveActions] }), data?.rules?.map((rule) => (_jsx("div", { children: _jsx(QueryBuilderOption, { data: rule, filters: filters, groupIndex: groupIndex || [], level: level, noRemove: false, onChangeField: onChangeField, onChangeOperator: onChangeOperator, onChangeValue: onChangeValue, onDeleteRule: onDeleteRule, operators: operators, selectData: playlists }) }, rule.uniqueId))), data?.group && (_jsx(_Fragment, { children: data.group?.map((group, index) => (_jsx("div", { children: _jsx(QueryBuilder, { data: group, filters: filters, groupIndex: [...(groupIndex || []), index], level: level + 1, onAddRule: onAddRule, onAddRuleGroup: onAddRuleGroup, onChangeField: onChangeField, onChangeOperator: onChangeOperator, onChangeType: onChangeType, onChangeValue: onChangeValue, onClearFilters: onClearFilters, onDeleteRule: onDeleteRule, onDeleteRuleGroup: onDeleteRuleGroup, onResetFilters: onResetFilters, operators: operators, playlists: playlists, uniqueId: group.uniqueId }) }, group.uniqueId))) }))] }) }));
};
