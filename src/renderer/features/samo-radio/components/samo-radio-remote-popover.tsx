import { memo } from 'react';

import styles from './samo-radio-remote-popover.module.css';

import { SamoRadioDeviceControls } from '/@/renderer/features/samo-radio/components/samo-radio-device-controls';
import { useSamoRadioPolling } from '/@/renderer/features/samo-radio/hooks/use-samo-radio-polling';
import { useSamoRadioDevices } from '/@/renderer/store/samo-radio.store';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';
import { Popover } from '/@/shared/components/popover/popover';
import { Text } from '/@/shared/components/text/text';
import { useDisclosure } from '/@/shared/hooks/use-disclosure';

/**
 * The stereo's remote, in the playerbar.
 *
 * It is a REMOTE, not an output: a samo-radio device plays on its own, whether
 * or not this app is playing anything, so these controls are deliberately
 * separate from the output picker's "send my audio there". The picker answers
 * "where does this come out"; this answers "what is the stereo doing".
 *
 * The component is always mounted — that is what keeps the idle poll running —
 * but it draws nothing until there is a device to control. A permanently greyed
 * button explaining a feature the server does not have is worse than no button,
 * and the poll is what keeps that honest without anyone having to click.
 */
export const SamoRadioRemotePopover = memo(() => {
    const devices = useSamoRadioDevices();
    const [opened, { close, toggle }] = useDisclosure(false);

    // Idle cadence while the popover is shut, fast while it is open.
    useSamoRadioPolling({ active: opened });

    if (devices.length === 0) {
        return null;
    }

    const playing = devices.filter((device) => device.state?.status === 'playing');
    const isActive = playing.length > 0;
    const tooltip = isActive
        ? `Playing on ${playing.length === 1 ? playing[0].name : `${playing.length} devices`}`
        : 'samo Radio';

    return (
        <Popover
            onChange={(nextOpened) => {
                if (!nextOpened) {
                    close();
                }
            }}
            opened={opened}
            position="top-end"
            width={380}
        >
            <Popover.Target>
                <ActionIcon
                    icon="radio"
                    iconProps={{ color: isActive ? 'primary' : undefined, size: 'lg' }}
                    onClick={(e) => {
                        e.stopPropagation();
                        toggle();
                    }}
                    size="sm"
                    stopsPropagation
                    tooltip={{ label: tooltip, openDelay: 0 }}
                    variant="subtle"
                />
            </Popover.Target>
            <Popover.Dropdown>
                <div className={styles.container}>
                    <Text className={styles.title} fw={700}>
                        samo Radio
                    </Text>
                    <div className={styles.devices}>
                        {devices.map((device) => (
                            <div className={styles.device} key={device.id}>
                                <SamoRadioDeviceControls compact device={device} />
                            </div>
                        ))}
                    </div>
                </div>
            </Popover.Dropdown>
        </Popover>
    );
});

SamoRadioRemotePopover.displayName = 'SamoRadioRemotePopover';
