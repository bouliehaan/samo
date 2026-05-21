import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { t } from 'i18next';
import { useTranslation } from 'react-i18next';
import { useCreateRadioStation } from '/@/renderer/features/radio/mutations/create-radio-station-mutation';
import { useCurrentServer } from '/@/renderer/store';
import { Group } from '/@/shared/components/group/group';
import { closeAllModals, openModal } from '/@/shared/components/modal/modal';
import { ModalButton } from '/@/shared/components/modal/model-shared';
import { Stack } from '/@/shared/components/stack/stack';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { toast } from '/@/shared/components/toast/toast';
import { useForm } from '/@/shared/hooks/use-form';
export const CreateRadioStationForm = ({ onCancel }) => {
    const { t } = useTranslation();
    const mutation = useCreateRadioStation({});
    const server = useCurrentServer();
    const form = useForm({
        initialValues: {
            homepageUrl: '',
            name: '',
            streamUrl: '',
        },
    });
    const handleSubmit = form.onSubmit((values) => {
        if (!server)
            return;
        mutation.mutate({
            apiClientProps: { serverId: server.id },
            body: values,
        }, {
            onError: (error) => {
                toast.error({
                    message: error.message,
                    title: t('error.genericError', {
                        postProcess: 'sentenceCase',
                    }),
                });
            },
            onSuccess: () => {
                closeAllModals();
            },
        });
    });
    return (_jsx("form", { onSubmit: handleSubmit, children: _jsxs(Stack, { gap: "md", children: [_jsx(TextInput, { label: t('form.createRadioStation.input', {
                        context: 'name',
                        postProcess: 'titleCase',
                    }), required: true, ...form.getInputProps('name') }), _jsx(TextInput, { label: t('form.createRadioStation.input', {
                        context: 'streamUrl',
                        postProcess: 'titleCase',
                    }), required: true, ...form.getInputProps('streamUrl') }), _jsx(TextInput, { label: t('form.createRadioStation.input', {
                        context: 'homepageUrl',
                        postProcess: 'titleCase',
                    }), ...form.getInputProps('homepageUrl') }), _jsxs(Group, { justify: "flex-end", children: [_jsx(ModalButton, { onClick: onCancel, variant: "subtle", children: t('common.cancel', { postProcess: 'sentenceCase' }) }), _jsx(ModalButton, { loading: mutation.isPending, type: "submit", variant: "filled", children: t('common.create', { postProcess: 'sentenceCase' }) })] })] }) }));
};
export const openCreateRadioStationModal = (server, e) => {
    e?.stopPropagation();
    if (!server) {
        toast.error({
            message: t('common.error.noServer', { postProcess: 'sentenceCase' }),
        });
        return;
    }
    openModal({
        children: _jsx(CreateRadioStationForm, { onCancel: closeAllModals }),
        title: t('action.createRadioStation', { postProcess: 'titleCase' }),
    });
};
