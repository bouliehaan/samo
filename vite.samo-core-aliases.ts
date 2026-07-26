import type { Alias } from 'vite';

import { resolve } from 'path';

const coreSrc = resolve(__dirname, 'packages/core/src');

/**
 * Vite resolves `@samo/core` as a prefix, so `@samo/core/playback` breaks if
 * the bare alias points at a directory. List subpaths explicitly; keep the
 * package root alias last.
 */
export const samoCoreAliases: Alias[] = [
    {
        find: '@samo/core/server/auth',
        replacement: resolve(coreSrc, 'server/server-auth.ts'),
    },
    { find: '@samo/core/playback', replacement: resolve(coreSrc, 'playback/index.ts') },
    { find: '@samo/core/server', replacement: resolve(coreSrc, 'server/index.ts') },
    { find: '@samo/core/mobile', replacement: resolve(coreSrc, 'mobile/index.ts') },
    { find: '@samo/core/library', replacement: resolve(coreSrc, 'library/index.ts') },
    {
        find: '@samo/core/audio-quality',
        replacement: resolve(coreSrc, 'audio-quality/index.ts'),
    },
    { find: '@samo/core/navigation', replacement: resolve(coreSrc, 'navigation/index.ts') },
    { find: '@samo/core', replacement: resolve(coreSrc, 'index.ts') },
];
