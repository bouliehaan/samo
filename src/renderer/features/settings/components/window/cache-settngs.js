import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { closeAllModals, openModal } from '@mantine/modals';
import { useQueryClient } from '@tanstack/react-query';
import isElectron from 'is-electron';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsSection, } from '/@/renderer/features/settings/components/settings-section';
import { logFn } from '/@/renderer/utils/logger';
import { Button } from '/@/shared/components/button/button';
import { ConfirmModal } from '/@/shared/components/modal/modal';
import { toast } from '/@/shared/components/toast/toast';
const browser = isElectron() ? window.api.browser : null;
export const CacheSettings = memo(() => {
    const [isClearing, setIsClearing] = useState(false);
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const clearCache = useCallback(async (full) => {
        setIsClearing(true);
        try {
            queryClient.clear();
            if (full && browser) {
                await browser.clearCache();
            }
            toast.success({
                message: t('setting.clearCacheSuccess', { postProcess: 'sentenceCase' }),
            });
        }
        catch (error) {
            logFn.error(error instanceof Error ? error.message : String(error), { meta: { error: error } });
            toast.error({ message: error.message });
        }
        setIsClearing(false);
        closeAllModals();
    }, [queryClient, t]);
    const openResetConfirmModal = (full) => {
        const key = full ? 'clearCache' : 'clearQueryCache';
        openModal({
            children: (_jsx(ConfirmModal, { onConfirm: () => clearCache(full), children: t(`common.areYouSure`, { postProcess: 'sentenceCase' }) })),
            title: t(`setting.${key}`, { postProcess: 'sentenceCase' }),
        });
    };
    const options = [
        {
            control: (_jsx(Button, { disabled: isClearing, onClick: () => openResetConfirmModal(false), size: "compact-md", variant: "filled", children: t('common.clear', { postProcess: 'sentenceCase' }) })),
            description: t('setting.clearQueryCache', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            title: t('setting.clearQueryCache', { postProcess: 'sentenceCase' }),
        },
        {
            control: (_jsx(Button, { disabled: isClearing, onClick: () => openResetConfirmModal(true), size: "compact-md", variant: "filled", children: t('common.clear', { postProcess: 'sentenceCase' }) })),
            description: t('setting.clearCache', {
                context: 'description',
                postProcess: 'sentenceCase',
            }),
            isHidden: !browser,
            title: t('setting.clearCache', { postProcess: 'sentenceCase' }),
        },
    ];
    const handleOpenApplicationDirectory = async () => {
        if (isElectron() && window.api?.utils) {
            await window.api.utils.openApplicationDirectory();
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx(SettingsSection, { options: options, title: t('page.setting.cache', { postProcess: 'sentenceCase' }) }), isElectron() && (_jsx(Button, { onClick: handleOpenApplicationDirectory, variant: "default", children: t('action.openApplicationDirectory', {
                    postProcess: 'sentenceCase',
                }) }))] }));
});
