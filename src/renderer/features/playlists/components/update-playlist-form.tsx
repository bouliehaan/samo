import { closeModal, ContextModalProps } from '@mantine/modals';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useUpdatePlaylist } from '/@/renderer/features/playlists/mutations/update-playlist-mutation';
import { useCurrentServer } from '/@/renderer/store';
import { Group } from '/@/shared/components/group/group';
import { ModalButton } from '/@/shared/components/modal/model-shared';
import { Stack } from '/@/shared/components/stack/stack';
import { Switch } from '/@/shared/components/switch/switch';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { toast } from '/@/shared/components/toast/toast';
import { useForm } from '/@/shared/hooks/use-form';
import { UpdatePlaylistBody, UpdatePlaylistQuery } from '/@/shared/types/domain-types';

export const UpdatePlaylistContextModal = ({
    id,
    innerProps,
}: ContextModalProps<{
    body: Partial<UpdatePlaylistBody>;
    query: UpdatePlaylistQuery;
}>) => {
    const { t } = useTranslation();
    const updateMutation = useUpdatePlaylist({});
    const server = useCurrentServer();
    const { body, query } = innerProps;

    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<UpdatePlaylistBody>({
        initialValues: {
            comment: body?.comment || '',
            name: body?.name || '',
            ownerId: body.ownerId,
            public: body.public,
            sync: body.sync,
        },
    });

    const handleSubmit = form.onSubmit(async (values) => {
        if (!server?.id) return;

        setIsSaving(true);
        try {
            await updateMutation.mutateAsync({
                apiClientProps: { serverId: server.id },
                body: values,
                query,
            });

            toast.success({
                message: t('form.editPlaylist.success', { postProcess: 'sentenceCase' }),
            });
            closeModal(id);
        } catch (err: any) {
            toast.error({
                message: err?.message,
                title: t('error.genericError', { postProcess: 'sentenceCase' }),
            });
        } finally {
            setIsSaving(false);
        }
    });

    const isSubmitDisabled = !form.values.name || isSaving;

    return (
        <form onSubmit={handleSubmit}>
            <Stack gap="md">
                <TextInput
                    data-autofocus
                    label={t('form.createPlaylist.input', {
                        context: 'name',
                        postProcess: 'titleCase',
                    })}
                    required
                    {...form.getInputProps('name')}
                />
                <Switch
                    label={t('form.createPlaylist.input', {
                        context: 'public',
                        postProcess: 'titleCase',
                    })}
                    {...form.getInputProps('public', { type: 'checkbox' })}
                />
                <Group justify="flex-end">
                    <ModalButton disabled={isSaving} onClick={() => closeModal(id)}>
                        {t('common.cancel')}
                    </ModalButton>
                    <ModalButton
                        disabled={isSubmitDisabled}
                        loading={isSaving}
                        type="submit"
                        variant="filled"
                    >
                        {t('common.save')}
                    </ModalButton>
                </Group>
            </Stack>
        </form>
    );
};
