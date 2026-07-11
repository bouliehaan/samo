import { describe, expect, it } from 'vitest';

import { addDefaultHttpScheme, hasServerUrlTarget } from './auth-url';

describe('addDefaultHttpScheme', () => {
    it('leaves an explicit scheme untouched', () => {
        expect(addDefaultHttpScheme('https://samo.example.com')).toBe(
            'https://samo.example.com',
        );
        expect(addDefaultHttpScheme('http://192.168.1.5:6969')).toBe('http://192.168.1.5:6969');
    });

    it('defaults a real hostname to https — Samo Server never terminates TLS itself, so anything reachable by hostname is behind something that does', () => {
        expect(addDefaultHttpScheme('samo.example.com')).toBe(
            'https://samo.example.com',
        );
        expect(addDefaultHttpScheme('samo.example.com:8443')).toBe(
            'https://samo.example.com:8443',
        );
    });

    it('defaults LAN-shaped addresses to http, since samo-server itself has no TLS listener', () => {
        expect(addDefaultHttpScheme('192.168.1.5:6969')).toBe('http://192.168.1.5:6969');
        expect(addDefaultHttpScheme('10.0.0.4:6969')).toBe('http://10.0.0.4:6969');
        expect(addDefaultHttpScheme('172.16.0.9:6969')).toBe('http://172.16.0.9:6969');
        expect(addDefaultHttpScheme('localhost:6969')).toBe('http://localhost:6969');
        expect(addDefaultHttpScheme('samo-box.local:6969')).toBe('http://samo-box.local:6969');
    });

    it('strips leading slashes before checking', () => {
        expect(addDefaultHttpScheme('//samo.example.com')).toBe(
            'https://samo.example.com',
        );
    });

    it('returns empty string for blank input', () => {
        expect(addDefaultHttpScheme('  ')).toBe('');
    });
});

describe('hasServerUrlTarget', () => {
    it('is false for a blank or scheme-only value', () => {
        expect(hasServerUrlTarget('')).toBe(false);
        expect(hasServerUrlTarget('https://')).toBe(false);
    });

    it('is true once a host is present', () => {
        expect(hasServerUrlTarget('samo.example.com')).toBe(true);
        expect(hasServerUrlTarget('192.168.1.5:6969')).toBe(true);
    });
});
