import { jsx as _jsx } from "react/jsx-runtime";
import isElectron from 'is-electron';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ContextMenu } from '/@/shared/components/context-menu/context-menu';
import { toast } from '/@/shared/components/toast/toast';
const utils = isElectron() ? window.api.utils : null;
export const ShowInFileExplorerAction = ({ items }) => {
    const { t } = useTranslation();
    const onSelect = useCallback(async () => {
        if (!utils) {
            return;
        }
        const firstItem = items[0];
        if (!firstItem?.path) {
            return;
        }
        try {
            await utils.openItem(firstItem.path);
        }
        catch (error) {
            toast.error({
                message: error.message,
                title: t('error.openError', {
                    postProcess: 'sentenceCase',
                }),
            });
        }
    }, [items, t]);
    if (!utils) {
        return null;
    }
    const firstItem = items[0];
    const hasPath = firstItem?.path !== null;
    const isDisabled = items.length > 1 || !hasPath;
    return (_jsx(ContextMenu.Item, { disabled: isDisabled, leftIcon: "folder", onSelect: onSelect, children: t('page.itemDetail.openFile', { postProcess: 'sentenceCase' }) }));
};
