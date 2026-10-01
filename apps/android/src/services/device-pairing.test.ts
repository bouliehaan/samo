import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    SamoDevicePairingProtocolError,
    SamoHttpError,
    type SamoDevicePairing,
} from '@samo/core/server';
import { testServerAuthentication } from '../../../../packages/core/src/test-fixtures';

const mocks = vi.hoisted(() => ({
    accept: vi.fn(),
    appState: { currentState: 'active' },
    poll: vi.fn(),
    setup: vi.fn(),
    start: vi.fn(),
}));
vi.mock('react-native', () => ({ AppState: mocks.appState }));
vi.mock('./server-session', () => ({ acceptServerAuthentication: mocks.accept }));
vi.mock('@samo/core/server', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@samo/core/server')>()),
    getSamoSetupStatus: mocks.setup,
    pollSamoDevicePairing: mocks.poll,
    startSamoDevicePairing: mocks.start,
}));

import { getDevicePairing } from '../state/device-pairing';
import { cancelDevicePairing, retryDevicePairing, startDevicePairing } from './device-pairing';

const SERVER = 'http://192.168.1.50:6969';
const auth = testServerAuthentication({ serverId: 'server', userId: 'listener' });
const challenge = (overrides: Partial<SamoDevicePairing> = {}): SamoDevicePairing => ({
    deviceCode: 'device-secret',
    userCode: 'ABCD-EFGH',
    verificationUrl: `${SERVER}/pair`,
    verificationUrlComplete: `${SERVER}/pair#code=ABCD-EFGH`,
    expiresAt: Date.now() + 600_000,
    intervalMs: 5_000,
    ...overrides,
});
const pending = { status: 'authorization_pending', intervalMs: 5_000 };

beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
    mocks.appState.currentState = 'active';
    mocks.accept.mockResolvedValue(undefined);
    mocks.start.mockImplementation(async () => challenge());
    cancelDevicePairing();
});
afterEach(() => {
    cancelDevicePairing();
    vi.useRealTimers();
});

describe('device pairing', () => {
    it('polls at the server pace and ends in the same session adoption a password login uses', async () => {
        mocks.poll
            .mockResolvedValueOnce(pending)
            .mockResolvedValueOnce(pending)
            .mockResolvedValueOnce({ status: 'approved', authentication: auth });
        await startDevicePairing(SERVER);
        const waiting = getDevicePairing();
        expect(waiting).toMatchObject({ status: 'waiting', unreachable: false });

        await vi.advanceTimersByTimeAsync(4_999);
        expect(mocks.poll).not.toHaveBeenCalled();
        await vi.advanceTimersByTimeAsync(1);
        expect(mocks.poll).toHaveBeenCalledWith(SERVER, 'device-secret', expect.any(Function));
        // A pending answer changes nothing on screen, so it notifies nobody.
        expect(getDevicePairing()).toBe(waiting);

        await vi.advanceTimersByTimeAsync(10_000);
        expect(mocks.accept).toHaveBeenCalledWith(auth);
        expect(getDevicePairing()).toEqual({ status: 'idle' });
        expect(mocks.poll).toHaveBeenCalledTimes(3);
    });

    it('keeps the code on screen and backs off while polls cannot land, then resumes the pace', async () => {
        // The first failure is expo/fetch's (Android's global fetch), which is
        // a plain Error rather than the TypeError other fetches throw.
        mocks.poll
            .mockRejectedValueOnce(
                new Error(
                    'fetch failed: java.net.ConnectException: Failed to connect to /10.0.2.2:6970',
                ),
            )
            .mockRejectedValueOnce(new SamoHttpError(502, 'Request failed (502)'))
            .mockResolvedValue(pending);
        await startDevicePairing(SERVER);

        await vi.advanceTimersByTimeAsync(5_000);
        expect(getDevicePairing()).toMatchObject({ status: 'waiting', unreachable: true });
        await vi.advanceTimersByTimeAsync(9_999);
        expect(mocks.poll).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);
        expect(mocks.poll).toHaveBeenCalledTimes(2);

        await vi.advanceTimersByTimeAsync(20_000);
        expect(mocks.poll).toHaveBeenCalledTimes(3);
        expect(getDevicePairing()).toMatchObject({ status: 'waiting', unreachable: false });
        await vi.advanceTimersByTimeAsync(5_000);
        expect(mocks.poll).toHaveBeenCalledTimes(4);
    });

    it.each([
        ['declined', { status: 'access_denied' }],
        ['expired', { status: 'expired_token' }],
    ])('ends as %s when the server says so', async (reason, answer) => {
        mocks.poll.mockResolvedValueOnce(answer);
        await startDevicePairing(SERVER);
        await vi.advanceTimersByTimeAsync(5_000);
        expect(getDevicePairing()).toEqual({ status: 'failed', serverUrl: SERVER, reason });
        await vi.advanceTimersByTimeAsync(60_000);
        expect(mocks.poll).toHaveBeenCalledTimes(1);
    });

    it.each([
        ['a malformed answer', new SamoDevicePairingProtocolError('unknown pairing status')],
        ['a refusal', new SamoHttpError(400, 'Request failed (400)')],
    ])('does not retry %s, which cannot succeed', async (_, error) => {
        mocks.poll.mockRejectedValueOnce(error);
        await startDevicePairing(SERVER);
        await vi.advanceTimersByTimeAsync(5_000);
        expect(getDevicePairing()).toMatchObject({ status: 'failed', reason: 'failed' });
    });

    it('expires locally rather than polling for a code past its lifetime', async () => {
        mocks.start.mockImplementation(async () => challenge({ expiresAt: Date.now() + 3_000 }));
        await startDevicePairing(SERVER);
        await vi.advanceTimersByTimeAsync(5_000);
        expect(getDevicePairing()).toMatchObject({ status: 'failed', reason: 'expired' });
        expect(mocks.poll).not.toHaveBeenCalled();
    });

    it('holds polling while the app is in the background', async () => {
        mocks.poll.mockResolvedValue(pending);
        mocks.appState.currentState = 'background';
        await startDevicePairing(SERVER);
        await vi.advanceTimersByTimeAsync(30_000);
        expect(mocks.poll).not.toHaveBeenCalled();
        mocks.appState.currentState = 'active';
        await vi.advanceTimersByTimeAsync(5_000);
        expect(mocks.poll).toHaveBeenCalledTimes(1);
    });

    it('reports a session that could not be saved instead of swallowing it', async () => {
        mocks.poll.mockResolvedValueOnce({ status: 'approved', authentication: auth });
        mocks.accept.mockRejectedValueOnce(new Error('secure store unavailable'));
        await startDevicePairing(SERVER);
        await vi.advanceTimersByTimeAsync(5_000);
        expect(getDevicePairing()).toMatchObject({ status: 'failed', reason: 'failed' });
    });

    it.each([
        ['unsupported', new SamoHttpError(405, 'Request failed (405)'), undefined],
        ['unsupported', new SamoHttpError(404, 'Request failed (404)'), undefined],
        ['busy', new SamoHttpError(429, 'Request failed (429)'), undefined],
        ['not-set-up', new SamoHttpError(503, 'Request failed (503)'), { needsSetup: true }],
        ['unreachable', new SamoHttpError(503, 'Request failed (503)'), { needsSetup: false }],
        ['unreachable', new TypeError('Network request failed'), undefined],
        [
            'unreachable',
            new Error('fetch failed: java.net.UnknownHostException: samo.lan'),
            undefined,
        ],
        ['failed', new SamoDevicePairingProtocolError('invalid pairing request'), undefined],
    ])('names a failed start %s', async (reason, error, setup) => {
        mocks.start.mockRejectedValueOnce(error);
        if (setup) mocks.setup.mockResolvedValueOnce(setup);
        else mocks.setup.mockRejectedValueOnce(new TypeError('Network request failed'));
        await startDevicePairing(SERVER);
        expect(getDevicePairing()).toEqual({ status: 'failed', serverUrl: SERVER, reason });
    });

    it('ignores a code that arrives after cancel, and cancel stops the loop', async () => {
        let resolveStart: (value: SamoDevicePairing) => void = () => undefined;
        mocks.start.mockImplementationOnce(
            () => new Promise<SamoDevicePairing>((resolve) => (resolveStart = resolve)),
        );
        const starting = startDevicePairing(SERVER);
        expect(getDevicePairing()).toEqual({ status: 'requesting', serverUrl: SERVER });
        cancelDevicePairing();
        resolveStart(challenge());
        await starting;
        expect(getDevicePairing()).toEqual({ status: 'idle' });

        mocks.poll.mockResolvedValue(pending);
        await startDevicePairing(SERVER);
        cancelDevicePairing();
        await vi.advanceTimersByTimeAsync(60_000);
        expect(mocks.poll).not.toHaveBeenCalled();
        expect(getDevicePairing()).toEqual({ status: 'idle' });
    });

    it('asks the same server for a new code on retry', async () => {
        mocks.poll.mockResolvedValueOnce({ status: 'expired_token' });
        await startDevicePairing(SERVER);
        await vi.advanceTimersByTimeAsync(5_000);
        retryDevicePairing();
        await vi.advanceTimersByTimeAsync(0);
        expect(mocks.start).toHaveBeenCalledTimes(2);
        expect(mocks.start).toHaveBeenLastCalledWith(SERVER, expect.any(Function));
        expect(getDevicePairing()).toMatchObject({ status: 'waiting', unreachable: false });
    });
});
