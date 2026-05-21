import path from 'node:path';
import { defineConfig } from 'vitest/config';

const coreSrc = path.resolve(__dirname, 'packages/core/src');

export default defineConfig({
    resolve: {
        alias: [
            { find: '/@/renderer', replacement: path.resolve(__dirname, 'src/renderer') },
            { find: '/@/shared', replacement: path.resolve(__dirname, 'src/shared') },
            { find: '/@/i18n', replacement: path.resolve(__dirname, 'src/i18n') },
            { find: '/@/remote', replacement: path.resolve(__dirname, 'src/remote') },
            {
                find: '@samo/core/server/auth',
                replacement: path.join(coreSrc, 'server/server-auth.ts'),
            },
            {
                find: /^@samo\/core\/(.+)$/,
                replacement: `${coreSrc}/$1/index.ts`,
            },
            { find: '@samo/core', replacement: path.join(coreSrc, 'index.ts') },
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
