import { t } from 'i18next';
import isElectron from 'is-electron';

import { toast } from '/@/shared/components/toast/toast';

const localSettings = isElectron() ? window.api.localSettings : null;
const shouldRestartOnClose = process.env.NODE_ENV !== 'development';

export const openRestartRequiredToast = (message?: string) => {
    return toast.warn({
        autoClose: false,
        id: 'restart-toast',
        message:
            message ||
            t('common.forceRestartRequired', {
                postProcess: 'sentenceCase',
            }),
        onClose: () => {
            if (shouldRestartOnClose) {
                localSettings?.restart();
            }
        },
        title: t('common.restartRequired', {
            postProcess: 'sentenceCase',
        }),
    });
};
