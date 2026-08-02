import path from 'node:path';
import { defineConfig } from 'vitest/config';

import { samoCoreAliases } from './vite.samo-core-aliases';

export default defineConfig({
    resolve: {
        alias: [
            { find: '/@/renderer', replacement: path.resolve(__dirname, 'src/renderer') },
            { find: '/@/shared', replacement: path.resolve(__dirname, 'src/shared') },
            { find: '/@/i18n', replacement: path.resolve(__dirname, 'src/i18n') },
            { find: '/@/remote', replacement: path.resolve(__dirname, 'src/remote') },
            ...samoCoreAliases,
        ],
    },
    test: {
        environment: 'node',
        // `src/main`, `src/preload` and `src/shared` were absent from this glob,
        // so a test added there would silently never run. That is the process
        // side of the main-process crash-handler bug: the least-covered code in
        // the repo was also the code that could stop playback outright.
        include: [
            'packages/core/src/**/*.test.ts',
            'src/main/**/*.test.ts',
            'src/preload/**/*.test.ts',
            'src/renderer/**/*.test.ts',
            'src/shared/**/*.test.ts',
        ],
        server: {
            deps: {
                inline: ['@samo/core', /@samo\/core\/.*/],
            },
        },
    },
});
