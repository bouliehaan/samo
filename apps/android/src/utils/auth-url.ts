import { DEFAULT_SERVER_URL } from './app-constants';

export { DEFAULT_SERVER_URL };

export const addDefaultHttpScheme = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
        return '';
    }

    if (/^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)) {
        return trimmed;
    }

    return `http://${trimmed.replace(/^\/+/, '')}`;
};

export const hasServerUrlTarget = (value: string) => {
    const normalized = addDefaultHttpScheme(value);
    return normalized.replace(/^[a-z][a-z\d+\-.]*:\/\//i, '').trim().length > 0;
};
