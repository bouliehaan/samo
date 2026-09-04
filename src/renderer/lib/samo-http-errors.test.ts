import { describe, expect, it } from 'vitest';

import {
    httpStatusFromError,
    isAuthFailure,
    SamoHttpError,
} from '/@/shared/api/samo/samo-http-errors';

describe('samo-http-errors', () => {
    describe('httpStatusFromError', () => {
        it('reads a structured status', () => {
            expect(httpStatusFromError(new SamoHttpError(401))).toBe(401);
        });

        it('parses the status out of a bare Error message', () => {
            // Exactly what `ipcRenderer.invoke` delivers once it has flattened a
            // main-process Error to its message string.
            const ipcError = new Error(
                "Error invoking remote method 'samo-get-user-info': Error: Failed to reach samo server (401)",
            );
            expect(httpStatusFromError(ipcError)).toBe(401);
        });

        it('returns undefined when there is no status to find', () => {
            expect(httpStatusFromError(new Error('network unreachable'))).toBeUndefined();
            expect(httpStatusFromError(undefined)).toBeUndefined();
            expect(httpStatusFromError(null)).toBeUndefined();
        });
    });

    describe('isAuthFailure', () => {
        it.each([401, 403])('treats a structured %i as a dead session', (status) => {
            expect(isAuthFailure(new SamoHttpError(status))).toBe(true);
        });

        it.each([401, 403])('treats an IPC-flattened %i as a dead session', (status) => {
            // The regression this whole module exists for: the old predicate only
            // matched the words "forbidden"/"unauthorized", so a real 401 arriving
            // through IPC never matched and saved-password re-auth never ran.
            const ipcError = new Error(
                `Error invoking remote method 'samo-get-user-info': Error: Failed to reach samo server (${status})`,
            );
            expect(isAuthFailure(ipcError)).toBe(true);
        });

        it('still matches the legacy wording', () => {
            expect(isAuthFailure(new Error('Unauthorized'))).toBe(true);
            expect(isAuthFailure(new Error('Forbidden'))).toBe(true);
        });

        it('does NOT treat an unreachable server as a dead session', () => {
            // Critical: misreading this as an auth failure would discard a
            // perfectly good session every time the server is briefly down.
            expect(isAuthFailure(new Error('fetch failed'))).toBe(false);
            expect(isAuthFailure(new SamoHttpError(500))).toBe(false);
            expect(isAuthFailure(new SamoHttpError(404))).toBe(false);
            expect(isAuthFailure(undefined)).toBe(false);
        });
    });

    describe('SamoHttpError', () => {
        it('carries the status where callers branch on it', () => {
            const error = new SamoHttpError(403);
            expect(error.response.status).toBe(403);
            expect(error).toBeInstanceOf(Error);
        });
    });
});
