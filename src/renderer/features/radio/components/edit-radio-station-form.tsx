import { t } from 'i18next';
import { MouseEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useUpdateRadioStation } from '/@/renderer/features/radio/mutations/update-radio-station-mutation';
import { useCurrentServer } from '/@/renderer/store';
import { Group } from '/@/shared/components/group/group';
import { closeAllModals, openModal } from '/@/shared/components/modal/modal';
import { ModalButton } from '/@/shared/components/modal/model-shared';
import { Stack } from '/@/shared/components/stack/stack';
import { TextInput } from '/@/shared/components/text-input/text-input';
import { toast } from '/@/shared/components/toast/toast';
import { useForm } from '/@/shared/hooks/use-form';
import {
    InternetRadioStation,
    ServerListItem,
    UpdateInternetRadioStationBody,
} from '/@/shared/types/domain-types';
import { logFn } from '/@/shared/utils/logger';
import { logMsg } from '/@/shared/utils/logger-message';

interface EditRadioStationFormProps {
    onCancel: () => void;
    station: InternetRadioStation;
}

export const EditRadioStationForm = ({ onCancel, station }: EditRadioStationFormProps) => {
    const { t } = useTranslation();
    const updateMutation = useUpdateRadioStation({});
    const server = useCurrentServer();

    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<UpdateInternetRadioStationBody>({
        initialValues: {
            homepageUrl: station.homepageUrl || '',
            name: station.name,
            streamUrl: station.streamUrl,
        },
    });

    const handleSubmit = form.onSubmit(async (values) => {
        if (!server?.id) return;

        setIsSaving(true);
        try {
            await updateMutation.mutateAsync({
                apiClientProps: { serverId: server.id },
                body: values,
                query: { id: station.id },
            });

            toast.success({
                message: t('form.editRadioStation.success', {
                    postProcess: 'sentenceCase',
                }) as string,
            });
            closeAllModals();
        } catch (err: unknown) {
            logFn.error(logMsg.other.error, {
                meta: { error: err as Error },
            });

            toast.error({
                message: (err as Error)?.message,
                title: t('error.genericError', { postProcess: 'sentenceCase' }) as string,
            });
        } finally {
            setIsSaving(false);
        }
    });

    const isSubmitDisabled = !form.values.name || !form.values.streamUrl || isSaving;

    return (
        <form onSubmit={handleSubmit}>
            <Stack gap="md">
                <TextInput
                    data-autofocus
                    label={t('form.createRadioStation.input', {
                        context: 'name',
                        postProcess: 'titleCase',
                    })}
                    required
                    {...form.getInputProps('name')}
                />
                <TextInput
                    label={t('form.createRadioStation.input', {
                        context: 'streamUrl',
                        postProcess: 'titleCase',
                    })}
                    required
                    {...form.getInputProps('streamUrl')}
                />
                <TextInput
                    label={t('form.createRadioStation.input', {
                        context: 'homepageUrl',
                        postProcess: 'titleCase',
                    })}
                    {...form.getInputProps('homepageUrl')}
                />
                <Group justify="flex-end">
                    <ModalButton disabled={isSaving} onClick={onCancel}>
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

export const openEditRadioStationModal = (
    station: InternetRadioStation,
    server: null | ServerListItem,
    e?: MouseEvent<HTMLButtonElement>,
) => {
    e?.stopPropagation();

    if (!server) {
        toast.error({
            message: t('common.error.noServer', { postProcess: 'sentenceCase' }) as string,
        });
        return;
    }

    openModal({
        children: <EditRadioStationForm onCancel={closeAllModals} station={station} />,
        size: 'md',
        title: t('common.edit', { postProcess: 'titleCase' }) as string,
    });
};
