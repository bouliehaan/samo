import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import isElectron from 'is-electron';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '/@/shared/components/button/button';
import { Dialog } from '/@/shared/components/dialog/dialog';
import { Group } from '/@/shared/components/group/group';
import { Icon } from '/@/shared/components/icon/icon';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
import { useLocalStorage } from '/@/shared/hooks/use-local-storage';
export const UpdateAvailableDialog = () => {
    const [opened, setOpened] = useState(false);
    const [version, setVersion] = useState('');
    const { t } = useTranslation();
    const [versionDismissed, setVersionDismissed] = useLocalStorage({
        key: 'version_dismissed',
    });
    useEffect(() => {
        if (!isElectron())
            return;
        const handleUpdateAvailable = (_event, newVersion) => {
            if (versionDismissed !== newVersion) {
                setVersion(newVersion);
                setOpened(true);
            }
        };
        window.api.ipc.on('update-available', handleUpdateAvailable);
        return () => {
            window.api.ipc.removeListener?.('update-available', handleUpdateAvailable);
        };
    }, [versionDismissed]);
    if (!opened)
        return null;
    const handleDismiss = () => {
        if (version) {
            setVersionDismissed(version);
        }
        setOpened(false);
    };
    return (_jsx(Dialog, { onClose: handleDismiss, opened: opened, position: { bottom: 100, right: 12 }, radius: "md", size: "lg", withCloseButton: true, children: _jsxs(Stack, { gap: "md", children: [_jsxs(Text, { fw: 700, size: "md", children: [t('common.newVersionAvailable', { postProcess: 'sentenceCase' }), " - ", version] }), _jsxs(Group, { justify: "flex-end", children: [_jsx(Button, { onClick: handleDismiss, size: "xs", variant: "default", children: t('common.dismiss', { postProcess: 'titleCase' }) }), _jsx(Button, { component: "a", href: "https://github.com/bouliehaan/samo/releases/latest", onClick: handleDismiss, rightSection: _jsx(Icon, { icon: "externalLink", size: "sm" }), size: "xs", target: "_blank", variant: "filled", children: t('action.viewMore', { postProcess: 'titleCase' }) })] })] }) }));
};
