import log from 'electron-log/main';
import path from 'path';
import process from 'process';
import { URL } from 'url';
export let resolveHtmlPath;
if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 4343;
    resolveHtmlPath = (htmlFileName) => {
        const url = new URL(`http://localhost:${port}`);
        url.pathname = htmlFileName;
        return url.href;
    };
}
else {
    resolveHtmlPath = (htmlFileName) => {
        return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
    };
}
export const disableAutoUpdates = () => {
    return process.env['DISABLE_AUTO_UPDATES'];
};
export const isMacOS = () => {
    return process.platform === 'darwin';
};
export const isWindows = () => {
    return process.platform === 'win32';
};
export const isLinux = () => {
    return process.platform === 'linux';
};
export const hotkeyToElectronAccelerator = (hotkey) => {
    let accelerator = hotkey;
    const replacements = {
        arrowdown: 'Down',
        arrowleft: 'Left',
        arrowright: 'Right',
        arrowup: 'Up',
        mod: 'CmdOrCtrl',
        numpad: 'num',
        numpadadd: 'numadd',
        numpaddecimal: 'numdec',
        numpaddivide: 'numdiv',
        numpadenter: 'numenter',
        numpadmultiply: 'nummult',
        numpadsubtract: 'numsub',
    };
    Object.keys(replacements).forEach((key) => {
        accelerator = accelerator.replace(key, replacements[key]);
    });
    return accelerator;
};
const logMethod = {
    debug: log.debug,
    error: log.error,
    info: log.info,
    success: log.info,
    verbose: log.verbose,
    warning: log.warn,
};
const logColor = {
    debug: 'blue',
    error: 'red',
    info: 'blue',
    success: 'green',
    verbose: 'blue',
    warning: 'yellow',
};
export const createLog = (data) => {
    logMethod[data.type](`%c${data.message}`, `color: ${logColor[data.type]}`);
};
export const autoUpdaterLogInterface = {
    debug: (message) => {
        createLog({ message: `[SYSTEM] ${message}`, type: 'debug' });
    },
    error: (message) => {
        createLog({ message: `[SYSTEM] ${message}`, type: 'error' });
    },
    info: (message) => {
        createLog({ message: `[SYSTEM] ${message}`, type: 'info' });
    },
    warn: (message) => {
        createLog({ message: `[SYSTEM] ${message}`, type: 'warning' });
    },
};
