import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '/@/i18n/i18n';
import { GridConfig } from '/@/renderer/features/shared/components/grid-config';
import { SettingsButton } from '/@/renderer/features/shared/components/settings-button';
import { TableConfig } from '/@/renderer/features/shared/components/table-config';
import { useSettingsStore, useSettingsStoreActions } from '/@/renderer/store';
import { Divider } from '/@/shared/components/divider/divider';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Modal } from '/@/shared/components/modal/modal';
import { SegmentedControl } from '/@/shared/components/segmented-control/segmented-control';
import { Stack } from '/@/shared/components/stack/stack';
import { Switch } from '/@/shared/components/switch/switch';
import { Table } from '/@/shared/components/table/table';
import { useDisclosure } from '/@/shared/hooks/use-disclosure';
import { ListDisplayType } from '/@/shared/types/types';
export const SONG_DISPLAY_TYPES = [
    { hidden: true, value: ListDisplayType.DETAIL },
];
const DISPLAY_TYPES = [
    {
        label: (_jsxs(Group, { align: "center", justify: "center", p: "sm", children: [_jsx(Icon, { icon: "layoutTable", size: "lg" }), i18n.t('table.config.view.table', { postProcess: 'sentenceCase' })] })),
        value: ListDisplayType.TABLE,
    },
    {
        label: (_jsxs(Group, { align: "center", justify: "center", p: "sm", children: [_jsx(Icon, { icon: "layoutGrid", size: "lg" }), i18n.t('table.config.view.grid', { postProcess: 'sentenceCase' })] })),
        value: ListDisplayType.GRID,
    },
    {
        label: (_jsxs(Group, { align: "center", justify: "center", p: "sm", children: [_jsx(Icon, { icon: "layoutDetail", size: "lg" }), i18n.t('table.config.view.detail', { postProcess: 'sentenceCase' })] })),
        value: ListDisplayType.DETAIL,
    },
    // {
    //     disabled: true,
    //     label: (
    //         <Stack align="center" p="sm">
    //             <Icon icon="layoutList" size="lg" />
    //             {i18n.t('table.config.view.list', { postProcess: 'sentenceCase' }) as string}
    //         </Stack>
    //     ),
    //     value: ListDisplayType.LIST,
    // },
];
export const ListConfigBooleanControl = ({ onChange, value, }) => {
    return (_jsx(Group, { justify: "flex-end", w: "100%", children: _jsx(Switch, { checked: value, onChange: (e) => onChange(e.currentTarget.checked) }) }));
};
export const ListConfigMenu = (props) => {
    const { t } = useTranslation();
    const displayType = useSettingsStore((state) => state.lists[props.listKey]?.display);
    const { setList } = useSettingsStoreActions();
    const [isOpen, handlers] = useDisclosure(false);
    // Filter display types based on config
    const availableDisplayTypes = useMemo(() => {
        if (!props.displayTypes) {
            return DISPLAY_TYPES;
        }
        const filtered = DISPLAY_TYPES.map((type) => {
            const config = props.displayTypes?.find((c) => c.value === type.value);
            if (config?.hidden) {
                return null;
            }
            const result = {
                ...type,
            };
            if (config?.disabled) {
                result.disabled = true;
            }
            return result;
        }).filter((type) => type !== null);
        return filtered;
    }, [props.displayTypes]);
    return (_jsxs(_Fragment, { children: [_jsx(SettingsButton, { ...props.buttonProps, onClick: handlers.toggle }), _jsx(Modal, { handlers: handlers, opened: isOpen, size: "xl", title: t('common.configure', { postProcess: 'sentenceCase' }), children: _jsxs(Stack, { gap: "xs", children: [availableDisplayTypes.length > 1 && (_jsx(ListConfigTable, { options: [
                                {
                                    component: (_jsx(SegmentedControl, { data: availableDisplayTypes, fullWidth: true, onChange: (value) => {
                                            setList(props.listKey, {
                                                display: value,
                                            });
                                        }, size: "sm", value: displayType, withItemsBorders: false })),
                                    id: 'displayType',
                                    label: t('table.config.general.displayType', {
                                        postProcess: 'sentenceCase',
                                    }),
                                },
                            ] })), _jsx(Config, { displayType: displayType, ...props })] }) })] }));
};
const Config = ({ displayType, optionsConfig, tableColumnsData, ...props }) => {
    switch (displayType) {
        case ListDisplayType.DETAIL:
            if (props.detailConfig) {
                return (_jsx(TableConfig, { enablePinColumnButtons: false, listKey: props.listKey, optionsConfig: props.detailConfig.optionsConfig, tableColumnsData: props.detailConfig.tableColumnsData, tableKey: "detail" }));
            }
            return null;
        case ListDisplayType.GRID:
            return (_jsx(GridConfig, { ...props, gridRowsData: tableColumnsData, optionsConfig: optionsConfig?.grid }));
        case ListDisplayType.TABLE:
            return (_jsx(TableConfig, { ...props, optionsConfig: optionsConfig?.table, tableColumnsData: tableColumnsData }));
        default:
            return null;
    }
};
export const ListConfigTable = ({ options, }) => {
    return (_jsx(Table, { onClick: (e) => e.stopPropagation(), style: { borderRadius: '1rem' }, styles: { th: { backgroundColor: 'initial', padding: 'var(--theme-spacing-md) 0' } }, variant: "vertical", withColumnBorders: false, withRowBorders: false, withTableBorder: false, children: _jsx(Table.Tbody, { children: options.map((option) => {
                if (option.isDivider) {
                    return (_jsx(Table.Tr, { children: _jsx(Table.Td, { colSpan: 2, px: 0, py: "md", children: _jsx(Divider, {}) }) }, option.id));
                }
                return (_jsxs(Table.Tr, { children: [_jsx(Table.Th, { w: "50%", children: option.label }), _jsx(Table.Td, { p: 0, children: option.component })] }, option.id));
            }) }) }));
};
