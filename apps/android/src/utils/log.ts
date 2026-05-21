type LogLevel = 'debug' | 'error' | 'info' | 'warn';

const log = (level: LogLevel, message: string, meta?: unknown) => {
    if (__DEV__) {
        const prefix = `[samo:${level}]`;
        if (meta !== undefined) {
            console[level === 'debug' ? 'log' : level](prefix, message, meta);
        } else {
            console[level === 'debug' ? 'log' : level](prefix, message);
        }
    }
};

export const androidLog = {
    debug: (message: string, meta?: unknown) => log('debug', message, meta),
    error: (message: string, meta?: unknown) => log('error', message, meta),
    info: (message: string, meta?: unknown) => log('info', message, meta),
    warn: (message: string, meta?: unknown) => log('warn', message, meta),
};
