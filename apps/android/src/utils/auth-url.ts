import { DEFAULT_SERVER_URL } from './app-constants';

export { DEFAULT_SERVER_URL };

// Samo Server itself never terminates TLS (see samo-server's plain
// `http.Server`), so a bare LAN address genuinely only ever speaks HTTP. But
// once a server is reachable through anything else — a real hostname behind
// a Cloudflare Tunnel, a reverse proxy, whatever — that something else is
// almost always terminating TLS, and defaulting to plaintext HTTP there means
// silently sending the login password (and every bearer token afterward) in
// the clear. Only skip the upgrade for addresses that are recognizably
// LAN-local, where there's no TLS-terminating hop to lose.
const PRIVATE_HOST_PATTERNS: RegExp[] = [
    /^localhost$/i,
    /^127\./,
    /^10\./,
    /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./,
    /\.local$/i,
];

const looksLikeLanHost = (host: string): boolean => {
    const bareHost = host.split(':')[0]?.trim() ?? '';
    return bareHost.length > 0 && PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(bareHost));
};

export const addDefaultHttpScheme = (value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
        return '';
    }

    if (/^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)) {
        return trimmed;
    }

    const bare = trimmed.replace(/^\/+/, '');
    const scheme = looksLikeLanHost(bare) ? 'http' : 'https';
    return `${scheme}://${bare}`;
};

export const hasServerUrlTarget = (value: string) => {
    const normalized = addDefaultHttpScheme(value);
    return normalized.replace(/^[a-z][a-z\d+\-.]*:\/\//i, '').trim().length > 0;
};
