import { usePlayerEvents } from '/@/renderer/features/player/audio-player/hooks/use-player-events';
import { setTimestamp, usePlayerStore } from '/@/renderer/store';

export const useQueueRestoreTimestamp = () => {
    const player = usePlayerStore();

    usePlayerEvents(
        {
            onQueueRestored: (properties) => {
                const { position } = properties;

                setTimeout(() => {
                    setTimestamp(position);
                    player.mediaSeekToTimestamp(position);
                }, 100);
            },
        },
        [],
    );
};

export const QueueRestoreTimestampHook = () => {
    useQueueRestoreTimestamp();
    return null;
};
