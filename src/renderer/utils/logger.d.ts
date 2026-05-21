export declare enum LogCategory {
    ANALYTICS = "analytics",
    API = "api",
    EXTERNAL = "external",
    GENERAL = "general",
    OTHER = "other",
    PLAYER = "player",
    REMOTE = "remote",
    SCROBBLE = "scrobble",
    SYSTEM = "system"
}
export type LogLevel = 'debug' | 'error' | 'info' | 'warn';
interface LogFn {
    (message?: string, options?: {
        category?: string;
        meta?: any;
    }): void;
}
interface Logger {
    debug: LogFn;
    error: LogFn;
    info: LogFn;
    updateLogLevel: (level: LogLevel) => void;
    warn: LogFn;
}
declare class ConsoleLogger implements Logger {
    debug: LogFn;
    error: LogFn;
    info: LogFn;
    updateLogLevel: (level: LogLevel) => void;
    warn: LogFn;
    constructor();
    private initializeLoggers;
}
export declare const logFn: ConsoleLogger;
export {};
