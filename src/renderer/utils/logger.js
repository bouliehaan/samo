import dayjs from 'dayjs';
export var LogCategory;
(function (LogCategory) {
    LogCategory["ANALYTICS"] = "analytics";
    LogCategory["API"] = "api";
    LogCategory["EXTERNAL"] = "external";
    LogCategory["GENERAL"] = "general";
    LogCategory["OTHER"] = "other";
    LogCategory["PLAYER"] = "player";
    LogCategory["REMOTE"] = "remote";
    LogCategory["SCROBBLE"] = "scrobble";
    LogCategory["SYSTEM"] = "system";
})(LogCategory || (LogCategory = {}));
const DEFAULT_LOG_LEVEL = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const NO_OP = (_message, ..._optionalParams) => { };
const colors = {
    debug: '\x1B[38;2;100;149;237m', // #6495ED
    error: '\x1B[38;2;255;100;100m', // #ff6464
    info: '\x1B[38;2;76;175;80m', // #4caf50
    warn: '\x1B[38;2;225;125;50m', // #e17d32
};
// Debounce configuration
const DEBOUNCE_INTERVAL = 200; // milliseconds
const DEBOUNCE_MAP = new Map();
// Periodically flush the debounce map
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of DEBOUNCE_MAP.entries()) {
        if (now - value.lastLog >= DEBOUNCE_INTERVAL) {
            const [level, message, category, meta] = JSON.parse(key);
            const timestampStr = `${dayjs().format('HH:mm:ss')}`;
            const levelStr = `${colors[level]}[${String(level).toUpperCase().padEnd(5, ' ')}]\x1B[0m`;
            const countStr = value.count > 1 ? ` (x${value.count})` : '';
            const categoryStr = category
                ? String(`[${category.padEnd(9, ' ')}]`).toUpperCase()
                : '';
            const messageStr = message ? String(message) : '';
            const logStr = `[${timestampStr}] ${levelStr} ${categoryStr} ${messageStr}${countStr}`;
            if (meta) {
                console.log(logStr, meta);
            }
            else {
                console.log(logStr);
            }
            DEBOUNCE_MAP.delete(key);
        }
    }
}, DEBOUNCE_INTERVAL);
class ConsoleLogger {
    debug = NO_OP;
    error = NO_OP;
    info = NO_OP;
    updateLogLevel;
    warn = NO_OP;
    constructor() {
        const level = (localStorage.getItem('log_level') || DEFAULT_LOG_LEVEL);
        this.initializeLoggers(level);
        this.updateLogLevel = (newLevel) => {
            this.initializeLoggers(newLevel);
        };
    }
    initializeLoggers(level) {
        // Create timestamp wrapper function with colors and debouncing
        const withTimestamp = (logLevel) => {
            return (message, options) => {
                const { category, meta } = options || {};
                const key = JSON.stringify([logLevel, message, category, meta]);
                const now = Date.now();
                const existing = DEBOUNCE_MAP.get(key);
                if (existing) {
                    existing.count++;
                    existing.lastLog = now;
                }
                else {
                    DEBOUNCE_MAP.set(key, { count: 1, lastLog: now });
                }
            };
        };
        this.error = withTimestamp('error');
        if (level === 'error') {
            this.warn = NO_OP;
            this.info = NO_OP;
            this.debug = NO_OP;
            return;
        }
        this.warn = withTimestamp('warn');
        if (level === 'warn') {
            this.info = NO_OP;
            this.debug = NO_OP;
            return;
        }
        this.info = withTimestamp('info');
        if (level === 'info') {
            this.debug = NO_OP;
            return;
        }
        this.debug = withTimestamp('debug');
    }
}
export const logFn = new ConsoleLogger();
