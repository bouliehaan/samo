import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useSelectFilter } from '/@/renderer/features/shared/hooks/use-select-filter';
import { Button } from '/@/shared/components/button/button';
import { DropdownMenu } from '/@/shared/components/dropdown-menu/dropdown-menu';
import { Select } from '/@/shared/components/select/select';
export const ListSelectFilter = ({ data, filterKey, listKey }) => {
    const selectData = data || [];
    const { setValue, value } = useSelectFilter(filterKey, '', listKey);
    const handleSetValue = (newValue) => {
        if (newValue === value) {
            setValue('');
            return;
        }
        setValue(newValue);
    };
    const getOptionLabel = (option) => {
        if (typeof option === 'string') {
            return option;
        }
        return option.label;
    };
    const getOptionValue = (option) => {
        if (typeof option === 'string') {
            return option;
        }
        return option.value;
    };
    const selectedOption = selectData.find((option) => getOptionValue(option) === value);
    const selectedLabel = selectedOption ? getOptionLabel(selectedOption) : '—';
    return (_jsx(Select, { data: selectData, onChange: (value) => handleSetValue(value ?? ''), value: value ?? '' }));
    return (_jsxs(DropdownMenu, { position: "bottom-start", children: [_jsx(DropdownMenu.Target, { children: _jsx(Button, { variant: "subtle", children: selectedLabel }) }), _jsx(DropdownMenu.Dropdown, { children: selectData.map((option) => {
                    const optionValue = getOptionValue(option);
                    const optionLabel = getOptionLabel(option);
                    return (_jsx(DropdownMenu.Item, { isSelected: value === optionValue, onClick: () => handleSetValue(optionValue), value: optionValue, children: optionLabel }, `${filterKey}-${optionValue}`));
                }) })] }));
};
