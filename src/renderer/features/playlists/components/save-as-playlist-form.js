import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { useCreatePlaylist } from '/@/renderer/features/playlists/mutations/create-playlist-mutation';
import { useCurrentServer } from '/@/renderer/store';
import { hasFeature } from '/@/shared/api/utils';
import { Group } from '/@/shared/components/group/group';
import { ModalButton } from '/@/shared/components/modal/model-shared';
import { Stack } from '/@/shared/components/stack/stack';
import { Switch } from '/@/shared/components/switch/switch';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { toast } from '/@/shared/components/toast/toast';
import { useForm } from '/@/shared/hooks/use-form';
import { ServerType, } from '/@/shared/types/domain-types';
import { ServerFeature } from '/@/shared/types/features-types';
export const SaveAsPlaylistForm = ({ body, onCancel, onSuccess, serverId, }) => {
    const { t } = useTranslation();
    const mutation = useCreatePlaylist({});
    const server = useCurrentServer();
    const form = useForm({
        initialValues: {
            comment: body.comment || '',
            name: body.name || '',
            public: body.public,
            queryBuilderRules: body.queryBuilderRules,
        },
    });
    const handleSubmit = form.onSubmit((values) => {
        mutation.mutate({ apiClientProps: { serverId: serverId || '' }, body: values }, {
            onError: (err) => {
                toast.error({
                    message: err.message,
                    title: t('error.genericError', { postProcess: 'sentenceCase' }),
                });
            },
            onSuccess: (data) => {
                toast.success({
                    message: t('form.createPlaylist.success', { postProcess: 'sentenceCase' }),
                });
                onSuccess(data);
                onCancel();
            },
        });
    });
    const isPublicDisplayed = hasFeature(server, ServerFeature.PUBLIC_PLAYLIST);
    const isSubmitDisabled = !form.values.name || mutation.isPending;
    return (_jsx("form", { onSubmit: handleSubmit, children: _jsxs(Stack, { children: [_jsx(TextInput, { "data-autofocus": true, label: t('form.createPlaylist.input', {
                        context: 'name',
                        postProcess: 'titleCase',
                    }), required: true, ...form.getInputProps('name') }), server?.type === ServerType.NAVIDROME && (_jsx(TextInput, { label: t('form.createPlaylist.input', {
                        context: 'description',
                        postProcess: 'titleCase',
                    }), ...form.getInputProps('comment') })), isPublicDisplayed && (_jsx(Switch, { label: t('form.createPlaylist.input', {
                        context: 'public',
                        postProcess: 'titleCase',
                    }), ...form.getInputProps('public', { type: 'checkbox' }) })), _jsxs(Group, { justify: "flex-end", children: [_jsx(ModalButton, { onClick: onCancel, children: t('common.cancel') }), _jsx(ModalButton, { disabled: isSubmitDisabled, loading: mutation.isPending, type: "submit", variant: "filled", children: t('common.save') })] })] }) }));
};
