import { ErrorHandler, EventCallback, TypedEventEmitter } from './types';
import { EventMap } from '/@/renderer/events/events';
declare class TypedEventEmitterImpl implements TypedEventEmitter<EventMap> {
    private errorHandler;
    private events;
    emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void;
    off<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>): void;
    on<K extends keyof EventMap>(event: K, callback: EventCallback<EventMap[K]>): void;
    removeAllListeners<K extends keyof EventMap>(event?: K): void;
    setErrorHandler(handler: ErrorHandler): void;
    private handleError;
}
export declare const eventEmitter: TypedEventEmitterImpl;
export {};
