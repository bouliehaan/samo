import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { DateInput } from '/@/shared/components/date-picker/date-picker';
import { Group } from '/@/shared/components/group/group';
import { NumberInput } from '/@/shared/components/number-input/number-input';
import { Select } from '/@/shared/components/select/select';
import { TextInput } from '/@/shared/components/text-input/text-input';
const QueryValueInput = ({ data, defaultValue, onChange, operator, type, value: valueProp, ...props }) => {
    const [numberRange, setNumberRange] = useState([0, 0]);
    // Parse date value helper - converts date string (YYYY-MM-DD) to Date for display
    const parseDateValue = (val) => {
        if (!val)
            return null;
        if (val instanceof Date)
            return val;
        if (typeof val === 'string') {
            // Handle YYYY-MM-DD format strings
            const parsed = new Date(val);
            if (isNaN(parsed.getTime()))
                return null;
            return parsed;
        }
        return null;
    };
    const value = valueProp !== undefined ? valueProp : defaultValue;
    // Store date range as strings for state management
    const [dateRange, setDateRange] = useState(() => {
        const currentValue = value !== undefined ? value : defaultValue;
        if (currentValue && Array.isArray(currentValue)) {
            return [
                typeof currentValue[0] === 'string' ? currentValue[0] : null,
                typeof currentValue[1] === 'string' ? currentValue[1] : null,
            ];
        }
        return [null, null];
    });
    // Sync dateRange state when value changes
    useEffect(() => {
        const currentValue = value !== undefined ? value : defaultValue;
        if (operator === 'inTheRangeDate' && currentValue && Array.isArray(currentValue)) {
            setDateRange([
                typeof currentValue[0] === 'string' ? currentValue[0] : null,
                typeof currentValue[1] === 'string' ? currentValue[1] : null,
            ]);
        }
    }, [value, defaultValue, operator]);
    // Sync numberRange state when value changes
    useEffect(() => {
        const currentValue = value !== undefined ? value : defaultValue;
        if (operator === 'inTheRange' && currentValue && Array.isArray(currentValue)) {
            setNumberRange([
                typeof currentValue[0] === 'number'
                    ? currentValue[0]
                    : Number(currentValue[0]) || 0,
                typeof currentValue[1] === 'number'
                    ? currentValue[1]
                    : Number(currentValue[1]) || 0,
            ]);
        }
    }, [value, defaultValue, operator]);
    // Check if operator requires DatePicker
    const isDatePickerOperator = operator === 'beforeDate' || operator === 'afterDate' || operator === 'inTheRangeDate';
    switch (type) {
        case 'boolean':
            return (_jsx(Select, { data: [
                    { label: 'true', value: 'true' },
                    { label: 'false', value: 'false' },
                ], onChange: onChange, value: value, ...props }));
        case 'date':
            if (isDatePickerOperator && operator !== 'inTheRangeDate') {
                const dateValue = value ? parseDateValue(value) : null;
                return (_jsx(DateInput, { clearable: true, defaultLevel: "year", maxWidth: 170, onChange: (date) => {
                        // DateInput returns string in 'YYYY-MM-DD' format (local timezone)
                        // Return raw string value - no transformation needed
                        onChange(date || '');
                    }, size: "sm", value: dateValue, valueFormat: "YYYY-MM-DD", width: "25%" }));
            }
            return _jsx(TextInput, { onChange: onChange, size: "sm", value: value, ...props });
        case 'dateRange':
            if (operator === 'inTheRangeDate') {
                return (_jsxs(Group, { gap: "sm", grow: true, wrap: "nowrap", children: [_jsx(DateInput, { clearable: true, defaultLevel: "year", maxWidth: 81, onChange: (date) => {
                                // DateInput returns string in 'YYYY-MM-DD' format (local timezone)
                                const newRange = [
                                    date || null,
                                    dateRange[1],
                                ];
                                setDateRange(newRange);
                                // Return raw string values - no transformation needed
                                onChange([date || null, dateRange[1] || null]);
                            }, size: "sm", value: dateRange[0] ? parseDateValue(dateRange[0]) : null, valueFormat: "YYYY-MM-DD", width: "10%" }), _jsx(DateInput, { clearable: true, defaultLevel: "year", maxWidth: 81, onChange: (date) => {
                                // DateInput returns string in 'YYYY-MM-DD' format (local timezone)
                                const newRange = [
                                    dateRange[0],
                                    date || null,
                                ];
                                setDateRange(newRange);
                                // Return raw string values - no transformation needed
                                onChange([dateRange[0] || null, date || null]);
                            }, size: "sm", value: dateRange[1] ? parseDateValue(dateRange[1]) : null, valueFormat: "YYYY-MM-DD", width: "10%" })] }));
            }
            return (_jsxs(_Fragment, { children: [_jsx(NumberInput, { ...props, maxWidth: 81, onChange: (e) => {
                            const newRange = [Number(e) || 0, numberRange[1]];
                            setNumberRange(newRange);
                            onChange(newRange);
                        }, value: numberRange[0] || undefined, width: "10%" }), _jsx(NumberInput, { ...props, maxWidth: 81, onChange: (e) => {
                            const newRange = [numberRange[0], Number(e) || 0];
                            setNumberRange(newRange);
                            onChange(newRange);
                        }, value: numberRange[1] || undefined, width: "10%" })] }));
        case 'number':
            return (_jsx(NumberInput, { onChange: onChange, size: "sm", value: value !== undefined && value !== null && value !== ''
                    ? Number(value)
                    : undefined, ...props }));
        case 'playlist':
            return _jsx(Select, { data: data, onChange: onChange, value: value, ...props });
        case 'string':
            return _jsx(TextInput, { onChange: onChange, size: "sm", value: value || '', ...props });
        default:
            return _jsx(_Fragment, {});
    }
};
export const QueryBuilderOption = ({ data, filters, groupIndex, level, noRemove, onChangeField, onChangeOperator, onChangeValue, onDeleteRule, operators, selectData, }) => {
    const { field, operator, uniqueId, value } = data;
    const handleDeleteRule = () => {
        onDeleteRule({ groupIndex, level, uniqueId });
    };
    const handleChangeField = (e) => {
        onChangeField({ groupIndex, level, uniqueId, value: e });
    };
    const handleChangeOperator = (e) => {
        onChangeOperator({ groupIndex, level, uniqueId, value: e });
    };
    const handleChangeValue = (e) => {
        const isDirectValue = typeof e === 'string' || typeof e === 'number' || typeof e === 'undefined';
        if (isDirectValue) {
            return onChangeValue({
                groupIndex,
                level,
                uniqueId,
                value: e,
            });
        }
        // const isDate = e instanceof Date;
        // if (isDate) {
        //   return onChangeValue({
        //     groupIndex,
        //     level,
        //     uniqueId,
        //     value: dayjs(e).format('YYYY-MM-DD'),
        //   });
        // }
        const isArray = Array.isArray(e);
        if (isArray) {
            return onChangeValue({
                groupIndex,
                level,
                uniqueId,
                value: e,
            });
        }
        return onChangeValue({
            groupIndex,
            level,
            uniqueId,
            value: e.currentTarget.value,
        });
    };
    // Handle both grouped and flat filter data
    const flatFilters = filters.some((f) => f.group && f.items)
        ? filters.flatMap((group) => group.items || [])
        : filters;
    const fieldType = flatFilters.find((f) => f.value === field)?.type;
    const operatorsByFieldType = operators[fieldType];
    const ml = 20;
    return (_jsxs(Group, { gap: "sm", ml: ml, children: [_jsx(Select, { data: filters, maxWidth: 170, onChange: handleChangeField, searchable: true, size: "sm", value: field, width: "25%" }), _jsx(Select, { data: operatorsByFieldType || [], disabled: !field, maxWidth: 170, onChange: handleChangeOperator, searchable: true, size: "sm", value: operator, width: "25%" }), field ? (_jsx(QueryValueInput, { data: selectData || [], maxWidth: 170, onChange: handleChangeValue, operator: operator, size: "sm", type: operator === 'inTheRange' || operator === 'inTheRangeDate'
                    ? 'dateRange'
                    : fieldType, value: value, width: "25%" })) : (_jsx(TextInput, { disabled: true, maxWidth: 170, onChange: handleChangeValue, size: "sm", value: value || '', width: "25%" })), _jsx(ActionIcon, { disabled: noRemove, icon: "remove", onClick: handleDeleteRule, px: 5, size: "sm", variant: "subtle" })] }));
};
