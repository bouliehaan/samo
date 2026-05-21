import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { openModal } from '@mantine/modals';
import { t } from 'i18next';
import { memo, useCallback } from 'react';
import { ExportImportSettingsModal } from '/@/renderer/components/export-import-settings-modal/export-import-settings-modal';
import { SettingsSection, } from '/@/renderer/features/settings/components/settings-section';
import { useSettingsForExport } from '/@/renderer/store';
import { Button } from '/@/shared/components/button/button';
export const ExportImportSettings = memo(() => {
    const settingForExport = useSettingsForExport();
    const onExportSettings = useCallback(() => {
        const settingsFile = new File([JSON.stringify(settingForExport)], 'samo-settings.json', {
            type: 'application/json',
        });
        const settingsFileLink = document.createElement('a');
        const settingsFilesUrl = URL.createObjectURL(settingsFile);
        settingsFileLink.href = settingsFilesUrl;
        settingsFileLink.download = settingsFile.name;
        settingsFileLink.click();
        URL.revokeObjectURL(settingsFilesUrl);
    }, [settingForExport]);
    const openImportModal = () => {
        openModal({
            children: _jsx(ExportImportSettingsModal, {}),
            size: 'lg',
            title: t('setting.exportImportSettings_importModalTitle', {
                postProcess: 'sentenceCase',
            }),
        });
    };
    const options = [
        {
            control: (_jsxs(_Fragment, { children: [_jsx(Button, { onClick: onExportSettings, size: "compact-sm", children: t('setting.exportImportSettings_control_exportText', {
                            postProcess: 'sentenceCase',
                        }) }), _jsx(Button, { onClick: openImportModal, size: "compact-sm", children: t('setting.exportImportSettings_control_importText', {
                            postProcess: 'sentenceCase',
                        }) })] })),
            description: t('setting.exportImportSettings_control_description', {
                postProcess: 'sentenceCase',
            }),
            title: t('setting.exportImportSettings_control_title', {
                postProcess: 'sentenceCase',
            }),
        },
    ];
    return (_jsx(SettingsSection, { options: options, title: t('page.setting.exportImport', { postProcess: 'sentenceCase' }) }));
});
