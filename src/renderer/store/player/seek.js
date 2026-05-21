import { eventEmitter } from '/@/renderer/events/event-emitter';
export function emitPlayerSeek(ms) {
    eventEmitter.emit('PLAYER_SEEK', { ms });
}
export function subscribePlayerSeek(onChange) {
    const handler = ({ ms }) => {
        onChange({ timestamp: ms });
    };
    eventEmitter.on('PLAYER_SEEK', handler);
    return () => {
        eventEmitter.off('PLAYER_SEEK', handler);
    };
}
