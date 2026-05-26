import { useTranslation } from 'react-i18next';

import { AudiomotionColorSettings } from './audiomotion-color-settings';
import { AudiomotionGeneralSettings } from './audiomotion-general-settings';
import { AudiomotionSchemaSections } from './audiomotion-schema-sections';
import { ButterchurnSettings } from './butterchurn-settings';
import { PresetSettings } from './preset-settings';
import styles from './visualizer-settings-form.module.css';

import { useSettingsStoreActions, useVisualizerSettings } from '/@/renderer/store/settings.store';
import { Fieldset } from '/@/shared/components/fieldset/fieldset';
import { SegmentedControl } from '/@/shared/components/segmented-control/segmented-control';
import { Stack } from '/@/shared/components/stack/stack';

const VISUALIZER_TYPE_OPTIONS = [
    { label: 'AudioMotion Analyzer', value: 'audiomotionanalyzer' },
    { label: 'Butterchurn', value: 'butterchurn' },
] as const;

export const VisualizerSettingsForm = () => {
    const { t } = useTranslation();
    const visualizer = useVisualizerSettings();
    const { setSettings } = useSettingsStoreActions();
    const handleTypeChange = (value: string) => {
        setSettings({ visualizer: { type: value as 'audiomotionanalyzer' | 'butterchurn' } });
    };
    return (
        <div className={styles.container}>
            <Fieldset legend={t('visualizer.visualizerType')}>
                <Stack>
                    <SegmentedControl
                        data={[...VISUALIZER_TYPE_OPTIONS]}
                        onChange={handleTypeChange}
                        value={visualizer.type}
                    />
                </Stack>
            </Fieldset>
            {visualizer.type === 'audiomotionanalyzer' && (
                <>
                    <PresetSettings />
                    <AudiomotionGeneralSettings />
                    <AudiomotionColorSettings />
                    <AudiomotionSchemaSections />
                </>
            )}
            {visualizer.type === 'butterchurn' && <ButterchurnSettings />}
        </div>
    );
};
