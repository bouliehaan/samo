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
        include: ['packages/core/src/**/*.test.ts', 'src/renderer/**/*.test.ts'],
        server: {
            deps: {
                inline: ['@samo/core', /@samo\/core\/.*/],
            },
        },
    },
});
