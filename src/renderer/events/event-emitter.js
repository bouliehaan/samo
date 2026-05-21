import { logFn } from '/@/renderer/utils/logger';
class TypedEventEmitterImpl {
    errorHandler = null;
    events = new Map();
    emit(event, payload) {
        const callbacks = this.events.get(String(event));
        if (callbacks) {
            callbacks.forEach((callback) => {
                try {
                    callback(payload);
                }
                catch (error) {
                    this.handleError(error, String(event), payload);
                }
            });
        }
    }
    off(event, callback) {
        const callbacks = this.events.get(String(event));
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    on(event, callback) {
        const eventKey = String(event);
        if (!this.events.has(eventKey)) {
            this.events.set(eventKey, []);
        }
        this.events.get(eventKey).push(callback);
    }
    removeAllListeners(event) {
        if (event) {
            // Remove specific event listeners
            this.events.delete(String(event));
        }
        else {
            // Remove all listeners
            this.events.clear();
        }
    }
    setErrorHandler(handler) {
        this.errorHandler = handler;
    }
    handleError(error, event, payload) {
        if (this.errorHandler) {
            this.errorHandler(error, event, payload);
        }
        else {
            logFn.error(`Event emitter error for event "${event}"`, { meta: { error, payload } });
        }
    }
}
export const eventEmitter = new TypedEventEmitterImpl();
