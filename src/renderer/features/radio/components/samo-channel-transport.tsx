import clsx from 'clsx';

import styles from './samo-channel-transport.module.css';

import { useSamoChannelTransport } from '/@/renderer/features/radio/hooks/use-samo-channel-transport';
import { ActionIcon } from '/@/shared/components/action-icon/action-icon';

/**
 * Programme controls for the channel that is on.
 *
 * Renders nothing unless a Samo channel is playing: an internet station has no
 * programming of its own to move, and a row of dead buttons under the artwork
 * would be worse than no row at all.
 *
 * Deliberately three buttons and no play/pause. The playerbar sits a few inches
 * below with the transport the app already has; what it cannot express is that
 * a live station's PREV and NEXT are requests to the station, which is exactly
 * what these are.
 */
export const SamoChannelTransport = ({ className }: { className?: string }) => {
    const { busy, isChannel, previous, skip, skipKind } = useSamoChannelTransport();

    if (!isChannel) {
        return null;
    }

    return (
        <div className={clsx(styles.transport, className, busy && styles.busy)}>
            <ActionIcon
                disabled={busy !== null}
                icon="mediaPrevious"
                iconProps={{ size: 'lg' }}
                onClick={previous}
                size="lg"
                tooltip={{ label: 'Back a programme on this station', openDelay: 300 }}
                variant="subtle"
            />
            <ActionIcon
                disabled={busy !== null}
                icon="mediaNext"
                iconProps={{ size: 'lg' }}
                onClick={skip}
                size="lg"
                tooltip={{ label: 'Skip what this station is airing', openDelay: 300 }}
                variant="subtle"
            />
            <ActionIcon
                disabled={busy !== null}
                icon="mediaShuffle"
                iconProps={{ size: 'md' }}
                onClick={skipKind}
                size="lg"
                tooltip={{ label: 'Skip to a different kind of programme', openDelay: 300 }}
                variant="subtle"
            />
        </div>
    );
};
