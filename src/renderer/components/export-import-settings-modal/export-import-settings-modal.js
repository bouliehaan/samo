import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { t } from 'i18next';
import { useCallback, useState } from 'react';
import { DiffVisualiser } from '/@/renderer/components/settings-diff-visualiser/settings-diff-visualiser';
import { migrateSettings, useSettingsForExport, useSettingsStoreActions, ValidationSettingsStateSchema, } from '/@/renderer/store';
import { Button } from '/@/shared/components/button/button';
import { DragDropZone } from '/@/shared/components/drag-drop-zone/drag-drop-zone';
import { Stack } from '/@/shared/components/stack/stack';
import { Text } from '/@/shared/components/text/text';
var SCREENS;
(function (SCREENS) {
    SCREENS[SCREENS["FILE_PICKER"] = 0] = "FILE_PICKER";
    SCREENS[SCREENS["DIFF_VISUALS"] = 1] = "DIFF_VISUALS";
    SCREENS[SCREENS["IMPORT_COMPLETE"] = 2] = "IMPORT_COMPLETE";
})(SCREENS || (SCREENS = {}));
export const ExportImportSettingsModal = () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Version needs to be omitted from the settings object
    const { version, ...settings } = useSettingsForExport();
    const { setSettings } = useSettingsStoreActions();
    const [currentScreen, setCurrentScreen] = useState(SCREENS.FILE_PICKER);
    const [selectedSettingsFile, setSettingsFile] = useState();
    const onItemSelected = useCallback((itemContents) => {
        const settingsFile = JSON.parse(itemContents);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Version needs to be omitted from the settings object
        const { version, ...settings } = settingsFile;
        const parsedResult = settings;
        setSettingsFile(parsedResult);
        setCurrentScreen(SCREENS.DIFF_VISUALS);
    }, []);
    const validateItemSelected = useCallback((itemContents) => {
        try {
            JSON.parse(itemContents);
            // eslint-disable-next-line @typescript-eslint/no-unused-vars -- "err" is not useful and the catch cannot be empty
        }
        catch (err) {
            return {
                error: t('setting.exportImportSettings_notValidJSON'),
                isValid: false,
            };
        }
        const content = JSON.parse(itemContents);
        const migratedSettings = migrateSettings(content, content?.version || 0);
        const validationRes = ValidationSettingsStateSchema.safeParse(migratedSettings);
        if (!validationRes.success) {
            const error = validationRes.error;
            const firstError = error.errors.pop();
            const dotPath = firstError?.path.join('.');
            const reason = firstError?.message;
            return {
                error: t('setting.exportImportSettings_offendingKeyError', {
                    offendingKey: dotPath,
                    reason,
                }),
                isValid: false,
            };
        }
        return {
            isValid: true,
        };
    }, []);
    const onImportClick = useCallback(() => {
        if (selectedSettingsFile) {
            setSettings(selectedSettingsFile);
            setCurrentScreen(SCREENS.IMPORT_COMPLETE);
        }
    }, [selectedSettingsFile, setSettings]);
    return (_jsxs(_Fragment, { children: [currentScreen === SCREENS.FILE_PICKER ? (_jsx(Stack, { children: _jsx(DragDropZone, { icon: "fileJson", onItemSelected: onItemSelected, validateItem: validateItemSelected }) })) : null, currentScreen === SCREENS.DIFF_VISUALS ? (_jsxs(Stack, { children: [_jsx(DiffVisualiser, { newSettings: selectedSettingsFile, originalSettings: settings }), _jsx(Text, { size: "sm", ta: "center", children: t('setting.exportImportSettings_destructiveWarning').toString() }), _jsx(Button, { onClick: onImportClick, variant: "state-info", children: t('setting.exportImportSettings_importBtn').toString() })] })) : null, currentScreen === SCREENS.IMPORT_COMPLETE ? (_jsx(Text, { py: "md", ta: "center", children: t('setting.exportImportSettings_importSuccess').toString() })) : null] }));
};
