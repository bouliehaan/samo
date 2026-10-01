import { getFetch, normalizeBaseUrl, requestJson, type SamoFetch } from './server-http';
import { samoAuthenticationFromLogin, type SamoLoginResponse } from './server-samo';
import { type ServerAuthenticationResult } from './server-auth';

/**
 * The device's half of samo device pairing: signing a TV in without a password
 * typed on a remote. The server's half, and the protocol itself (RFC 8628 cut
 * down to one server), is samo-server's internal/api/device_pairing.go.
 *
 * The TV asks for a code, shows it, and polls until someone signed in elsewhere
 * approves it at /pair. The device code is the TV's secret: it only ever rides
 * in a POST body, never a URL, and is never shown.
 */
export interface SamoDevicePairing {
    /** The polling secret. Never displayed, never put in a URL. */
    deviceCode: string;
    /** The short code a person reads off the screen, e.g. ABCD-EFGH. */
    userCode: string;
    /** The approval page, on the server this device chose. */
    verificationUrl: string;
    /**
     * The approval page with the code already filled in — what a QR code
     * carries. The code rides in the fragment, which a browser never sends, so
     * it stays out of server and proxy logs.
     */
    verificationUrlComplete: string;
    expiresAt: number;
    intervalMs: number;
}
export type SamoDevicePairingPoll =
    | { status: 'approved'; authentication: ServerAuthenticationResult }
    | { status: 'authorization_pending' | 'slow_down'; intervalMs: number }
    | { status: 'access_denied' }
    | { status: 'expired_token' };

/** The server answered, but not with anything this protocol allows. Retrying
 *  the same request cannot help, unlike a dropped connection. */
export class SamoDevicePairingProtocolError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SamoDevicePairingProtocolError';
    }
}

export async function startSamoDevicePairing(
    url: string,
    fetcher?: SamoFetch,
): Promise<SamoDevicePairing> {
    const baseUrl = normalizeBaseUrl(url);
    const body = await requestJson<{
        device_code: string;
        user_code: string;
        verification_uri: string;
        expires_in: number;
        interval: number;
    }>(getFetch(fetcher), `${baseUrl}/api/v1/auth/device/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        timeoutMs: 10_000,
    });
    if (
        !body?.device_code ||
        !body.user_code ||
        body.verification_uri !== '/pair' ||
        !Number.isFinite(body.expires_in) ||
        body.expires_in <= 0
    ) {
        throw new SamoDevicePairingProtocolError('The server returned an invalid pairing request.');
    }
    // Keep approval on the explicitly selected server, never a URL supplied by
    // another host. Only the display code belongs in a browser URL.
    const verificationUrl = `${baseUrl}/pair`;
    return {
        deviceCode: body.device_code,
        userCode: body.user_code,
        verificationUrl,
        verificationUrlComplete: `${verificationUrl}#code=${encodeURIComponent(body.user_code)}`,
        expiresAt: Date.now() + Math.min(body.expires_in, 1800) * 1000,
        intervalMs: pairingInterval(body.interval),
    };
}
const pairingInterval = (seconds: number | undefined) =>
    Number.isFinite(seconds) ? Math.max(5, Math.min(seconds as number, 60)) * 1000 : 5000;

export async function pollSamoDevicePairing(
    url: string,
    deviceCode: string,
    fetcher?: SamoFetch,
): Promise<SamoDevicePairingPoll> {
    const baseUrl = normalizeBaseUrl(url);
    // An approval is a login body plus the status every poll carries.
    const body = await requestJson<SamoLoginResponse & { status?: string; interval?: number }>(
        getFetch(fetcher),
        `${baseUrl}/api/v1/auth/device/poll`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_code: deviceCode }),
            timeoutMs: 10_000,
        },
    );
    switch (body?.status) {
        case 'access_denied':
        case 'expired_token':
            return { status: body.status };
        case 'approved': {
            // Nobody typed a username here, so the body has to name the account.
            if (!body.token || !body.user?.id || !body.user.username) {
                throw new SamoDevicePairingProtocolError(
                    'The server returned an incomplete pairing approval.',
                );
            }
            return {
                status: 'approved',
                authentication: samoAuthenticationFromLogin({
                    baseUrl,
                    credential: body.token,
                    login: body,
                }),
            };
        }
        case 'authorization_pending':
        case 'slow_down':
            return { status: body.status, intervalMs: pairingInterval(body.interval) };
        default:
            throw new SamoDevicePairingProtocolError(
                'The server returned an unknown pairing status.',
            );
    }
}
