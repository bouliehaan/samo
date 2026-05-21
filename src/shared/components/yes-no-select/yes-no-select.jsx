import { useTranslation } from 'react-i18next';
import { Select } from '/@/shared/components/select/select';
export const YesNoSelect = ({ ...props }) => {
    const { t } = useTranslation();
    return (<Select clearable data={[
            {
                label: t('common.no', { postProcess: 'sentenceCase' }),
                value: 'false',
            },
            {
                label: t('common.yes', { postProcess: 'sentenceCase' }),
                value: 'true',
            },
        ]} {...props}/>);
};
