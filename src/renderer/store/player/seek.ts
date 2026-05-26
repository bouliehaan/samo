import { eventEmitter } from '/@/renderer/events/event-emitter';

export function emitPlayerSeek(ms: number) {
    eventEmitter.emit('PLAYER_SEEK', { ms });
}

export function subscribePlayerSeek(
    onChange: (properties: { timestamp: number }, prev?: { timestamp: number }) => void,
) {
    const handler = ({ ms }: { ms: number }) => {
        onChange({ timestamp: ms });
    };
    eventEmitter.on('PLAYER_SEEK', handler);
    return () => {
        eventEmitter.off('PLAYER_SEEK', handler);
    };
}
