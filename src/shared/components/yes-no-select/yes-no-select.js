import { jsx as _jsx } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { Select } from '/@/shared/components/select/select';
export const YesNoSelect = ({ ...props }) => {
    const { t } = useTranslation();
    return (_jsx(Select, { clearable: true, data: [
            {
                label: t('common.no', { postProcess: 'sentenceCase' }),
                value: 'false',
            },
            {
                label: t('common.yes', { postProcess: 'sentenceCase' }),
                value: 'true',
            },
        ], ...props }));
};
