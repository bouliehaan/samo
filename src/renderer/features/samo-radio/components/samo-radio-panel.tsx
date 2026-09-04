import { memo } from 'react';

import styles from './samo-radio-panel.module.css';

import { SamoRadioDeviceControls } from '/@/renderer/features/samo-radio/components/samo-radio-device-controls';
import { useSamoRadioPolling } from '/@/renderer/features/samo-radio/hooks/use-samo-radio-polling';
import { useIsPaneVisible } from '/@/renderer/layouts/default-layout/section-outlet';
import { useSamoRadioDevices } from '/@/renderer/store/samo-radio.store';
import { TextTitle } from '/@/shared/components/text-title/text-title';

/**
 * samo's own audio outputs, on the Radio page.
 *
 * Renders nothing at all when there is no device to control — on a server
 * without one, or a non-samo backend, an empty "samo Radio" heading would be a
 * permanent piece of furniture explaining a feature you do not have.
 */
export const SamoRadioPanel = memo(() => {
    // The panel is a live readout, so it buys the fast cadence — but only while
    // it is actually on screen. The Radio page stays mounted after you leave it
    // (see SectionOutlet), and a panel nobody is looking at has no business
    // asking the stereo what it is doing every five seconds.
    const isVisible = useIsPaneVisible();
    useSamoRadioPolling({ active: isVisible });
    const devices = useSamoRadioDevices();

    if (devices.length === 0) {
        return null;
    }

    return (
        <section className={styles.panel}>
            <TextTitle fw={700} isNoSelect order={2}>
                samo Radio
            </TextTitle>
            <div className={styles.devices}>
                {devices.map((device) => (
                    <div className={styles.device} key={device.id}>
                        <SamoRadioDeviceControls device={device} />
                    </div>
                ))}
            </div>
        </section>
    );
});

SamoRadioPanel.displayName = 'SamoRadioPanel';
